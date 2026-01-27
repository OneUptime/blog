# How to Set Up Ollama for Local LLM Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ollama, LLM, AI, Local Inference, Machine Learning, Self-Hosted

Description: Learn how to set up Ollama for running large language models locally, including installation, model management, API usage, and integration patterns.

---

> Running LLMs locally gives you complete control over your data, zero API costs, and the ability to work offline. Ollama makes this accessible with a simple CLI and REST API.

## What is Ollama and Why Use It

Ollama is an open-source tool that lets you run large language models locally on your machine. It handles model downloading, optimization, and serving through a simple interface.

**Why run LLMs locally:**
- **Privacy** - Your data never leaves your machine
- **Cost** - No per-token API fees
- **Offline access** - Works without internet
- **Customization** - Fine-tune and create custom models
- **Low latency** - No network round trips

## Installation

### macOS

```bash
# Download and install via the official installer
curl -fsSL https://ollama.com/install.sh | sh

# Or use Homebrew
brew install ollama
```

### Linux

```bash
# One-line installer (works on most distributions)
curl -fsSL https://ollama.com/install.sh | sh

# The installer handles GPU driver detection automatically
```

### Windows

Download the installer from [ollama.com/download](https://ollama.com/download) and run it. Ollama runs as a background service on Windows.

### Docker

```bash
# Run Ollama in a container
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# With GPU support (NVIDIA)
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### Verify Installation

```bash
# Check Ollama is running
ollama --version

# The Ollama service should start automatically
# If not, start it manually:
ollama serve
```

## Pulling and Managing Models

### Download Models

```bash
# Pull a model from the Ollama library
ollama pull llama3.2

# Pull specific model sizes
ollama pull llama3.2:1b      # 1 billion parameters (smallest)
ollama pull llama3.2:3b      # 3 billion parameters
ollama pull llama3.2:8b      # 8 billion parameters

# Pull other popular models
ollama pull mistral          # Mistral 7B
ollama pull codellama        # Code-focused Llama
ollama pull phi3             # Microsoft Phi-3
ollama pull gemma2           # Google Gemma 2
ollama pull qwen2.5          # Alibaba Qwen 2.5
```

### List and Remove Models

```bash
# List downloaded models
ollama list

# Example output:
# NAME              ID            SIZE    MODIFIED
# llama3.2:latest   a6990ed6be41  2.0 GB  2 hours ago
# mistral:latest    f974a74358d6  4.1 GB  1 day ago

# Remove a model to free disk space
ollama rm mistral

# Show model details
ollama show llama3.2
```

### Model Storage Location

Models are stored in:
- **macOS**: `~/.ollama/models`
- **Linux**: `~/.ollama/models` or `/usr/share/ollama/.ollama/models`
- **Windows**: `C:\Users\<username>\.ollama\models`

## Running Models from CLI

### Basic Chat

```bash
# Start interactive chat
ollama run llama3.2

# Chat with a specific prompt
ollama run llama3.2 "Explain how DNS works in 3 sentences"

# Pipe input from a file
cat code.py | ollama run codellama "Review this code for bugs"
```

### CLI Options

```bash
# Set custom system prompt
ollama run llama3.2 --system "You are a helpful coding assistant"

# Multiline input mode (useful for code)
ollama run codellama --multiline

# Set context window size
ollama run llama3.2 --num-ctx 4096
```

## REST API for Applications

Ollama exposes a REST API on port 11434 by default.

### Generate Completions

```bash
# Simple completion request
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "What is Kubernetes?",
  "stream": false
}'

# Response:
# {
#   "model": "llama3.2",
#   "response": "Kubernetes is an open-source container orchestration platform...",
#   "done": true
# }
```

### Streaming Responses

```bash
# Stream responses token by token (default behavior)
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Write a haiku about servers"
}'

# Each line is a JSON object with partial response
# {"response":"Silent","done":false}
# {"response":" fans","done":false}
# ...
```

### Chat API with Message History

```bash
# Chat completion with conversation history
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {"role": "system", "content": "You are a DevOps expert."},
    {"role": "user", "content": "How do I check pod logs in Kubernetes?"},
    {"role": "assistant", "content": "Use kubectl logs <pod-name> to view logs."},
    {"role": "user", "content": "How do I follow logs in real-time?"}
  ],
  "stream": false
}'
```

### List Available Models via API

```bash
# Get list of local models
curl http://localhost:11434/api/tags

# Check if Ollama is running
curl http://localhost:11434/api/version
```

## Context and Conversation Management

Ollama maintains conversation context within a session. For multi-turn conversations, you must manage message history yourself.

### Context Window

```bash
# Set context length in API request
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Summarize this document...",
  "options": {
    "num_ctx": 8192
  }
}'
```

### Keep-Alive for Faster Response

```bash
# Keep model loaded in memory (default: 5 minutes)
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Hello",
  "keep_alive": "30m"
}'

# Unload model immediately
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "",
  "keep_alive": 0
}'
```

## Custom Models with Modelfile

Create custom models with specific parameters, system prompts, or fine-tuned weights.

### Basic Modelfile

```dockerfile
# Modelfile for a coding assistant
FROM llama3.2

# Set the system prompt
SYSTEM """You are an expert programmer. You write clean, efficient,
well-documented code. Always explain your reasoning."""

# Set default parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
```

### Create and Use Custom Model

```bash
# Create model from Modelfile
ollama create coding-assistant -f ./Modelfile

# Run your custom model
ollama run coding-assistant

# List custom models alongside base models
ollama list
```

### Advanced Modelfile Options

```dockerfile
# Modelfile with all common options
FROM mistral

SYSTEM """You are a security analyst. Analyze code for vulnerabilities."""

# Temperature: 0 = deterministic, 1 = creative
PARAMETER temperature 0.3

# Top-p sampling
PARAMETER top_p 0.9

# Context window size
PARAMETER num_ctx 8192

# Stop sequences
PARAMETER stop "<|end|>"
PARAMETER stop "Human:"

# Repeat penalty to reduce repetition
PARAMETER repeat_penalty 1.1
```

## GPU Acceleration

Ollama automatically detects and uses available GPUs.

### NVIDIA GPUs

```bash
# Check if GPU is detected
ollama run llama3.2 --verbose

# Look for: "using CUDA" in the output

# Verify NVIDIA drivers
nvidia-smi
```

### Apple Silicon (M1/M2/M3)

Ollama uses Metal for GPU acceleration on Mac automatically. No configuration needed.

### AMD GPUs (ROCm)

```bash
# Linux with ROCm support
# Ollama detects AMD GPUs automatically on supported systems

# Check ROCm installation
rocm-smi
```

### Force CPU Only

```bash
# Disable GPU for testing
CUDA_VISIBLE_DEVICES="" ollama serve
```

## Memory Requirements

Model size determines RAM/VRAM requirements.

| Model | Parameters | RAM Required | VRAM (GPU) |
|-------|------------|--------------|------------|
| Phi-3 Mini | 3.8B | 4 GB | 3 GB |
| Llama 3.2 | 3B | 4 GB | 3 GB |
| Mistral | 7B | 8 GB | 6 GB |
| Llama 3.2 | 8B | 10 GB | 8 GB |
| Llama 3.1 | 70B | 64 GB | 48 GB |

**Tips for memory management:**
- Use quantized models (Q4, Q5) for lower memory usage
- Reduce context window size with `num_ctx`
- Only load one model at a time on limited hardware
- Use `keep_alive: 0` to unload models after use

## Integration Examples

### Python with requests

```python
import requests
import json

def generate(prompt: str, model: str = "llama3.2") -> str:
    """Generate a response from Ollama."""
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json()["response"]

# Simple usage
answer = generate("What is observability in software systems?")
print(answer)
```

### Python with Streaming

```python
import requests
import json

def stream_generate(prompt: str, model: str = "llama3.2"):
    """Stream responses from Ollama token by token."""
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": True
        },
        stream=True
    )

    # Process streaming response
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            # Print each token as it arrives
            print(data.get("response", ""), end="", flush=True)
            if data.get("done"):
                break

# Stream a response
stream_generate("Explain microservices architecture")
```

### Python Chat with History

```python
import requests

class OllamaChat:
    """Manage multi-turn conversations with Ollama."""

    def __init__(self, model: str = "llama3.2", system_prompt: str = None):
        self.model = model
        self.messages = []
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def chat(self, user_message: str) -> str:
        """Send a message and get a response."""
        # Add user message to history
        self.messages.append({"role": "user", "content": user_message})

        # Call Ollama API
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": self.model,
                "messages": self.messages,
                "stream": False
            }
        )

        # Extract and store assistant response
        assistant_message = response.json()["message"]["content"]
        self.messages.append({"role": "assistant", "content": assistant_message})

        return assistant_message

    def clear_history(self):
        """Reset conversation history."""
        system_messages = [m for m in self.messages if m["role"] == "system"]
        self.messages = system_messages

# Usage
chat = OllamaChat(system_prompt="You are a helpful DevOps assistant.")
print(chat.chat("How do I restart a Kubernetes deployment?"))
print(chat.chat("What if I want zero downtime?"))
```

### cURL Examples for Scripts

```bash
#!/bin/bash
# Simple script to query Ollama

PROMPT="Explain the difference between containers and VMs"
MODEL="llama3.2"

# Non-streaming request
response=$(curl -s http://localhost:11434/api/generate -d "{
  \"model\": \"$MODEL\",
  \"prompt\": \"$PROMPT\",
  \"stream\": false
}")

# Extract just the response text using jq
echo "$response" | jq -r '.response'
```

### Integration with LangChain

```python
from langchain_community.llms import Ollama

# Initialize Ollama LLM
llm = Ollama(model="llama3.2", base_url="http://localhost:11434")

# Generate response
response = llm.invoke("What are the benefits of Infrastructure as Code?")
print(response)
```

## Best Practices Summary

1. **Start with smaller models** - Begin with 3B or 7B parameter models to test your setup before moving to larger ones.

2. **Use appropriate context sizes** - Larger context windows use more memory. Only increase `num_ctx` when needed.

3. **Create custom Modelfiles** - Define system prompts and parameters in Modelfiles for reproducible behavior.

4. **Manage model lifecycle** - Use `keep_alive` to control when models are loaded/unloaded from memory.

5. **Handle streaming for UX** - Stream responses in user-facing applications for better perceived performance.

6. **Monitor resource usage** - Watch RAM and VRAM usage, especially when running multiple requests.

7. **Use quantized models** - For limited hardware, use Q4 or Q5 quantized versions which use less memory with minimal quality loss.

8. **Version your Modelfiles** - Keep Modelfiles in version control alongside your application code.

---

Local LLM inference with Ollama opens up possibilities for privacy-conscious AI applications, offline development, and cost-effective experimentation. Whether you are building a coding assistant, analyzing logs, or creating chatbots, running models locally gives you full control over your AI infrastructure.

For monitoring your AI-powered applications and the infrastructure they run on, check out [OneUptime](https://oneuptime.com) - the open-source observability platform.
