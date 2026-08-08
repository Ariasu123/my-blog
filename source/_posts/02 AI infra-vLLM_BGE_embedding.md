---
date: '2026-07-31 00:00:00'
tags:
  - 工程经验
  - vLLM
published: true
categories:
  - AI Infra
index_img: /assets/covers/vLLM_Embed.png
title: 从 Ollama 迁移到 vLLM：Embedding 部署与压测
_sync_managed: repo-a
_sync_source_path: 02 AI infra/vLLM_BGE_embedding.md
---
## 为什么迁移

这套 embedding 服务用于企业知识库的文档入库和检索。最初我用 Ollama 运行 BGE-M3：部署很快，但持续入库时并发稍高就会出现请求失败或服务无响应。

迁移到 vLLM 的核心动机是提效：同机实测 vLLM 的 embedding 吞吐约为 Ollama 的 2~2.5 倍（见后文「端到端入库实测」），且不再需要人为休眠。具体希望解决三个问题：

1. 长时间运行稳定、不依赖人为休眠，高并发下有余量；
2. 能用统一口径评估 QPS、吞吐和延迟分位数。

本文记录 vLLM 0.26.0 的部署过程、两个实测踩坑，以及 RTX 4090 上的 512 token 压测结果。

## 部署环境

| 项目 | 配置 |
| --- | --- |
| 操作系统 | Ubuntu 22.04 |
| GPU | NVIDIA RTX 4090 24GB |
| Python | 3.10.12 |
| 包管理 | uv 0.11.21 |
| vLLM | 0.26.0 |
| 模型 | BAAI/bge-m3，通过 ModelScope 下载 |

由于这台机器访问 Hugging Face 不稳定，模型先下载到本地，启动时直接使用本地路径。模型与运行目录分开管理：模型是体积大、更新频率低的只读资产，日志、虚拟环境和脚本则需要经常清理或重建。这样也能降低误删权重的风险。

```bash
mkdir -p ~/models/bge-m3 ~/deploy/bge-m3/{venv,logs,scripts}

uv venv ~/deploy/bge-m3/venv --python 3.10
source ~/deploy/bge-m3/venv/bin/activate
uv pip install vllm

modelscope download --model BAAI/bge-m3 --local_dir ~/models/bge-m3
```

我使用 uv 创建独立环境，避免 vLLM 较长的依赖链影响机器上的其他 Python 服务。启动命令如下：

```bash
vllm serve ~/models/bge-m3 \
  --runner pooling \
  --convert embed \
  --host 0.0.0.0 \
  --port 8001 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.2 \
  --served-model-name bge-m3
```

`--max-model-len 8192` 保留了处理长文本的余量；当前业务 chunk 虽然只有 512 token，但以后调整切分策略时不必立即改服务配置。`--gpu-memory-utilization 0.2` 用于限制 vLLM 的显存预算，因为这张 GPU 还要与其他服务共用。

## 两个启动坑

### 1. `--task embed` 无法使用

不少旧教程使用以下参数：

```bash
vllm serve ... --task embed
```

但在我使用的 vLLM 0.26.0 环境中，这条命令会报 `unrecognized arguments`。本次验证可用的写法是：

```bash
--runner pooling --convert embed
```

### 2. `hf-overrides` 让 embeddings 接口返回 501

搜索 BGE-M3 与 vLLM 的部署资料时，我还尝试过：

```bash
--hf-overrides '{"architectures":["BgeM3EmbeddingModel"]}'
```

服务可以启动，日志中也没有明显报错，但请求 `/v1/embeddings` 会返回 `501 Not Implemented`。移除该参数、仅保留 `--runner pooling --convert embed` 后，接口恢复正常。

这里记录的是本次 vLLM 0.26.0 环境中的实测现象，不延伸推断其内部原因。更重要的经验是：HTTP 服务开始监听端口，只能证明进程已启动，不能证明 embeddings 端点可用。

## 冒烟测试与后台运行

先检查服务端注册的模型名：

```bash
curl -s http://127.0.0.1:8001/v1/models
```

返回结果中应包含 `bge-m3`。不过 `/v1/models` 只是元信息接口，不能替代实际推理测试，还需要调用 `/v1/embeddings`：

```bash
curl -s http://127.0.0.1:8001/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"bge-m3","input":["今天天气不错","BGE-M3 embedding 冒烟测试"]}'
```

本次返回两条 1024 维向量。上线前要确认模型名和向量维度都与客户端、向量库配置一致。

验证通过后，可以暂时用 `nohup` 放到后台：

```bash
cd ~/deploy/bge-m3
nohup vllm serve ~/models/bge-m3 \
  --runner pooling --convert embed \
  --host 0.0.0.0 --port 8001 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.2 \
  --served-model-name bge-m3 \
  > logs/bge-m3-vllm.log 2>&1 &

echo $! > logs/bge-m3-vllm.pid
```

vLLM 0.26.0 默认采用多进程架构：pid 文件记录的是 APIServer 主进程，`nvidia-smi` 中占用显存的通常是 `VLLM::EngineCore`，两者 PID 不同属于正常现象。正式生产环境更建议使用 systemd 管理进程、重启策略和日志，不要依赖手工维护 PID。

本次 `nvidia-smi` 观察到 EngineCore 约占 1.86 GiB。该数值包括模型权重及运行时缓冲等开销；embedding 模型没有自回归解码阶段持续增长的 KV cache，实际占用低于显存预算并不异常。`gpu-memory-utilization=0.2` 是预算参数，也不意味着服务一定会占满约 4.8 GiB。

## 压测方法

压测脚本使用异步 Python 客户端，请求 OpenAI 兼容的 `/v1/embeddings` 接口。统计指标包括 QPS、texts/s、tokens/s、平均延迟、P95、P99、最大延迟和错误率。

本次口径如下：

- 正式统计前进行 warmup，预热请求不计入结果；
- 延迟为完整 HTTP 往返延迟，不是纯 GPU 推理耗时；
- 输入按约 512 token 构造，贴近实际 chunk 长度；
- 压测时 GPU 由该服务独占，所有请求由一个异步客户端进程发出；

## 512 Token 压测结果

三组测试均在 RTX 4090 上完成，错误率为 0%。生产环境若与其他服务共享 GPU，仍需在同机条件下复测。

### batch_size 阶梯（并发 = 8）

| batch_size | QPS | texts/s | tokens/s | avg | P95 | P99 | max | 错误率 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 317.60 | 317.60 | 163,502.44 | 24.50 ms | 33.77 ms | 43.65 ms | 51.92 ms | 0.0% |
| 2 | 165.76 | 331.52 | 170,949.34 | 46.86 ms | 65.60 ms | 85.49 ms | 94.07 ms | 0.0% |
| 4 | 89.83 | 359.30 | 184,673.58 | 86.79 ms | 119.40 ms | 127.65 ms | 160.87 ms | 0.0% |
| 8 | 44.41 | 355.26 | 183,130.79 | 175.25 ms | 212.41 ms | 218.56 ms | 238.86 ms | 0.0% |
| 16 | 22.78 | 364.50 | 187,612.64 | 341.92 ms | 381.83 ms | 389.11 ms | 435.96 ms | 0.0% |
| 32 | 10.99 | 351.83 | 181,239.49 | 710.74 ms | 758.73 ms | 773.68 ms | 790.17 ms | 0.0% |
| 64 | 5.36 | 343.15 | 176,724.75 | 1,461.68 ms | 1,528.78 ms | 1,554.13 ms | 1,576.10 ms | 0.0% |

### 并发阶梯（batch_size = 16）

| 并发 | QPS | texts/s | tokens/s | avg | P95 | P99 | max | 错误率 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 12.60 | 201.59 | 103,762.47 | 70.04 ms | 79.96 ms | 84.85 ms | 94.51 ms | 0.0% |
| 2 | 19.42 | 310.71 | 159,941.40 | 94.42 ms | 145.91 ms | 154.53 ms | 158.14 ms | 0.0% |
| 4 | 22.40 | 358.42 | 184,588.02 | 170.45 ms | 212.30 ms | 217.68 ms | 231.32 ms | 0.0% |
| 8 | 22.29 | 356.67 | 183,630.46 | 349.36 ms | 387.67 ms | 393.97 ms | 405.90 ms | 0.0% |
| 16 | 22.35 | 357.63 | 184,066.54 | 702.27 ms | 738.40 ms | 749.56 ms | 758.24 ms | 0.0% |
| 32 | 22.44 | 358.96 | 184,945.87 | 1,395.34 ms | 1,482.10 ms | 1,520.84 ms | 1,543.33 ms | 0.0% |

### 单请求饱和度（并发 = 1）

| batch_size | QPS | texts/s | tokens/s | avg | P95 | P99 | max | 错误率 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 135.25 | 135.25 | 69,652.72 | 6.81 ms | 11.24 ms | 13.97 ms | 15.03 ms | 0.0% |
| 2 | 77.86 | 155.71 | 80,174.20 | 11.77 ms | 14.33 ms | 16.36 ms | 17.49 ms | 0.0% |
| 4 | 47.89 | 191.55 | 98,488.51 | 18.67 ms | 22.11 ms | 26.00 ms | 28.52 ms | 0.0% |
| 8 | 24.00 | 192.03 | 99,041.40 | 35.91 ms | 49.54 ms | 55.64 ms | 60.85 ms | 0.0% |
| 16 | 12.79 | 204.59 | 105,275.20 | 69.23 ms | 79.57 ms | 84.45 ms | 87.51 ms | 0.0% |
| 32 | 7.25 | 231.85 | 119,466.62 | 124.51 ms | 137.39 ms | 141.99 ms | 147.47 ms | 0.0% |



一个请求可以包含多条文本，因此 `texts/s = QPS × batch_size`。随着 batch 增大，单个请求变重，QPS 下降并不等于服务吞吐下降；评估 embedding 容量时，更应关注 texts/s 和 tokens/s。

三组结果显示，当前服务在 512 token 场景下的吞吐上限约为 **350～365 texts/s**，即 **180k～188k tokens/s**：

- batch 从 1 增至 16 时，固定开销被摊薄，吞吐从 317.60 提升到 364.50 texts/s；继续增至 32 或 64，吞吐反而略降，P99 升至 774 ms 和 1.55 s。
- batch 固定为 16 时，并发从 1 增至 4，吞吐从 201.59 提升到 358.42 texts/s；并发继续增加，吞吐基本不变，排队延迟持续上升。
- 单并发即使把 batch 提到 32，也只有 231.85 texts/s，说明原来的单并发客户端无法喂满服务。

因此，本次数据支持的生产起始配置是：

```text
chunk_token_size=512
embedding_batch_size=16
embedding_concurrency=4
sleep_interval=0
```

该组合实测吞吐为 358.42 texts/s，P99 为 217.68 ms，错误率为 0%。`batch_size=8` 可以作为更保守的候选值，但本次没有测试 batch 8、并发 4 的组合，使用前应补测。

## 端到端入库实测

上面的压测只覆盖了 embedding 服务本身。迁移生效后，我又用真实入库流程做了一次同机 A/B：同一篇新文档（13.5KB，11 chunks，无 LLM 缓存）、同一份向量库副本（3093 chunks 起步）、同一套客户端参数（embedding batch 16 / 并发 4，DeepSeek 抽取并发 4），分别用 Ollama 和 vLLM 跑一遍完整增量入库（chunking → DeepSeek 实体抽取 → embedding → 图谱/向量写库），两后端在同一台 GPU 机器上串行运行，避免互抢。

| 后端 | 端到端总耗时 | 产出向量 |
| --- | ---: | --- |
| Ollama | 64.6s | 242 条（129 实体 + 102 关系 + 11 chunks） |
| vLLM | **53.4s** | 189 条（103 实体 + 75 关系 + 11 chunks） |

vLLM 端到端快 11.2s，约 **17%**。两侧实体/关系数不同是 DeepSeek 抽取的随机性所致（同一文档两次抽取结果不完全一致），属于正常噪声，这也让 E2E 差值带有 ±几秒的不确定性。

同口径的纯 embedding 微基准（300 token × 64 条，batch 16 / 并发 4，共享 GPU）：

| 后端 | 吞吐 |
| --- | ---: |
| Ollama | ~100 条/s |
| vLLM | **~200~250 条/s（约 2~2.5 倍）** |

注意这组数字与上文 512 token 独占压测的 350~365 texts/s 口径不同：文本更短，且 GPU 与其他服务共享。

这组数据值得细读的三点：

1. **E2E 差距（17%）远小于 embedding 差距（2.5×）**：增量入库的耗时大头是 DeepSeek 实体抽取，embedding 只占全程的 10~20%。两边抽取成本相同，摊薄了 embedding 的差距。
2. **批量越大，vLLM 优势越明显**：本次仅 200 余条向量，embedding 绝对耗时只有几秒级。全量重建或大批量入库时向量数以十万计，embedding 占比显著上升，差距会趋近微基准的 2~2.5 倍。
3. **并发余量比速度差距更实质**：Ollama 对 embedding 请求无跨请求 batching，突发并发下容易排队 → 客户端超时 → 重试雪崩；vLLM 的 continuous batching 原生抗并发。本次并发 4 两边都没出问题，但生产侧突发流量时只有 vLLM 有余量。

迁移生效后，客户端的 embedding batch 与并发已参数化（`embedding_batch_num` / `embedding_func_max_async`，默认 16/4，与上文推荐配置一致），可按场景在配置中调整。

## 上线建议

1. **先测真实 embeddings 接口。** `/v1/models` 只能确认模型名，必须再用真实业务文本调用 `/v1/embeddings`，检查响应、维度和错误码。
2. **验证向量兼容性。** 如果 Ollama 与 vLLM 使用同一模型权重，先抽样比较两端输出的维度、归一化方式和数值一致性；存在差异时再整体重建向量索引，避免在同一索引中混用不同分布的向量。本次迁移已完成验证：两端输出抽样余弦相似度 ≥0.998、self-recall 100%，存量 3093 chunks 的向量全部复用，未重建索引。
3. **用 systemd 管理服务。** 配置启动、停止、自动重启和日志轮转，并同时观察 APIServer、EngineCore 与 GPU 状态。
4. **在生产共存环境复测。** 本文数据来自独占 GPU、单压测客户端场景，不能直接代表多客户端或多服务争抢时的表现。
5. **补做端到端压测。** 用一批真实文档走完整流程，分别记录 embedding、LLM、数据库与总耗时，再评估迁移对业务的最终收益。本次已用单文档增量入库完成首轮（见「端到端入库实测」）；多文档、大批量场景仍可按同法再测。

