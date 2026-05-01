# Validation Summary: How to Deploy Ollama for Local LLM Inference via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ollama
- Portainer
- Docker Compose
- NVIDIA GPU support for Docker
- Python
- OpenAI Python SDK

## Sources Consulted
- Ollama Docker docs: https://docs.ollama.com/docker
- Ollama OpenAI compatibility docs: https://docs.ollama.com/api/openai-compatibility
- Ollama API introduction: https://docs.ollama.com/api/introduction
- Ollama API pull endpoint: https://docs.ollama.com/api/pull
- Ollama API tags endpoint: https://docs.ollama.com/api/tags
- Ollama create-model endpoint: https://docs.ollama.com/api/create
- Ollama Modelfile reference: https://docs.ollama.com/modelfile
- Ollama FAQ: https://docs.ollama.com/faq
- Ollama context length docs: https://docs.ollama.com/context-length
- Ollama model library pages for `llama3`, `mistral`, `phi3`, and `gemma3`: https://ollama.com/library
- Docker Compose GPU support docs: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer advanced container settings docs: https://docs.portainer.io/user/docker/containers/advanced
- Official OpenAI Python library: https://github.com/openai/openai-python

## Issues Found
- The post used outdated Ollama image pins (`ollama/ollama:0.1.27`) while the rest of the article relies on current Ollama documentation patterns. Updated both Compose examples to the official `ollama/ollama` image reference used in Ollama's Docker docs.
- The `/api/pull` examples used `name` in the JSON body. Current Ollama API docs require `model`, so all pull examples were corrected.
- The custom model example used `/api/create` with `name` and `modelfile`, which does not match the current documented create-model API. Replaced it with the official `ollama create ... -f <Modelfile>` workflow for Modelfile-based model creation.
- The GPU deployment wording was too broad for Portainer. Updated it to specify Docker Standalone with NVIDIA GPUs, which matches Portainer's documented GPU support scope.
- The resource-planning table gave fixed RAM, VRAM, and CPU token-per-second figures that are highly hardware- and configuration-dependent and were not supportable from the official docs. Replaced the table with model size/context information from the Ollama model library and added a note explaining the real memory drivers.
- The opening claim said Ollama's REST API "mirrors" the OpenAI interface. Softened this to "OpenAI-compatible endpoint," which better matches Ollama's own documentation wording.

## Review Notes
- The `chat.completions.create(...)` examples remain technically valid with the current OpenAI Python SDK and match Ollama's OpenAI-compatibility documentation, even though OpenAI's own platform docs now emphasize the Responses API for OpenAI-hosted models.
- The Compose file still includes a top-level `version: "3.8"` key. Modern Compose tooling treats this as largely obsolete, but it remains broadly accepted and does not break the example.
