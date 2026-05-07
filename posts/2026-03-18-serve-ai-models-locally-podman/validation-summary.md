# Validation Summary: How to Serve AI Models Locally with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- llama.cpp server
- GGUF model files
- Hugging Face model downloads
- OpenAI-compatible HTTP APIs
- systemd user services
- Bash and curl

## Sources Consulted
- llama.cpp server README: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- Podman run documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman systemd and Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- Hugging Face Mistral GGUF file URL: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
- Hugging Face CodeLlama GGUF file URL: https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf

## Issues Found
- The post said it covered "different backends," but the implementation only uses llama.cpp. Changed this to "llama.cpp" to match the actual content.
- The llama.cpp container image used the old `ghcr.io/ggerganov/llama.cpp:server` path. Updated all examples to the current official `ghcr.io/ggml-org/llama.cpp:server` image path from the llama.cpp server documentation.
- The multiple-model example referenced `/models/codellama-7b-instruct-q4_k_m.gguf`, but the prerequisites only downloaded the Mistral model. Added a CodeLlama GGUF download command using a verified Hugging Face URL.
- The monitoring example used `podman stats --filter "name=model-"`, but the current official `podman stats` documentation does not list a `--filter` option. Changed the command to pass the tutorial's container names directly.
- The systemd unit used `Type=forking` with `podman run -d`, which would leave systemd supervising the short-lived Podman client instead of the model server container for restart behavior. Changed the service to `Type=simple` and foreground `podman run --replace`, with cleanup in `ExecStopPost`, so `Restart=on-failure` can track the running process.

## Review Notes
- The llama.cpp server documentation currently notes that `--cont-batching` is enabled by default, but keeping the explicit flag is still valid.
- Podman documentation recommends Quadlet for Podman containers under systemd. The post's direct `.service` unit is still usable as a concise example, but Quadlet would be a good future improvement.
- Podman was not installed in the local environment, so CLI checks were performed against official documentation and remote source documentation rather than local `--help` output.
