# How to Implement Ollama for Local LLM Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ollama, LLM, Local Development, Machine Learning, AI

Description: Learn how to set up Ollama for running large language models locally, perfect for development, testing, and privacy-sensitive applications.

---

Running LLMs locally gives you complete control over your data and eliminates API costs. Ollama makes local LLM deployment simple by bundling models with their configurations into a single package. You can run models like Llama 2, Mistral, and CodeLlama with a single command.

## Why Ollama?

Ollama simplifies local LLM deployment by handling model downloads, GPU detection, memory management, and API serving automatically. Key benefits include:

- No API keys or cloud dependencies required
- Data never leaves your machine
- Fast iteration during development
- Support for many open-source models
- Simple model customization with Modelfiles

## Installing Ollama

Ollama supports macOS, Linux, and Windows.

```bash
# macOS using Homebrew
brew install ollama

# Linux one-liner install
curl -fsSL https://ollama.com/install.sh | sh

# Start the Ollama service
ollama serve

# Verify installation
ollama --version
```

On macOS, Ollama runs as a background service automatically. On Linux, you may want to set up systemd:

```bash
# Create systemd service file
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama LLM Server
After=network.target

[Service]
Type=simple
User=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_MODELS=/data/ollama/models"

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

## Running Your First Model

Pull and run a model with two commands:

```bash
# Download Mistral 7B (4.1GB)
ollama pull mistral

# Start an interactive chat session
ollama run mistral

# Or run with a one-shot prompt
ollama run mistral "Explain Docker containers in three sentences"
```

List available models and manage storage:

```bash
# List downloaded models
ollama list

# Show model details
ollama show mistral

# Remove a model to free space
ollama rm mistral
```

## Popular Models to Try

```bash
# Code-optimized models
ollama pull codellama:7b
ollama pull deepseek-coder:6.7b

# General purpose models
ollama pull llama2:13b
ollama pull mixtral:8x7b

# Small and fast models
ollama pull phi:2.7b
ollama pull tinyllama:1.1b

# Uncensored models for research
ollama pull nous-hermes2:10.7b
```

## Using the REST API

Ollama exposes a REST API on port 11434:

```python
import requests
import json

def generate_text(prompt, model="mistral"):
    """Generate text using Ollama API."""
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 256
            }
        }
    )
    return response.json()["response"]

# Simple generation
result = generate_text("What is Kubernetes?")
print(result)
```

For streaming responses:

```python
import requests
import json

def stream_generate(prompt, model="mistral"):
    """Stream tokens as they are generated."""
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": True
        },
        stream=True
    )

    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            if not data.get("done", False):
                print(data["response"], end="", flush=True)
    print()  # Final newline

stream_generate("Write a Python function to calculate fibonacci numbers:")
```

## Chat Conversations

The chat API maintains conversation history:

```python
import requests
import json

def chat(messages, model="mistral"):
    """Send a chat conversation to Ollama."""
    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": model,
            "messages": messages,
            "stream": False
        }
    )
    return response.json()["message"]["content"]

# Build a conversation
conversation = [
    {"role": "user", "content": "What is Docker?"},
]

response1 = chat(conversation)
print(f"Assistant: {response1}")

# Continue the conversation
conversation.append({"role": "assistant", "content": response1})
conversation.append({"role": "user", "content": "How is it different from virtual machines?"})

response2 = chat(conversation)
print(f"Assistant: {response2}")
```

## Creating Custom Models with Modelfiles

Modelfiles let you customize model behavior, add system prompts, and adjust parameters:

```dockerfile
# Modelfile for a DevOps assistant
FROM mistral

# Set the system prompt
SYSTEM """You are a DevOps expert assistant. You help with:
- Kubernetes and container orchestration
- CI/CD pipelines and automation
- Infrastructure as Code (Terraform, Pulumi)
- Monitoring and observability

Always provide practical examples and best practices.
Keep responses concise and actionable."""

# Adjust model parameters
PARAMETER temperature 0.3
PARAMETER num_ctx 4096
PARAMETER stop "<|end|>"
PARAMETER stop "Human:"
```

Build and run your custom model:

```bash
# Create the custom model
ollama create devops-assistant -f ./Modelfile

# Run your custom model
ollama run devops-assistant "How do I set up a Kubernetes liveness probe?"
```

## Embedding Generation

Generate embeddings for semantic search and RAG applications:

```python
import requests
import numpy as np

def get_embeddings(texts, model="nomic-embed-text"):
    """Generate embeddings for a list of texts."""
    embeddings = []
    for text in texts:
        response = requests.post(
            "http://localhost:11434/api/embeddings",
            json={
                "model": model,
                "prompt": text
            }
        )
        embeddings.append(response.json()["embedding"])
    return np.array(embeddings)

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# First, pull an embedding model
# ollama pull nomic-embed-text

# Generate embeddings
documents = [
    "Kubernetes is a container orchestration platform",
    "Docker packages applications into containers",
    "Python is a programming language for data science"
]
query = "How do I deploy containers?"

doc_embeddings = get_embeddings(documents)
query_embedding = get_embeddings([query])[0]

# Find most similar document
similarities = [cosine_similarity(query_embedding, doc_emb) for doc_emb in doc_embeddings]
best_idx = np.argmax(similarities)
print(f"Most relevant: {documents[best_idx]}")
print(f"Similarity: {similarities[best_idx]:.4f}")
```

## Running Ollama in Docker

Deploy Ollama in a container for reproducible environments:

```yaml
# docker-compose.yml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      # Persist downloaded models
      - ollama_models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped

  # Optional: Web UI for Ollama
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    ports:
      - "3000:8080"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    volumes:
      - open_webui_data:/app/backend/data
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama_models:
  open_webui_data:
```

Start the stack and pull models:

```bash
# Start containers
docker compose up -d

# Pull a model inside the container
docker exec ollama ollama pull mistral

# Test the API
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello!",
  "stream": false
}'
```

## GPU Configuration

Configure GPU usage for optimal performance:

```bash
# Check GPU detection
ollama run mistral --verbose 2>&1 | grep -i gpu

# Set GPU layers (more layers = more GPU memory used)
OLLAMA_NUM_GPU=35 ollama serve

# Use CPU only
OLLAMA_NUM_GPU=0 ollama serve

# Specify which GPU to use (multi-GPU systems)
CUDA_VISIBLE_DEVICES=0 ollama serve
```

## Integration with LangChain

Use Ollama with LangChain for building AI applications:

```python
from langchain_community.llms import Ollama
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

# Initialize Ollama LLM
llm = Ollama(
    model="mistral",
    base_url="http://localhost:11434",
    temperature=0.7
)

# Create a simple chain
template = """You are a helpful assistant. Answer the following question:

Question: {question}

Answer:"""

prompt = PromptTemplate(template=template, input_variables=["question"])
chain = LLMChain(llm=llm, prompt=prompt)

# Run the chain
response = chain.run(question="What are the benefits of microservices architecture?")
print(response)
```

## Performance Tips

1. **Use quantized models**: Models ending in `q4_0` or `q4_K_M` use less memory
2. **Adjust context window**: Smaller `num_ctx` uses less RAM
3. **Monitor memory usage**: Use `ollama ps` to see loaded models
4. **Unload unused models**: Ollama keeps models in memory; restart to free RAM
5. **Use SSD storage**: Model loading is much faster from SSD

```bash
# Check running models and memory usage
ollama ps

# Use a quantized variant
ollama pull llama2:7b-q4_0

# Run with reduced context
ollama run mistral --num-ctx 2048
```

---

Ollama removes the friction from local LLM development. Whether you are building a prototype, testing prompts, or running privacy-sensitive workloads, having models run on your own hardware provides flexibility that cloud APIs cannot match. Start with smaller models like Mistral or Phi, then scale up as your hardware allows.
