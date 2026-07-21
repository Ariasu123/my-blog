---
date: '2026-07-21 00:00:00'
tags:
  - LLM
  - SFT
  - Pretrain
published: true
title: 训练超参数调优指南
categories:
  - LLM
index_img: /assets/covers/train.png
_sync_managed: repo-a
_sync_source_path: 01 llm/训练超参数调优指南.md
---
> 本文档系统梳理 Transformer 模型训练中的核心超参数，包括其作用、影响机制及效果不佳时的调参策略。

## 目录

- [一、各参数的作用与影响](#一各参数的作用与影响)
  - [1. Epochs（训练轮数）](#1-epochs训练轮数)
  - [2. Batch Size（批次大小）](#2-batch-size批次大小)
  - [3. Learning Rate（学习率）](#3-learning-rate学习率)
  - [4. Hidden State / Hidden Size（隐藏层维度）](#4-hidden-state--hidden-size隐藏层维度)
  - [5. Max Seq Len（最大序列长度）](#5-max-seq-len最大序列长度)
  - [6. Accumulation Steps（梯度累积步数）](#6-accumulation-steps梯度累积步数)
  - [7. Dtype（数据精度）](#7-dtype数据精度)
  - [8. Warmup（预热步数）](#8-warmup预热步数)
- [二、效果不好的诊断与调参流程](#二效果不好的诊断与调参流程)
- [三、推荐的调参优先级](#三推荐的调参优先级)
- [四、模型参数量计算](#四模型参数量计算)
  - [1. 核心公式](#1-核心公式)
  - [2. 快速估算](#2-快速估算)
  - [3. 实例验证](#3-实例验证)
  - [4. 显存占用估算](#4-显存占用估算)
- [五、实用技巧汇总](#五实用技巧汇总)

---

## 一、各参数的作用与影响

### 1. Epochs（训练轮数）

- **作用**：整个数据集被遍历的次数
- **影响**：
  - **太少** → 欠拟合，模型没学完数据规律
  - **太多** → 过拟合，记住训练集但泛化差
- **调参策略**：观察验证集 loss 曲线，在过拟合拐点前停止（Early Stopping）

---

### 2. Batch Size（批次大小）

- **作用**：每次参数更新前处理的样本数
- **影响**：
  - **小 batch（如 1-8）**：梯度噪声大，有助于逃离局部最优，但训练不稳定、收敛慢
  - **大 batch（如 64-512）**：梯度稳定，训练快，但容易陷入尖锐极小值，泛化可能变差
  - **显存占用**：直接线性相关，batch size 翻倍，显存大致翻倍
- **调参策略**：
  - 在显存允许范围内尽量大，配合 `accumulation_steps` 等效扩大 batch
  - 经典论文建议：batch size × lr 保持近似恒定（Linear Scaling Rule）

---

### 3. Learning Rate（学习率）

- **作用**：参数更新的步长
- **影响**：
  - **太大**：loss 震荡不下降，甚至发散（NaN）
  - **太小**：收敛极慢，可能陷入局部最优
  - **适中**：loss 平滑下降
- **调参策略**：
  - 先用 LR Finder 找大致范围
  - 配合 Warmup 避免初期震荡
  - **效果不好时，先调 lr**，这是影响最大的参数

---

### 4. Hidden State / Hidden Size（隐藏层维度）

- **作用**：模型内部表示的维度，决定模型容量
- **影响**：
  - 越大 → 模型表达能力越强，但参数量、显存、计算量平方级增长
  - 越小 → 模型简单，可能欠拟合
- **调参策略**：效果差且显存足够时适度增大；过拟合时减小或加正则化

---

### 5. Max Seq Len（最大序列长度）

- **作用**：模型能处理的最长 token 数
- **影响**：
  - 决定显存占用（Attention 的 QK^T 矩阵是 O(n²) 复杂度）
  - 太短 → 截断重要信息，长程依赖丢失
  - 太长 → 显存爆炸，训练速度极慢
- **调参策略**：
  - 根据数据分布设定（如 90% 样本长度覆盖）
  - 显存不够时，用 **Gradient Checkpointing** 换显存

---

### 6. Accumulation Steps（梯度累积步数）

- **作用**：每 N 个 batch 才更新一次参数，**等效扩大 batch size**
- **公式**：`effective_batch = batch_size × accumulation_steps × num_gpus`
- **影响**：
  - 不增加显存占用，但获得大 batch 的稳定梯度
  - 训练时间变长（因为前向传播次数不变）
- **调参策略**：显存不够但想要大 batch 时用这个；通常设为 2, 4, 8 等

---

### 7. Dtype（数据精度）

- **常见选项**：`fp32`（32位）、`bf16`、`fp16`（16位混合精度）
- **影响对比**：

| 精度 | 显存占用 | 速度 | 稳定性 | 适用场景 |
|------|---------|------|--------|----------|
| fp32 | 大 | 慢 | 最稳 | 调试、小模型 |
| bf16 | 减半 | 快 | 较好 | **推荐**，A100/3090+ |
| fp16 | 减半 | 快 | 易溢出 | 需 Loss Scaling |

- **调参策略**：硬件支持 bf16 时优先用 bf16；loss 出现 NaN 时切 fp32 排查

---

### 8. Warmup（预热步数）

- **作用**：训练初期从 0 线性/指数增加到设定 lr，避免初期大 lr 破坏预训练权重
- **影响**：
  - 无 warmup → 初期 loss spike，甚至发散
  - warmup 太短 → 没起到保护作用
  - warmup 太长 → 浪费训练时间，相当于用小 lr 训练了很久
- **调参策略**：
  - 通常设为总步数的 **1%-10%**（如 100-2000 steps）
  - 继续预训练大模型时，warmup 比例可以稍大（保护预训练知识）

---

## 二、效果不好的诊断与调参流程

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: 观察 Loss 曲线                                  │
├─────────────────────────────────────────────────────────┤
│  • Loss 完全不降 → lr 太小 / 初始化问题 / 数据/标签错误    │
│  • Loss 震荡剧烈 → lr 太大 / batch 太小 / 无 warmup       │
│  • Loss 降后反弹 → lr 过大 / 过拟合开始                   │
│  • Loss 降得很慢 → lr 太小 / 模型容量不够 / 训练不够       │
│  • 验证 Loss 上升但训练 Loss 降 → 过拟合                    │
└─────────────────────────────────────────────────────────┘
```

### 针对性调整策略

| 现象 | 可能原因 | 调整方案 |
|------|---------|----------|
| **欠拟合**（训练/验证 loss 都高） | 模型容量小、训练不足、lr 太小 | 增大 hidden_size、增加 epochs、适度增大 lr |
| **过拟合**（训练 loss 低，验证 loss 高） | 模型太复杂、训练太久 | 减少 epochs、加 Dropout、减 hidden_size、加正则化 |
| **Loss NaN / 发散** | lr 太大、fp16 溢出、数据异常 | 降 lr、切 bf16/fp32、检查数据 |
| **收敛慢** | lr 小、batch 小、warmup 长 | 适度增大 lr、增大 effective batch、减 warmup |
| **显存不足** | batch/seq_len 太大 | 用 gradient checkpointing、降 batch、用 accumulation、降 seq_len |

---

## 三、推荐的调参优先级

```
1. 先固定: dtype（bf16）、max_seq_len（根据数据）
2. 首要调: learning rate（影响最大）
3. 配合调: batch_size + accumulation_steps（显存允许内尽量大）
4. 然后调: warmup_steps（lr 的配套）
5. 最后调: epochs（用 Early Stopping）、hidden_size（改模型架构）
```

---

## 四、模型参数量计算

### 1. 核心公式

对于标准 Transformer Decoder（如 GPT 系列）：

$$
\text{Total Params} \approx 12 \times L \times H^2 + 2 \times V \times H
$$

其中：
- $L$ = `num_layers`（层数）
- $H$ = `hidden_size`（隐藏维度）
- $V$ = `vocab_size`（词表大小）

> 当模型较大时（$H$ 很大），$12LH^2$ 项占主导，Embedding 占比很小。

### 2. 快速估算

| 组件 | 参数量 | 说明 |
|------|--------|------|
| **Attention** | `4 × H²` | Q/K/V 投影 (3×) + Output 投影 (1×) |
| **FFN** | `8 × H²` | 两个线性层，中间维度通常为 `4 × H` |
| **LayerNorm** | `2 × H` | 可学习参数 γ 和 β，可忽略 |
| **每层总计** | **≈ 12 × H²** | 标准架构 |

### 3. 实例验证（LLaMA-7B）

| 参数 | 值 |
|------|-----|
| hidden_size | 4096 |
| num_layers | 32 |
| intermediate_size | 11008 (≈ 2.7×H) |
| vocab_size | 32000 |

```
计算：
- Attention: 32 × 4 × 4096² = 2,147,483,648
- FFN: 32 × 2 × 4096 × 11008 = 2,885,095,424
- Embeddings: 2 × 32000 × 4096 = 262,144,000
- LayerNorm: 可忽略

总计 ≈ 6.73B（接近 7B，剩余是其他偏置项）
```

### 4. 显存占用估算

| 精度 | 每参数字节 | 7B 模型显存 |
|------|-----------|-----------|
| fp32 | 4 bytes | 28 GB |
| fp16/bf16 | 2 bytes | 14 GB |
| int8 | 1 byte | 7 GB |
| int4 | 0.5 byte | 3.5 GB |

**训练显存**（Adam 优化器 + 混合精度）：
```
≈ 模型参数 × (2 + 4 + 4) = 参数 × 20 字节
# 2: 半精度参数, 4: 单精度副本, 4: 动量+二阶矩
```


## 五、实用技巧汇总

1. **学习率扫描**：用 `wandb` 或自定义脚本跑几个 lr（如 1e-5, 5e-5, 1e-4），看哪个收敛最好
2. **Effective Batch Size**：单卡 8 × accumulation 4 = 32，等价于单卡 32，但省显存
3. **Cosine Decay**：比 Step Decay 更平滑，推荐配合 Warmup 使用
4. **混合精度检查**：如果 bf16 可用，几乎总是优于 fp16（无需 Loss Scaling）
5. **Early Stopping**：设置 patience（如 3-5 个 epoch 验证 loss 不下降则停止），避免过拟合
6. **梯度裁剪（Gradient Clipping）**：设置 `max_grad_norm`（如 1.0），防止梯度爆炸

---
