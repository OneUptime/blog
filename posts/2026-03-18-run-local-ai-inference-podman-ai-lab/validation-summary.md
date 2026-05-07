# Validation Summary: How to Run Local AI Inference with Podman AI Lab

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman Desktop
- Podman AI Lab
- Podman CLI
- RamaLama / llama.cpp model serving
- OpenAI-compatible chat and completion APIs
- OpenAI Python client
- Local GGUF model inference

## Sources Consulted
- Podman Desktop AI Lab overview: https://podman-desktop.io/docs/ai-lab
- Podman Desktop starting an inference server: https://podman-desktop.io/docs/ai-lab/start-inference-server
- Podman Desktop downloading a model: https://podman-desktop.io/docs/ai-lab/download-model
- Podman AI Lab GitHub repository and source: https://github.com/containers/podman-desktop-extension-ai-lab
- RamaLama serve documentation: https://ramalama.ai/docs/commands/ramalama/serve/
- RamaLama OCI model/runtime documentation: https://docs.ramalama.com/registry/artifacts/model
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html

## Issues Found
- The Podman Desktop UI flow referenced **AI Lab > Models** and **Start Inference**, but current Podman AI Lab documentation uses the **Services** page, **New Model Service**, and **Create service** flow. Updated the steps to match the current official workflow.
- The model directory check used `/var/lib/containers/ai-lab/models/`, which does not match the current extension source defaults. Updated the example to check the local AI Lab model directory under the AI Lab user data path.
- The CLI examples used `ghcr.io/containers/ai-lab-model-service:latest` with arguments that are not documented in the current AI Lab source. Updated the examples to use a current RamaLama llama.cpp runtime image with explicit `--model`, `--host`, and `--port` arguments.
- The second CLI run omitted the label used later for bulk cleanup. Added the same `ai-lab-model=true` label to keep cleanup commands consistent.
- The Python OpenAI client used `api_key="not-needed"`. Local servers ignore the key, but the current AI Lab snippets use a placeholder key format. Updated it to `sk-no-key-required`.
- The bulk stop/remove commands used command substitution and a label filter without the label value. Updated them to filter `label=ai-lab-model=true` and use `xargs -r` so empty result sets do not invoke `podman stop` or `podman rm` with no targets.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was verified against official Podman documentation, Podman AI Lab source, and RamaLama documentation rather than by executing the containers locally.
