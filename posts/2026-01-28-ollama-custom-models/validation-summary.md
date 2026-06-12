# Validation Summary: How to Use Ollama with Custom Models

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ollama
- Ollama Modelfiles
- GGUF model files
- Hugging Face model hosting
- Ollama REST API
- Python requests
- Shell commands

## Sources Consulted
- Ollama Modelfile Reference: https://docs.ollama.com/modelfile
- Ollama Importing a Model documentation: https://docs.ollama.com/import
- Ollama CLI Reference: https://docs.ollama.com/cli
- Ollama API documentation: https://docs.ollama.com/api and https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama llama3.2 tag listing: https://ollama.com/library/llama3.2/tags
- Hugging Face model repository for TheBloke/Mistral-7B-Instruct-v0.2-GGUF: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF

## Issues Found
- The description said the post covered fine-tuning custom models in Ollama. Ollama supports creating configured model variants and importing fine-tuned weights/adapters, but the post does not show an Ollama fine-tuning workflow. Changed "fine-tuning" to "configuring".
- The architecture diagram referenced an `ollama import` command. Current Ollama documentation imports GGUF files through a Modelfile and `ollama create`, so the diagram was corrected to `ollama create`.
- The Modelfile display examples used `ollama show <model> --modelfile`. The official documentation shows `ollama show --modelfile <model>`, so both examples were updated to the documented form.
- The embeddings API example used the superseded `/api/embeddings` endpoint and `prompt` field. Current Ollama API documentation uses `/api/embed` with an `input` field, so the example was updated.
- The troubleshooting quantization example used `llama3.2:3b-q4_0`, which is not the current Llama 3.2 tag form in the Ollama library. Updated it to `llama3.2:3b-instruct-q4_0`.
- The parameter tuning example described `seed -1` as random. The current Modelfile reference documents `seed` as a reproducibility parameter with numeric examples, so the example was changed to `PARAMETER seed 42`.
- The raw/template troubleshooting request combined `raw: true` with a `template` override. Raw mode is for supplying a fully formatted prompt without templating, so `raw` was removed from the explicit template example.

## Review Notes
The local environment did not have the `ollama` CLI installed, so command validation was performed against official Ollama documentation and model registry pages rather than local `--help` output. The post remains a practical Modelfile and API guide; it does not cover actual model training or fine-tuning workflows.
