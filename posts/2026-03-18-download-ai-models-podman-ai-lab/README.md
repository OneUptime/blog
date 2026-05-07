# How to Download AI Models with Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, LLM, Model Management

Description: Learn how to browse, download, and manage AI models using the Podman AI Lab extension for local inference.

---

> Downloading AI models locally means your data never leaves your machine.

Podman AI Lab provides a curated catalog of AI models that you can download and run entirely on your local hardware. From large language models to code assistants, the catalog offers a range of models optimized for different use cases and hardware configurations. This guide covers how to find, download, and manage models effectively.

---

## Prerequisites

Before downloading models, ensure the AI Lab extension is installed and your Podman machine has adequate resources.

```bash
# Verify Podman is running
podman info --format '{{.Version.Version}}'

# Check available disk space in the default AI Lab storage location on Linux
# For macOS and Windows, use the Models path shown in AI Lab settings.
AI_LAB_STORAGE="${HOME}/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab"
MODEL_DIR="${AI_LAB_STORAGE}/models"
df -h "$AI_LAB_STORAGE"

# Optional: increase the Podman machine disk for model services and applications
podman machine stop
podman machine set --disk-size 150
podman machine start
```

## Browsing the Model Catalog

### Using the Podman Desktop UI

Open Podman Desktop and navigate to the AI Lab section. Click on **Catalog** to see the curated list of models. Models are organized by category:

- **Language Models**: General-purpose LLMs for text generation and chat
- **Code Models**: Specialized models for code generation and completion
- **Instruction Models**: Fine-tuned models that follow instructions well

### Using the CLI to Inspect Local Model Files

```bash
# List running or stopped AI Lab inference server containers
podman ps -a --filter "label=ai-lab-inference-server" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Check what URL-based model files have been downloaded
find "$MODEL_DIR" -maxdepth 2 -type f -exec ls -lh {} \;

# Check total disk usage by models
du -sh "$MODEL_DIR"
```

## Downloading Models

### Popular Models to Start With

```bash
# The AI Lab catalog includes models in GGUF format optimized for CPU inference
# Common models available in the catalog:

# Granite models (IBM)
# - granite-4.0-micro-GGUF (small, fast, good for testing)
# - granite-4.0-tiny-GGUF (lightweight instruction model)
# - granite-3.3-8b-instruct-GGUF (larger instruction model)

# Qwen and Gemma models
# - qwen3-4b-GGUF
# - gemma-3n-E4B-it-GGUF

# Code-focused models
# - granite-8b-code-instruct-GGUF
```

### Download a Model via the UI

1. Open Podman Desktop and go to **AI Lab > Catalog**.
2. Browse the catalog or use the search bar to find a model.
3. Click the **Download** button next to your chosen model.
4. Monitor the download progress in the notification area.

### Verify Downloaded Models

```bash
# List downloaded model files and their sizes
find "$MODEL_DIR" -name "*.gguf" -exec ls -lh {} \;

# Check the integrity of downloaded GGUF model files
find "$MODEL_DIR" -name "*.gguf" -exec sha256sum {} \;
```

## Managing Model Storage

### Check Disk Usage

```bash
# See how much space each model is using
du -sh "$MODEL_DIR"/*

# Example output:
# 2.5G    /home/user/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab/models/hf.ibm-granite.granite-4.0-micro-GGUF
# 4.6G    /home/user/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab/models/hf.qwen.qwen3-4b-GGUF
# 5.0G    /home/user/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab/models/hf.ibm-granite.granite-8b-code-instruct
```

### Remove Unused Models

```bash
# Remove a specific URL-based model directory to free disk space
rm -rf "$MODEL_DIR/hf.ibm-granite.granite-4.0-micro-GGUF"

# Verify the model was removed
ls -la "$MODEL_DIR"
```

## Understanding Model Formats and Quantization

```bash
# Models in the catalog use GGUF format with various quantization levels
# Fewer quantization bits = smaller file, faster inference, lower quality
# More quantization bits = larger file, slower inference, better quality

# Common quantization levels:
# Q4_0 - 4-bit quantization, smallest, good for testing (~4GB for 7B params)
# Q4_K_M - 4-bit with k-quant, good balance (~4.5GB for 7B params)
# Q5_K_M - 5-bit with k-quant, better quality (~5GB for 7B params)
# Q8_0 - 8-bit quantization, larger and higher quality (~7-8GB for 7B params)

# Check your available RAM to choose the right quantization
podman machine inspect --format 'Memory: {{.Resources.Memory}}MB'

# Rule of thumb: model file size should be less than 80% of available RAM
# 8GB RAM  -> Q4_0 models (7B parameter models)
# 16GB RAM -> Q5_K_M or Q8_0 models (7B parameter models)
# 32GB RAM -> Q4_0 models (13B parameter models)
```

## Downloading Custom Models

### Import a Model from Hugging Face

```bash
# Download a GGUF model file from Hugging Face manually
mkdir -p "$HOME/Downloads/ai-models"
curl -L -o "$HOME/Downloads/ai-models/granite-3.3-8b-instruct-Q4_K_M.gguf" \
  "https://huggingface.co/ibm-granite/granite-3.3-8b-instruct-GGUF/resolve/main/granite-3.3-8b-instruct-Q4_K_M.gguf"

# Verify the download completed successfully
ls -lh "$HOME/Downloads/ai-models/granite-3.3-8b-instruct-Q4_K_M.gguf"

# Import the file from AI Lab > Catalog > Import Model
```

## Troubleshooting Download Issues

```bash
# If a download fails or gets stuck, clear partial URL downloads
find "$MODEL_DIR" -name "*.tmp" -delete

# Check network connectivity from your workstation
curl -I https://huggingface.co

# If disk space runs out during download
podman machine stop
podman machine set --disk-size 200
podman machine start

# Restart AI Lab inference server containers if a running service is stuck
for container in $(podman ps --filter "label=ai-lab-inference-server" -q); do
  podman restart "$container"
done
```

## Summary

Podman AI Lab simplifies the process of downloading and managing AI models for local inference. The curated catalog provides pre-optimized models in GGUF format with various quantization levels to match your hardware. By understanding model sizes and quantization trade-offs, you can choose the right model for your available resources. Keep an eye on disk space as models accumulate, and remove unused models to reclaim storage.
