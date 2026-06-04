# Validation Summary: How to Use Docker Model Runner for Local AI Models

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Model Runner
- Docker Desktop
- Docker Engine
- Docker CLI
- Docker Compose
- OpenAI-compatible Chat Completions API
- OpenAI Python SDK
- Node.js / Express
- NVIDIA GPU monitoring
- Apple Silicon GPU monitoring

## Sources Consulted
- Docker Model Runner documentation: https://docs.docker.com/ai/model-runner/
- Docker Model Runner REST API reference: https://docs.docker.com/ai/model-runner/api-reference/
- Docker `docker model` CLI reference: https://docs.docker.com/reference/cli/docker/model/
- Docker `docker model run` CLI reference: https://docs.docker.com/reference/cli/docker/model/run/
- Docker Desktop `model-runner` enable command reference: https://docs.docker.com/reference/cli/docker/desktop/enable/model-runner/
- Docker Compose AI models documentation: https://docs.docker.com/ai/compose/models-and-compose/
- Docker Compose `models` reference: https://docs.docker.com/reference/compose-file/models/
- Docker Hub `ai/llama3.2` model repository: https://hub.docker.com/r/ai/llama3.2
- Docker Hub `ai/qwen2.5` model repository: https://hub.docker.com/r/ai/qwen2.5
- Local `docker model --help`, `docker model pull --help`, `docker model rm --help`, `docker model purge --help`, `docker model list --help`, and `docker model inspect --help` output

## Issues Found
- The prerequisite version was outdated. Changed Docker Desktop 4.34+ to the current documented requirements: Docker Desktop 4.40+ on macOS, Docker Desktop 4.41+ on Windows, or Docker Engine with Model Runner installed.
- The NVIDIA GPU prerequisite was too specific. Replaced the NVIDIA Container Toolkit requirement with supported NVIDIA driver guidance, matching Docker Model Runner's current requirements.
- The lifecycle capability wording mentioned start/stop model management, but the current CLI uses pull, run/load, unload, remove, and runner start/stop commands. Updated the wording to avoid implying a `docker model stop` command.
- The code-specialized model example used `ai/codellama:7B-Q4_K_M`, which was not verified as a current Docker Model Runner model repository. Replaced it with the verified Docker Hub model `ai/qwen2.5:7B-Q4_K_M`.
- The running section implied `docker model run` starts a persistent inference server. Updated the command to `docker model run --detach` and described it as pre-loading the model in the background.
- The OpenAI-compatible API examples used an obsolete per-model path under `/engines/ai/llama3.2:1B-Q8_0/v1`. Updated curl, Python, and Node.js examples to the current documented OpenAI-compatible base path: `http://localhost:12434/engines/v1`.
- The Compose example used a nonexistent `model-runner` service hostname and did not declare Compose models. Updated it to use the top-level `models` section and service-level model binding with `endpoint_var` and `model_var`, as documented for Docker Compose 2.38+.
- The management section used `docker model prune`, which is not a current Docker Model Runner command. Replaced it with `docker model purge`.
- The testing tip claimed temperature 0.0 always produces the same output. Softened this to "more repeatable outputs" because local inference can still vary depending on model/runtime behavior.

## Review Notes
- The post is technically relevant and includes commands, API calls, Docker Compose configuration, Python code, and Node.js code.
- Model memory requirements remain rough estimates; actual memory use varies by model, context size, inference engine, platform, and runtime flags.
