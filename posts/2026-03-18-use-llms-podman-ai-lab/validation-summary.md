# Validation Summary: How to Use LLMs with Podman AI Lab

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman AI Lab
- llama.cpp
- Large language models (LLMs)
- Bash
- `curl`
- Python 3

## Sources Consulted
- Podman AI Lab overview: https://podman-desktop.io/docs/ai-lab
- Starting an inference server in Podman AI Lab: https://podman-desktop.io/docs/ai-lab/start-inference-server
- Podman AI Lab extension page: https://podman-desktop.io/extensions/ai-lab
- Podman AI Lab curated catalog source: https://raw.githubusercontent.com/containers/podman-desktop-extension-ai-lab/main/packages/backend/src/assets/ai.json
- `llama.cpp` server documentation: https://raw.githubusercontent.com/ggml-org/llama.cpp/master/tools/server/README.md
- Podman `run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The model catalog section listed outdated or non-current AI Lab examples such as `llama-3-8b-instruct`, `llama-2-7b-chat`, and `codellama-7b-instruct`. I replaced them with current catalog-backed examples from the official AI Lab catalog source and clarified that the catalog changes over time.
- The container image used the old `ghcr.io/ggerganov/llama.cpp:server` reference. I updated it to `ghcr.io/ggml-org/llama.cpp:server`, which matches the current upstream `llama.cpp` documentation.
- The startup check used `podman logs ... | grep "listening"`, which is less reliable than the documented health endpoint. I changed it to poll `http://localhost:8080/health` until the model reports ready.
- The OpenAI-style chat requests omitted a `model` field. I added `--alias local-model` to the server commands and `"model": "local-model"` to the request bodies so the examples better match documented OpenAI-compatible request shapes.
- The shell pipeline script embedded prompt text directly inside inline Python source, which is brittle for quotes and multiline input. I rewrote the JSON construction to pass values through environment variables into Python safely.
- The `echo` example used `\n` expecting multiline output, which is not portable or reliable without escape processing. I replaced it with `printf`.
- The performance section suggested log scraping for throughput and included tuning guidance that did not match current `llama.cpp` defaults. I switched monitoring to the documented `/metrics` endpoint, enabled `--metrics`, and corrected the notes for `--threads`, `--ctx-size`, `--batch-size`, and `--mlock`.
- The summary claimed that any OpenAI-compatible tool or library would work unchanged. I softened that statement to reflect `llama.cpp`'s documented compatibility caveat and supported-chat-template requirement.

## Review Notes
- The post is now technically consistent with the current Podman AI Lab catalog and `llama.cpp` server docs as of 2026-05-07.
- The walkthrough still demonstrates direct `podman run` usage for the inference container rather than the Podman AI Lab Services UI flow documented by Podman Desktop. That is technically valid for a local `llama.cpp` service, but a future revision could show the AI Lab UI flow more directly if the goal is product-specific onboarding.
