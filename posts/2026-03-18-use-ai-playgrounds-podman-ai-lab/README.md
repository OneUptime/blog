# How to Use AI Playgrounds in Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Playground, LLM, Chatbot

Description: Learn how to use the AI Playground feature in Podman AI Lab to interactively test and compare AI models through a chat interface.

---

> The AI Playground lets you experiment with models interactively before integrating them into your applications.

Podman AI Lab includes a Playground feature that provides a chat-style interface for testing downloaded models. You can adjust parameters in real time, compare responses from different models, and experiment with system prompts to find the best configuration for your use case. This guide covers everything you need to know about using the Playground effectively.

---

## Prerequisites

```bash
# Ensure Podman is running and AI Lab is installed

podman version --format '{{.Client.Version}}'

# Verify you have at least one model downloaded in AI Lab
# Podman Desktop > AI Lab > Catalog > Downloaded

# Check that enough resources are allocated
podman machine inspect --format 'CPUs: {{.Resources.CPUs}}, RAM: {{.Resources.Memory}}MiB'
```

## Accessing the Playground

### Opening the Playground

1. Launch Podman Desktop.
2. Click the **AI Lab** icon in the left sidebar.
3. Select **Playgrounds** from the AI Lab menu.
4. Click **New Playground** to create a session.

### Selecting a Model

1. In the new Playground form, choose an **Inference Runtime**.
2. Choose from your downloaded models.
3. Click **Create playground**. AI Lab will create or use a model service for the selected model (this may take a moment).

## Configuring Playground Parameters

### System Prompt

The system prompt sets the behavior and personality of the model. Configure it at the top of the Playground interface.

```bash
# Example system prompts for different use cases:

# DevOps assistant
# "You are a senior DevOps engineer. Provide concise, practical answers
#  about containers, Kubernetes, CI/CD, and infrastructure automation.
#  Include relevant CLI commands in your responses."

# Code reviewer
# "You are an expert code reviewer. Analyze code for bugs, security
#  issues, and performance problems. Suggest specific improvements
#  with corrected code snippets."

# Technical writer
# "You are a technical documentation writer. Create clear, structured
#  documentation with examples. Use markdown formatting."
```

### Adjustable Parameters

```bash
# Temperature: Controls response randomness
# 0.0 - Deterministic, factual answers (best for code, facts)
# 0.3 - Slightly creative but still focused
# 0.7 - Balanced creativity (good default for chat)
# 1.0 - Maximum creativity (best for brainstorming)

# Max Tokens: Limits response length
# 128  - Short, concise answers
# 512  - Standard responses
# 2048 - Detailed explanations
# 4096 - Long-form content generation

# Top P (Nucleus Sampling): Controls diversity of token selection
# 0.1 - Very focused, predictable responses
# 0.5 - Moderately diverse
# 0.9 - Highly diverse token selection
```

## Chatting with Models

### Basic Conversation

Type your message in the input area and press Enter or click Send. The model will generate a response based on the system prompt and conversation history.

### Multi-Turn Conversations

The Playground maintains conversation context across multiple messages, allowing for follow-up questions and iterative refinement.

```bash
# Example multi-turn conversation flow:
# User: "What is a Podman pod?"
# Model: [explains pods]
# User: "How do I create one with three containers?"
# Model: [provides specific pod creation command using prior context]
# User: "Now show me how to generate a Kubernetes YAML from it"
# Model: [builds on the previous pod example]
```

## Comparing Models Side by Side

### Creating Multiple Playgrounds

```bash
# Open two Playground sessions with different models to compare:
# Playground 1: mistral-7b-instruct
# Playground 2: llama-3-8b-instruct

# Send the same prompt to both and compare:
# - Response quality and accuracy
# - Response length and detail
# - Inference speed
# - Tone and style differences
```

### Testing with Standardized Prompts

```bash
# Create a test prompt file to use consistently across models
cat << 'EOF' > test_prompts.txt
# Factual Question
What are the key differences between Podman and Docker?

# Code Generation
Write a bash script that backs up all Podman volumes to a tar archive.

# Reasoning Task
A container is using 90% CPU but the application inside reports low load. What could cause this?

# Creative Task
Write a haiku about container orchestration.
EOF

# Use each prompt in different Playground sessions to evaluate models
```

## Using the Playground API

```bash
# While a Playground session is active, you can also send requests via CLI
# Find the active inference server API URL
container_id=$(podman ps --filter "label=ai-lab-inference-server" -q | head -n 1)
api_url=$(podman inspect -f '{{ index .Config.Labels "api" }}' "$container_id")

# Send the same prompt you would type in the Playground
curl -s "$api_url/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a DevOps expert."},
      {"role": "user", "content": "How do I check container health status in Podman?"}
    ],
    "temperature": 0.7,
    "max_tokens": 512
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```

## Reviewing Playground Conversations

```bash
# Review conversation history from the Playground UI

# At the time of writing, Podman AI Lab does not provide a built-in
# Playground conversation export action

# This is useful for:
# - Documenting model evaluations
# - Sharing results with team members
# - Reproducing specific model behaviors
```

## Troubleshooting Playground Issues

```bash
# If the Playground shows "Model loading" for too long
# Check if the model server is actually running
podman ps --filter "label=ai-lab-inference-server" --format "table {{.Names}}\t{{.Status}}"

# Check inference server logs for errors
podman logs $(podman ps --filter "label=ai-lab-inference-server" -q | head -n 1) 2>&1 | tail -20

# If responses are very slow, reduce the context size
# Lower Max Tokens or start a new model service with a smaller context window

# If the model produces garbled output, try a different quantization
# Q4_K_M generally produces better results than Q4_0
```

## Summary

The AI Playground in Podman AI Lab is a powerful tool for interactively testing and evaluating AI models before integrating them into applications. By experimenting with system prompts, temperature settings, and different models, you can find the optimal configuration for your use case. Use side-by-side comparisons to evaluate model quality, and review conversations to document your findings. The Playground provides a fast feedback loop for AI experimentation without writing any code.
