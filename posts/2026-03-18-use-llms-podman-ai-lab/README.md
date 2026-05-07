# How to Use LLMs with Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, LLM, Machine Learning, Natural Language Processing

Description: Learn how to work with large language models in Podman AI Lab for text generation, code assistance, and conversational AI.

---

> Large language models running locally through Podman AI Lab give you GPT-like capabilities without remote API usage fees.

Large Language Models (LLMs) are the backbone of modern AI applications like chatbots, code assistants, and content generators. Podman AI Lab provides a curated local model catalog and can start local inference services on your hardware. This guide covers selecting the right LLM for your task, configuring it for optimal performance, and integrating it into common workflows.

---

## Understanding Available LLMs

```bash
# Podman AI Lab provides a curated model catalog, and the exact list changes over time.
# Current examples in the catalog include:

# General-purpose / instruction-tuned
# - mistralai/Mistral-Small-3.2-24B-Instruct-2506
# - qwen/qwen3-4b-GGUF
# - ibm-granite/granite-3.3-8b-instruct-GGUF
# - openai/gpt-oss-20b (Unsloth quantization)

# Code-focused
# - ibm-granite/granite-8b-code-instruct-GGUF

# Small / specialized examples
# - ibm-granite/granite-4.0-tiny-GGUF
# - microsoft/Phi-4-mini-reasoning (Unsloth quantization)

# You can also import your own models if the built-in catalog does not match your use case.
```

## Starting an LLM Service

```bash
# Start a general-purpose LLM server
podman run -d \
  --name llm-server \
  -p 8080:8080 \
  -v ~/ai-models:/models:ro \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/granite-3.3-8b-instruct-Q4_K_M.gguf \
  --alias local-model \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads 4 \
  --metrics

# Wait for the model to finish loading
until curl -sf http://localhost:8080/health >/dev/null; do sleep 1; done
```

## Text Generation Use Cases

### Conversational Chat

```bash
# Multi-turn conversation with system prompt
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [
      {"role": "system", "content": "You are a senior Linux administrator. Be concise and practical."},
      {"role": "user", "content": "How do I find which process is using the most memory?"},
      {"role": "assistant", "content": "Use: ps aux --sort=-%mem | head -10"},
      {"role": "user", "content": "How do I kill the top one safely?"}
    ],
    "temperature": 0.3,
    "max_tokens": 256
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```

### Code Generation

```bash
# Generate a Python script from a description
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [
      {"role": "system", "content": "You are an expert Python developer. Write clean, well-commented code."},
      {"role": "user", "content": "Write a Python script that monitors disk usage and sends an alert if any partition exceeds 90% usage."}
    ],
    "temperature": 0.2,
    "max_tokens": 1024
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```

### Text Summarization

```bash
# Summarize a long text
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [
      {"role": "system", "content": "Summarize the following text in 3 bullet points. Be concise."},
      {"role": "user", "content": "Containers are lightweight, portable units of software that package an application and its dependencies together. Unlike virtual machines, containers share the host operating system kernel, making them much more efficient in terms of resource usage. Container technologies like Podman and Docker have revolutionized software deployment by ensuring applications run consistently across different environments. The adoption of containers has led to the development of orchestration platforms like Kubernetes, which manage the lifecycle of containerized applications at scale."}
    ],
    "temperature": 0.3,
    "max_tokens": 256
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```

## Building an LLM Pipeline Script

```bash
cat << 'SCRIPT' > ~/llm_pipeline.sh
#!/bin/bash
# A reusable script for sending prompts to the local LLM server

LLM_URL="${LLM_URL:-http://localhost:8080}"
MODEL_NAME="${MODEL_NAME:-local-model}"
SYSTEM_PROMPT="${SYSTEM_PROMPT:-You are a helpful assistant.}"
TEMPERATURE="${TEMPERATURE:-0.7}"
MAX_TOKENS="${MAX_TOKENS:-512}"

# Read prompt from argument or stdin
if [ -n "$1" ]; then
  PROMPT="$1"
else
  PROMPT=$(cat)
fi

# Send the request and extract the response text
curl -s "${LLM_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$(MODEL_NAME="$MODEL_NAME" SYSTEM_PROMPT="$SYSTEM_PROMPT" PROMPT="$PROMPT" TEMPERATURE="$TEMPERATURE" MAX_TOKENS="$MAX_TOKENS" python3 - <<'PY'
import json
import os
print(json.dumps({
    'model': os.environ['MODEL_NAME'],
    'messages': [
        {'role': 'system', 'content': os.environ['SYSTEM_PROMPT']},
        {'role': 'user', 'content': os.environ['PROMPT']}
    ],
    'temperature': float(os.environ['TEMPERATURE']),
    'max_tokens': int(os.environ['MAX_TOKENS'])
}))
PY
)" | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
SCRIPT
chmod +x ~/llm_pipeline.sh

# Usage examples:
# Direct prompt
~/llm_pipeline.sh "Explain DNS in one paragraph"

# Pipe content into the LLM
printf '%s\n' \
  'Review this Containerfile for security issues:' \
  'FROM ubuntu:latest' \
  'RUN apt-get update' | \
  SYSTEM_PROMPT="You are a container security expert." ~/llm_pipeline.sh

# Summarize a file
cat /etc/os-release | SYSTEM_PROMPT="Summarize this system information." ~/llm_pipeline.sh
```

## Optimizing LLM Performance

```bash
# Monitor prompt and generation throughput
curl -s http://localhost:8080/metrics | \
  grep -E 'llamacpp:(prompt|predicted)_tokens_seconds'

# Key tuning parameters for CPU inference:
# --threads: Start near your physical core count, then benchmark on your hardware
# --ctx-size: Larger contexts use more memory; the default 0 uses the model's metadata
# --batch-size: Controls prompt-processing throughput and memory use; the default is 2048
# --mlock: Lock model in memory to prevent swapping

# Restart with optimized settings
podman stop llm-server && podman rm llm-server

podman run -d \
  --name llm-server \
  -p 8080:8080 \
  -v ~/ai-models:/models:ro \
  --cpus 8 --memory 10g \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/granite-3.3-8b-instruct-Q4_K_M.gguf \
  --alias local-model \
  --host 0.0.0.0 --port 8080 \
  --ctx-size 4096 --threads 8 --batch-size 512 --mlock --metrics
```

## Cleaning Up

```bash
# Stop and remove the LLM server
podman stop llm-server && podman rm llm-server
```

## Summary

Podman AI Lab makes it practical to run LLMs locally for a wide range of tasks including chat, code generation, and text summarization. Choosing the right model family and quantization level for your hardware is key to getting good results. By wrapping LLM calls in scripts, you can integrate local AI into your existing DevOps workflows. The OpenAI-compatible API works with many OpenAI-style clients, but compatibility is not identical across every endpoint or feature, and chat models work best when the loaded model has a supported chat template.
