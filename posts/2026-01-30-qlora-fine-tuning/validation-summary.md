# Validation Summary: How to Build QLoRA Fine-Tuning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- QLoRA (Quantized Low-Rank Adaptation)
- LoRA (Low-Rank Adaptation)
- 4-bit NormalFloat (NF4) quantization
- Hugging Face Transformers
- Hugging Face PEFT
- Hugging Face TRL (SFTTrainer / SFTConfig)
- bitsandbytes
- PyTorch (bfloat16, gradient checkpointing)
- Llama 2 (as an example base model)

## Sources Consulted
- QLoRA paper (Dettmers et al., 2023): https://arxiv.org/abs/2305.14314
- LoRA paper (Hu et al., 2021): https://arxiv.org/abs/2106.09685
- Hugging Face TRL — SFT Trainer documentation: https://huggingface.co/docs/trl/main/en/sft_trainer
- Hugging Face PEFT documentation: https://huggingface.co/docs/peft
- transformers `BitsAndBytesConfig` API
- bitsandbytes optimizers reference (paged_adamw_32bit)

## Issues Found
1. **LoRA decomposition diagram had a dimensionally inconsistent formula.**
   The "LoRA Decomposition" mermaid diagram defined `Matrix A` with shape `(d x r)` and
   `Matrix B` with shape `(r x d)`, and showed the data flow as `Input → A → B`. With those
   shapes/flow the effective update matrix is `A × B = (d × r)(r × d) = (d × d)`. The original
   text incorrectly wrote the formula as `B × A`, which with those shapes evaluates to
   `(r × d)(d × r) = (r × r)` and is not a valid update for a `d × d` weight matrix. Changed
   both occurrences (the intermediate node label and the final `W + (alpha/r) × B × A`
   expression) to `A × B` so the formula matches the diagram's own shape convention and the
   data flow shown.

2. **Outdated TRL SFTTrainer API in the complete training pipeline.**
   The pipeline used the legacy TRL API: it imported `TrainingArguments` from `transformers`
   and passed `tokenizer=`, `max_seq_length=`, `dataset_text_field=`, and `packing=` as
   keyword arguments directly to `SFTTrainer`. In current TRL releases these arguments have
   been moved/removed:
   - SFT-specific options (`max_length`, `dataset_text_field`, `packing`, …) now live on
     `SFTConfig` (which itself extends `TrainingArguments`).
   - The tokenizer/processor is now passed via `processing_class=` rather than `tokenizer=`.
   - `max_seq_length` was renamed to `max_length` on `SFTConfig`.
   Updated the imports (dropped `TrainingArguments`, added `SFTConfig`), switched the args
   object to `SFTConfig`, moved the SFT options onto it, renamed `max_seq_length` → `max_length`,
   and replaced `tokenizer=tokenizer` with `processing_class=tokenizer`. The code now matches
   the current TRL SFTTrainer documentation.

## Review Notes
- The `BitsAndBytesConfig` parameters (`load_in_4bit`, `bnb_4bit_quant_type="nf4"`,
  `bnb_4bit_compute_dtype=torch.bfloat16`, `bnb_4bit_use_double_quant=True`) match the
  current `transformers` API and the QLoRA paper's recommended setup.
- `prepare_model_for_kbit_training`, `LoraConfig`, `get_peft_model`, and `PeftModel` are
  all current PEFT APIs, including the `target_modules` list used for Llama-style models
  (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
- The memory-comparison numbers in the "Memory Efficiency Comparison" diagram are rough
  order-of-magnitude estimates. The "full fine-tuning" values (e.g. ~28 GB for a 7B model)
  roughly correspond to fp32 weights only and underestimate true peak memory once gradients,
  optimizer state, and activations are included (mixed-precision AdamW typically needs ~16
  bytes/param ≈ 112 GB for a 7B model). The QLoRA numbers are reasonable approximations.
  Left as-is because the diagram is presented as a relative comparison, not a precise
  accounting.
- The inference example uses `### Human:` / `### Assistant:` style prompting that matches
  the `timdettmers/openassistant-guanaco` dataset format used for training, so it is
  internally consistent.
- The `meta-llama/Llama-2-7b-hf` model is gated on the Hub; readers will need to accept the
  Llama 2 license and authenticate before the example will download weights. Not a
  correctness issue, just an operational caveat worth being aware of.
- Linked external resources (arXiv 2305.14314, PEFT docs, bitsandbytes repo, TRL docs) all
  point to the correct, authoritative sources.
