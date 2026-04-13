---
title: vLLM 与 SGLang 学习路线
date: '2026-04-13 00:00:00'
tags:
  - AIInfra
  - vLLM
  - SGLang
published: true
categories:
  - AI Infra
_sync_managed: repo-a
_sync_source_path: 02AI infra/vLLM 与 SGLang 学习路线.md
---
> [!summary]
> - 推荐顺序：先学 `vLLM`，再学 `SGLang`。
> - `Mac` 适合做学习、开发和 toy experiment；真实性能实验放到远程 `Linux GPU`。
> - 如果目标是 AI infra 岗位，重点不是“会用框架”，而是“能 benchmark、能 profile、能读核心代码、能做小改动”。

可以这样理解：

- `vLLM` 帮你建立“现代 LLM serving engine”的标准心智模型。
- `SGLang` 让你看到“推理引擎 + 可编程前端 + 更复杂调度 / 缓存复用”的另一种范式。

## 为什么推荐先学 vLLM，再学 SGLang

- `vLLM` 已经是更普遍的行业基线，生态更广，官方文档和外部资料也更完整。
- `SGLang` 更适合在你已经理解 serving 基础后，用来扩展对结构化生成、程序式推理和缓存复用的认识。
- 如果你的目标是进入 AI infra，先建立标准 serving 认知，再理解不同系统的设计分歧，学习路径会更稳。

### 为什么不建议“全本地”

官方支持边界其实很明确：

- `vLLM` 在 macOS Apple Silicon 上属于 experimental，官方文档注明目前需要源码构建；CPU 实现只支持 `FP32/FP16`。
- 官方文档也提到 Apple Silicon 如果想做 Metal 加速，可以看 `vllm-metal`，但这是 community-maintained。
- `SGLang` 官方安装页主要围绕 NVIDIA GPU 平台，没有把 macOS Apple Silicon 当作一等公民。
- `Mini-SGLang` 更直接：文档明确写的是 Linux only，不支持 Windows 和 macOS。

### 阶段 A：Mac 本地建立心智模型

**目标**：理解 serving，不追求真实性能。

建议做这些：

- 用 `uv` 管理 Python 环境。
- 装好 Xcode Command Line Tools。
- Apple Silicon 本地尝试：
  - `vLLM CPU from source`
  - 或 `vllm-metal`
- 再配合 `MLX / mlx-lm` 或 `llama.cpp` 跑小模型，帮助你理解 token 生成、KV cache、量化、上下文长度这些基本概念。

这一阶段适合跑：

- `0.5B ~ 3B` 量级的小模型
- OpenAI-compatible server
- 小规模 benchmark
- 代码阅读和 toy experiment

这一阶段不适合：

- 真正比较 `vLLM vs SGLang` 的性能
- 学习 CUDA 热路径
- 学分布式推理的真实性能特征

### 阶段 B：Mac + 远程 Linux GPU

**目标**：把 learning 变成 infra 能力。

做法：

- Mac 当开发机
- 远程租 / 借一台 Linux GPU 机器，哪怕先从单卡开始
- 用 `SSH + tmux` 远程开发
- 真正跑：
  - `vLLM`
  - `SGLang`
  - profiling
  - benchmark
  - 多卡 / 多机实验

这是更理想的路线，因为你在 Mac 上获得舒适开发体验，在 Linux GPU 上获得真实系统行为。

## 我建议的学习顺序

### 第 0 阶段：补底子（1-2 周）

先确保这些不是短板：

- Python 熟练
- C++ 至少能读能改
- PyTorch 基础
- Transformer 推理流程
- Linux、进程、线程、内存、网络
- Docker
- 基本 SQL / 缓存 / 消息队列认知

如果这些不稳，直接上 `vLLM / SGLang` 会很痛苦。

### 第 1 阶段：先学“推理系统”而不是框架（2 周）

**重点概念**：

- autoregressive decoding
- prefill vs decode
- KV cache
- prefix caching
- continuous batching
- chunked prefill
- quantization
- TTFT / TPS / latency / P99

**建议同时看**：

- `vLLM` 的架构和 V1 blog
- `SGLang` docs 概览
- `Mini-SGLang / nano-vllm`

**输出物**：

- 自己写一篇笔记，把这些概念讲明白
- 最好画一张 request lifecycle 图

### 第 2 阶段：先在 Mac 上把 vLLM 跑起来（1-2 周）

**目标**：不是压性能，而是把链路跑通。

要做的事：

- build `vLLM CPU` 或试 `vllm-metal`
- 启一个 OpenAI-compatible server
- 用 Python client / `curl` 调它
- 记录不同 `max model len / batch / concurrency` 的表现

要掌握：

- server 参数
- 常见 OOM / model loading 问题
- metrics 的基本观察方式

输出物：

- 一个可复现的本地 demo
- 一篇简短 benchmark note

### 第 3 阶段：开始读“精简实现”（2 周）

这一步非常关键。

**阅读顺序**：

1. `nano-vllm`
2. `Mini-SGLang`

**目标不是逐行读完，而是回答这些问题**：

- 请求是怎么排队的
- cache 是怎么管理的
- 为什么 prefix reuse 能省内存 / 省算力
- scheduler 为什么容易成为瓶颈
- CPU overhead 为什么会拖垮 GPU 利用率

**输出物**：

- 一份你自己的 code map
- 至少改一个小点，比如日志、统计、简单策略

### 第 4 阶段：上远程 Linux GPU，先学 vLLM（2-3 周）

这是你真正开始接近岗位要求的时候。

你要做：

- 跑 `vLLM` 服务
- 跑不同模型和不同并发
- 测 `TTFT / throughput / P99`
- 用 profiler 看热路径
- 学单卡、多卡、`TP / PP`

这一阶段要开始把“应用层感受”变成“系统层分析”。

**输出物**：

- 一份 benchmark 报告
- 至少一个性能结论，例如：
  - batch 变化如何影响吞吐
  - 长 prompt 如何影响 TTFT
  - prefix cache 命中时收益多大

### 第 5 阶段：再学 SGLang（2-3 周）

重点不是“它比 `vLLM` 快多少”，而是：

- 它为什么要有前端语言 / DSL
- `RadixAttention` 和 prefix reuse 的思路
- 结构化生成、复杂程序式推理场景有什么差异
- 服务层、调度层、缓存层和 `vLLM` 有哪些不同

**输出物**：

- 一份 `vLLM vs SGLang` 对比
- 对比维度至少包括：
  - 易用性
  - 代码可读性
  - 结构化生成
  - serving 特性
  - benchmark 方法

### 第 6 阶段：补底层优化（长期）

这部分才是真正的 infra 壁垒：

- CUDA 基础
- Triton
- CUTLASS
- FlashAttention / FlashInfer
- NCCL / 通信
- 多机多卡
- profiling with Nsight
- kernel-level bottleneck analysis

这一层不需要一口吃成胖子，但至少要把 `CUDA + Triton + profiling` 拉起来。

## 什么样的作品对找工作最有用

如果你想把这条路线变成求职资产，最有价值的不是“我学过”，而是下面这些可展示的成果：

- 一个 `vLLM vs SGLang` 的 benchmark repo
- 一份详细 profiling 报告
- 一个你改过的小功能 / 小优化 PR
- 一篇系统性技术博客
- 一个把 serving、监控、压测、回归测试串起来的小平台

对招聘方来说，这比“看完几篇文章”有说服力得多。

## 最现实的建议

如果你现在是从应用 / 后端转 infra，不要把目标定成“先把 CUDA 学满再碰框架”。更推荐的顺序是：

1. 先把 serving 心智模型建立起来
2. 用 `vLLM` 建立行业基线
3. 用 `SGLang` 扩展到更复杂的 serving 思维
4. 再往 `CUDA / Triton` 深挖

如果一开始就陷进 kernel 细节，很容易学了几个月，却还是回答不清“一个请求在推理引擎里到底经历了什么”。

## 一句话结论

这条学习方向是对的，而且在中国市场有真实岗位需求；但如果目标是进入 AI infra，就不要把目标设成“会用 `vLLM` 和 `SGLang`”，而要设成：

**能用它们、能 benchmark、能 profile、能读核心代码、能做小改动，并且懂系统与性能。**

## Sources

- [vLLM docs](https://docs.vllm.ai/)
- [vLLM macOS CPU install](https://docs.vllm.ai/en/stable/getting_started/installation/cpu/)
- [vLLM V1 blog](https://vllm.ai/blog/v1-alpha-release)
- [vLLM distributed inference blog](https://vllm.ai/blog/distributed-inference)
- [vLLM V1 architecture issue](https://github.com/vllm-project/vllm/issues/8779)
- [vLLM GitHub](https://github.com/vllm-project/vllm)
- [vllm-metal](https://github.com/vllm-project/vllm-metal)
- [SGLang docs](https://docs.sglang.io/)
- [SGLang install](https://docs.sglang.io/get_started/install.html)
- [SGLang contribution guide](https://docs.sglang.io/developer_guide/contribution_guide.html)
- [SGLang learning materials](https://github.com/sgl-project/sgl-learning-materials)
- [SGLang GitHub](https://github.com/sgl-project/sglang)
- [Mini-SGLang blog](https://www.lmsys.org/blog/2025-12-17-minisgl/)
- [Mini-SGLang docs](https://www.mintlify.com/sgl-project/mini-sglang/introduction)
- [Nano-vLLM](https://github.com/GeeeekExplorer/nano-vllm)
- [Reddit: Mini-SGLang learning thread](https://www.reddit.com/r/LocalLLaMA/comments/1pp43wr/we_distilled_sglang_to_help_you_learn_how_modern/)
- [Reddit: SGLang vs vLLM discussion](https://www.reddit.com/r/LocalLLaMA/comments/1k2zn6o/sglang_vs_vllm/)
