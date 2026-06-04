# Validation Summary: How to Run LLM Inference with llama.cpp in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- llama.cpp
- GGUF model files
- Hugging Face model downloads
- NVIDIA CUDA container runtime
- OpenAI-compatible Chat Completions API
- OpenAI Python client
- CMake

## Sources Consulted
- llama.cpp Docker documentation: https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md
- llama.cpp HTTP server documentation: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- llama.cpp CMake configuration: https://github.com/ggml-org/llama.cpp/blob/master/CMakeLists.txt
- GGML CMake options: https://github.com/ggml-org/ggml/blob/master/CMakeLists.txt
- llama.cpp CUDA Dockerfile: https://github.com/ggml-org/llama.cpp/blob/master/.devops/cuda.Dockerfile
- llama.cpp REST API documentation: https://www.mintlify.com/ggml-org/llama.cpp/api/rest/overview
- Docker Compose version/name documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Hugging Face model file URL: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
- OpenAI API documentation and SDK examples via OpenAI developer docs MCP.

## Issues Found
- The model download saved a Mistral v0.2 GGUF file under a v0.3 filename, and later commands referenced that v0.3 path. Updated the filename and all model paths to `mistral-7b-instruct-v0.2.Q4_K_M.gguf`.
- The Docker examples used the old `ghcr.io/ggerganov/llama.cpp` image namespace. Updated official image references to `ghcr.io/ggml-org/llama.cpp`.
- The custom build snippet cloned the old GitHub repository path. Updated it to `https://github.com/ggml-org/llama.cpp.git`.
- The custom CMake example used deprecated `LLAMA_NATIVE`, `LLAMA_AVX2`, and `LLAMA_FMA` options. Updated them to the current `GGML_NATIVE`, `GGML_AVX2`, and `GGML_FMA` options.
- The custom runtime image copied `llama-server` into a plain Ubuntu image without installing `libgomp1`, which is needed for the default OpenMP-enabled build. Added `libgomp1` to the runtime stage.
- The Docker Compose example used the obsolete top-level `version: "3.8"` key. Removed it because current Compose treats the field as informative and emits an obsolete warning.
- The performance tuning section said `--batch-size` defaults to 512. Updated it to the current default of 2048 and clarified that it is the logical maximum batch size.
- The article described `--cont-batching` as enabling continuous batching, but current llama.cpp enables it by default. Reworded the relevant notes to say the flag keeps continuous batching enabled.

## Review Notes
The remaining examples are technically plausible, but actual latency and memory behavior depends heavily on the selected model, quantization, CPU instruction set, context size, and whether GPU offload fits in available VRAM. The `--n-gpu-layers 99` example remains valid for many models, though current llama.cpp also accepts `auto` and `all`.
