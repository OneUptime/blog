# Validation Summary: How to Debug LLM Inference Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ollama (CLI, REST API, Modelfile syntax)
- vLLM (OpenAI-compatible API server, Prometheus metrics)
- NVIDIA tooling (nvidia-smi, dmon, --query-gpu)
- CUDA / GPU memory management
- Llama 3 prompt template (special tokens)
- Mistral instruction format
- ChatML prompt format
- Python (requests, Flask, psutil, subprocess, logging, functools)
- Linux diagnostic tools (dmesg, journalctl, sar, systemctl, docker)
- Quantization formats (FP32, FP16, BF16, INT8, INT4)

## Sources Consulted
- Ollama API reference: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama Modelfile reference: https://github.com/ollama/ollama/blob/main/docs/modelfile.md
- vLLM CLI / OpenAI-compatible server docs: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
- NVIDIA System Management Interface (nvidia-smi) reference
- Meta Llama 3 prompt format documentation: https://llama.meta.com/docs/model-cards-and-prompt-formats/meta-llama-3/
- Mistral instruct chat template documentation
- ChatML format (OpenAI / Qwen)
- psutil documentation: https://psutil.readthedocs.io/
- Flask documentation: https://flask.palletsprojects.com/
- Hugging Face model card: meta-llama/Llama-3.2-3B-Instruct

## Issues Found
No technical issues found.

All verifiable technical claims, CLI flags, API endpoints, field names, code samples, and quantization math check out:

- VRAM rule-of-thumb math is correct (7B FP16 ≈ 17.5 GB with 25% overhead; 70B INT4 ≈ 43.75 GB).
- Ollama `/api/generate`, `/api/tags`, and the `prompt_eval_count` / `raw` / `num_predict` / `num_ctx` parameters match the official API.
- vLLM `python -m vllm.entrypoints.openai.api_server` with `--model`, `--gpu-memory-utilization`, `--max-model-len` is valid, and `/metrics` exposes Prometheus throughput counters.
- Llama 3 special tokens (`<|begin_of_text|>`, `<|start_header_id|>`, `<|end_header_id|>`, `<|eot_id|>`) match Meta's documented format.
- ChatML `<|im_start|>` / `<|im_end|>` tokens are correct.
- `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits` is the correct invocation.
- Linux diagnostic commands (`dmesg`, `journalctl -k`, `sar -r`, `sar -u`) are accurate.
- Python code (requests, Flask, psutil, subprocess, functools.wraps decorator) is syntactically valid and uses current APIs.
- Unicode escapes for em dash and smart quotes (`—`, `‘`–`”`) are correct.

## Review Notes
- The "Level 2: smaller quantization" example uses `llama3.2:3b-q4_0` vs default `llama3.2:3b`. Note that the default tag for `llama3.2:3b` is already Q4_K_M (4-bit), so switching to `q4_0` yields only a marginal memory reduction. The mechanism (quantization) is correct, but the example understates the impact relative to actually picking a smaller model (e.g., `llama3.2:1b`). Left as-is since the conceptual point is valid.
- The Mistral template shown is a simplified one-shot format. Native Mistral v0.1 doesn't support system prompts in its chat template; v0.2/v0.3 use a slightly different structure with `<s>` BOS tokens. The post's example is a common community workaround and is labeled simply as "Mistral format" — acceptable as an introductory example.
- vLLM has since added a `vllm serve <model>` shortcut, but the `python -m vllm.entrypoints.openai.api_server` form shown in the post still works and remains in the official docs.
- The `benchmark_inference` function counts iter_lines() entries as tokens, which is approximately 1:1 with Ollama streaming chunks but includes the final `done: true` JSON line — a minor approximation, not an error, and adequate for the benchmarking intent described.
- The `inspect_tokenization` helper uses `num_predict: 0` to get `prompt_eval_count` without generation. This is a documented Ollama option and a valid approach; Ollama does not currently expose a dedicated tokenize endpoint in its public REST API.
