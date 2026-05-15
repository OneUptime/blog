# Validation Summary: How to Run Ollama for Local LLM Inference on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Ollama
- systemd
- Ollama CLI
- Ollama REST API
- NVIDIA CUDA GPU acceleration
- firewalld
- Ollama Modelfile

## Sources Consulted
- Ollama Linux documentation: https://docs.ollama.com/linux
- Ollama CLI reference: https://docs.ollama.com/cli
- Ollama API generate endpoint: https://docs.ollama.com/api/generate
- Ollama API chat endpoint: https://docs.ollama.com/api/chat
- Ollama API tags endpoint: https://docs.ollama.com/api/tags
- Ollama Modelfile reference: https://docs.ollama.com/modelfile
- Ollama FAQ: https://github.com/ollama/ollama/blob/main/docs/faq.mdx
- Ollama hardware support documentation: https://github.com/ollama/ollama/blob/main/docs/gpu.mdx
- Official Ollama install script: https://ollama.com/install.sh

## Issues Found
- The manual install commands used an outdated standalone binary URL. Updated them to download and extract `ollama-linux-amd64.tar.zst` into `/usr`, matching the current official Linux documentation.
- The install verification command used `ollama --version`; updated it to `ollama -v`, matching the current official Linux manual install instructions.
- The manually created systemd service differed from current official guidance. Updated the user creation command to create the `ollama` group, added the current user to that group, changed `ExecStart` to `/usr/bin/ollama serve`, changed the environment line to `Environment="PATH=$PATH"`, and changed the install target to `multi-user.target`.
- The model listing command used `ollama list`; updated it to the documented `ollama ls` command.
- The GPU verification used `nvidia-smi`. Replaced it with `ollama ps`, which is the documented way to confirm whether Ollama loaded a model on GPU, and updated the expected output note accordingly.
- The CPU-only example used `OLLAMA_NUM_GPU=0`, which is not the documented server-level GPU selection method. Replaced it with `CUDA_VISIBLE_DEVICES=-1 ollama serve` for NVIDIA GPUs, matching Ollama hardware support documentation.
- The remote access example set `OLLAMA_HOST=0.0.0.0` without the explicit port and restarted the service without reloading systemd. Updated it to `OLLAMA_HOST=0.0.0.0:11434` and added `sudo systemctl daemon-reload`, matching Ollama FAQ guidance.

## Review Notes
The API examples, Modelfile syntax, model pull/run examples, and firewalld commands are technically valid. The tutorial assumes an amd64 RHEL host; arm64 or AMD GPU systems require the corresponding Ollama package or ROCm-specific steps from the official Linux documentation.
