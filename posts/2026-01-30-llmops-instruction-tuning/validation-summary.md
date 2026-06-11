# Validation Summary: How to Create Instruction Tuning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Large language models and instruction tuning
- Hugging Face Transformers
- Hugging Face Datasets and Evaluate
- Hugging Face PEFT, LoRA, and QLoRA
- bitsandbytes quantization
- PyTorch
- Weights & Biases
- lm-evaluation-harness
- vLLM
- Mermaid diagrams

## Sources Consulted
- Hugging Face Transformers Trainer documentation: https://huggingface.co/docs/transformers/en/main_classes/trainer
- Hugging Face Transformers data collator documentation: https://huggingface.co/docs/transformers/en/main_classes/data_collator
- Hugging Face Transformers causal language modeling documentation: https://huggingface.co/docs/transformers/en/tasks/language_modeling
- Hugging Face Transformers chat templating documentation: https://huggingface.co/docs/transformers/en/chat_templating
- Hugging Face PEFT LoRA documentation: https://huggingface.co/docs/peft/package_reference/lora
- Hugging Face PEFT quantization guide: https://huggingface.co/docs/peft/en/developer_guides/quantization
- vLLM SamplingParams documentation: https://docs.vllm.ai/en/latest/api/vllm/sampling_params/

## Issues Found
- The training script used `evaluation_strategy`, which is no longer the current `TrainingArguments` field in the Transformers documentation. Changed it to `eval_strategy` in both the config dataclass and `TrainingArguments`.
- The `Trainer` initialization used the deprecated `tokenizer` argument. Changed it to `processing_class=self.tokenizer`, matching current Transformers documentation.
- The training script used `DataCollatorForSeq2Seq` for decoder-only causal language modeling. Replaced it with `DataCollatorForLanguageModeling(mlm=False)`, which is the documented collator for causal LM training and masks padding labels with `-100`.
- The tokenization step manually copied `input_ids` into `labels`, which duplicated the causal LM collator's documented responsibility. Removed the manual labels assignment.
- The default prompt template was `chatml` while the configured model was `meta-llama/Llama-3.2-3B-Instruct`. Changed the default to `llama` so the example matches the model family used in the script.
- The Llama helper described its prompt as a "Llama 2/3 chat template" but the literal tokens are Llama 3 style, not Llama 2 `[INST]` style. Updated the docstring to "Llama 3 chat template."
- The training architecture diagram claimed response-only masking, but the included script trains with causal LM labels and padding masking. Updated the diagram label to "Padding Masking."
- The evaluation script checked only for the presence of `apply_chat_template`, which can still fail if no `chat_template` is configured. Changed the check to require `tokenizer.chat_template`.
- The evaluation script decoded the full sequence with special tokens stripped and then sliced by the raw prompt string length, which can produce incorrect responses. Changed it to slice generated token IDs after the prompt length and decode only newly generated tokens.
- The evaluation script used `pad_token_id` during generation without ensuring the tokenizer had a pad token. Added the same EOS-as-pad fallback used in the training script.
- The deduplication function documented near-duplicate removal even though the implementation only removes exact duplicates. Updated the docstring to describe exact duplicate removal and mark the threshold as reserved for future near-duplicate logic.

## Review Notes
- The examples are syntactically valid Python after the edits; all four Python code blocks were parsed with `python3 ast.parse`.
- The scripts are tutorial examples and still assume the user has appropriate GPU hardware, model access for Meta Llama checkpoints, compatible CUDA/FlashAttention/bitsandbytes installations, and W&B/lm-evaluation-harness dependencies where used.
