# Validation Summary: How to Deploy LLMs with vLLM for High-Performance Inference

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- vLLM (LLM inference and serving library)
- PagedAttention
- Continuous batching
- OpenAI-compatible API server
- Tensor parallelism / Pipeline parallelism (Ray)
- Quantization (AWQ, GPTQ, SqueezeLLM)
- Hugging Face models (Llama-2, Mistral)
- Python `openai` client (v1+ SDK)
- httpx (async HTTP client)
- Docker (NVIDIA CUDA base image)
- Kubernetes (Deployment, Service, GPU resources)

## Sources Consulted
- vLLM official documentation: https://docs.vllm.ai/en/latest/
- vLLM GPU installation guide: https://docs.vllm.ai/en/latest/getting_started/installation/gpu.html (Python 3.10–3.13, CUDA 12.x, Linux, compute capability 7.5+)
- vLLM distributed serving (v0.9.0): https://docs.vllm.ai/en/v0.9.0/serving/distributed_serving.html (multi-node uses `VLLM_HOST_IP` and Ray; not `RAY_HEAD_ADDRESS`)
- vLLM source for `AsyncLLMEngine` / `AsyncEngineArgs` imports: https://github.com/vllm-project/vllm/blob/main/vllm/engine/async_llm_engine.py
- vLLM OpenAI-compatible server docs: https://docs.vllm.ai/en/stable/serving/openai_compatible_server/
- vLLM quantization docs (AWQ, GPTQ, SqueezeLLM still listed): https://docs.vllm.ai/en/latest/features/quantization/
- OpenAI Python SDK v1 reference (chat.completions.create, streaming usage)
- Mistral instruction format ([INST]...[/INST] with `<s>` BOS token)

## Issues Found
1. **Outdated Python version requirement.** Post stated "Python 3.8 or higher". Current vLLM (in 2026) requires Python 3.10–3.13. Updated to "Python 3.10 or higher" and also added a note about minimum GPU compute capability (7.0+) for clarity.
2. **Outdated CUDA version requirement.** Post stated "CUDA 11.8 or higher". Current vLLM wheels are built against CUDA 12.x (12.8/12.9). Updated to "CUDA 12.1 or higher".
3. **HTML-escaped angle brackets inside Python code.** The `format_chat_prompt` function used `f"&lt;s&gt;[INST] ..."`. Inside a fenced code block, these would render literally as `&lt;s&gt;` and a reader copying the snippet would end up with HTML entities in their Python string rather than the `<s>` BOS token required by Mistral/Llama. Replaced with `f"<s>[INST] ..."`.
4. **Incorrect multi-node Ray setup.** The original snippet used a non-existent `RAY_HEAD_ADDRESS=<node0-ip>:6379 python -m vllm.entrypoints...` invocation. vLLM does not read `RAY_HEAD_ADDRESS`; multi-node serving requires standing up a Ray cluster first (`ray start --head` on the head, `ray start --address=...` on workers) with `VLLM_HOST_IP` set per node, and then launching vLLM on the head node. Replaced with the correct sequence.

## Review Notes
- The `python -m vllm.entrypoints.openai.api_server` invocation is the legacy command form. It still works, but the modern, recommended CLI is `vllm serve <model> [...]`. Not changed because the legacy form is still functional, but a future revision could migrate the examples.
- `enforce_eager=False` is already the default in vLLM; the line is harmless but redundant.
- `block_size=16` comment says "16 or 32"; vLLM also accepts 8. Minor, left as-is.
- SqueezeLLM is still listed in vLLM's supported quantization methods, but it sees little maintenance compared to AWQ/GPTQ — the comparison table caveat ("Low" quality impact, "Moderate" speed) is reasonable.
- The "Llama-2 throughput up to 24x" claim originates from the vLLM team's blog and PagedAttention paper benchmarks; the looser "10–24x" range in the intro is a reasonable summary.
- The Mistral chat template shown (`<s>[INST] {system}\n\n{user} [/INST]`) is an acceptable convention for combining a system prompt with a user message for Mistral-Instruct-v0.2, which does not have a dedicated system role.
- The Kubernetes manifest references `vllm/vllm-openai:latest` and a `start_server.sh` script — the container image already starts the OpenAI server by default, so users adopting the image directly do not need the Dockerfile/start_server.sh from the previous section. Both flows are valid alternatives.
