# How to Run Ollama for Local LLM Inference on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ollama, LLM, AI, Inference

Description: Install and run Ollama on RHEL to serve large language models locally for inference, with GPU acceleration and an easy-to-use CLI and API.

---

Ollama makes it simple to run large language models locally on RHEL. It handles model downloading, GPU acceleration, and provides both a CLI and REST API for interacting with models.

## Install Ollama

```bash
# Download and install Ollama using the official install script
curl -fsSL https://ollama.com/install.sh | sh

# Or install manually
sudo curl -L https://ollama.com/download/ollama-linux-amd64 -o /usr/local/bin/ollama
sudo chmod +x /usr/local/bin/ollama

# Verify the installation
ollama --version
```

## Set Up as a systemd Service

The install script usually creates this, but if it does not:

```bash
# Create a dedicated user
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Create the systemd service file
sudo tee /etc/systemd/system/ollama.service << 'EOF'
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="HOME=/usr/share/ollama"

[Install]
WantedBy=default.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable --now ollama
```

## Download and Run Models

```bash
# Pull a model (downloads automatically)
ollama pull llama3.1:8b

# List downloaded models
ollama list

# Run a model interactively
ollama run llama3.1:8b

# Send a prompt directly
ollama run llama3.1:8b "Explain SELinux in two sentences"
```

## Use the REST API

```bash
# Generate a response via the API
curl http://localhost:11434/api/generate -d '{
    "model": "llama3.1:8b",
    "prompt": "How do I check memory usage on RHEL?",
    "stream": false
}'

# Chat API (with conversation history)
curl http://localhost:11434/api/chat -d '{
    "model": "llama3.1:8b",
    "messages": [
        {"role": "user", "content": "What is firewalld?"}
    ],
    "stream": false
}'

# List available models via API
curl http://localhost:11434/api/tags
```

## GPU Configuration

Ollama automatically detects NVIDIA GPUs with CUDA drivers:

```bash
# Verify GPU is being used
ollama run llama3.1:8b "test" &
nvidia-smi
# You should see ollama using GPU memory

# For CPU-only inference (if no GPU)
OLLAMA_NUM_GPU=0 ollama serve
```

## Custom Model Configuration

Create a Modelfile to customize behavior:

```bash
# Create a custom model configuration
cat > ~/Modelfile << 'EOF'
FROM llama3.1:8b

# Set the system prompt
SYSTEM You are a RHEL system administrator assistant. Provide practical commands and configurations.

# Set parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
EOF

# Create the custom model
ollama create rhel-assistant -f ~/Modelfile

# Run the custom model
ollama run rhel-assistant "How do I set up a cron job?"
```

## Configure Remote Access

```bash
# Allow remote connections
sudo systemctl edit ollama

# Add the environment variable
# [Service]
# Environment="OLLAMA_HOST=0.0.0.0"

sudo systemctl restart ollama

# Open the firewall
sudo firewall-cmd --permanent --add-port=11434/tcp
sudo firewall-cmd --reload
```

Ollama provides a straightforward way to run LLMs locally on RHEL with minimal configuration, making it ideal for development, testing, and private inference use cases.
