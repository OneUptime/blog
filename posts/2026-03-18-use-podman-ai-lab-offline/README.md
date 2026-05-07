# How to Use Podman AI Lab Offline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Offline, Air-Gapped, Privacy

Description: Learn how to set up and use Podman AI Lab in fully offline and air-gapped environments for maximum privacy and security.

---

> Running AI Lab offline ensures zero data leaves your machine, making it ideal for sensitive and classified workloads.

Many organizations operate in air-gapped or restricted network environments where internet access is not available. Podman AI Lab can keep working offline once the models and container images are pre-downloaded. This guide covers preparing your system for offline AI operations, transferring assets, and running everything without internet connectivity.

---

## Prerequisites

You need two machines for the initial setup:

- **Online machine**: Has internet access for downloading models and images.
- **Offline machine**: The target system with Podman Desktop, the Podman AI Lab extension, and Podman installed but no internet access.

This guide assumes Podman AI Lab is already installed on the offline machine before it is disconnected from the network.

```bash
# On the online machine, ensure Podman is installed

podman --version

# Create a staging directory for offline assets
mkdir -p ~/offline-ai-lab/{images,models}
```

## Step 1: Download Container Images on the Online Machine

```bash
# Pull the GGUF model-service image used for local model serving
podman pull quay.io/ramalama/ramalama-llama-server@sha256:293f66f2dfea8e21393dc03e898616b2a71f0a72a0f3bc5f936439130ada2648

# Save the image as a tar archive for transfer
podman save -o ~/offline-ai-lab/images/ramalama-llama-server.tar \
  quay.io/ramalama/ramalama-llama-server@sha256:293f66f2dfea8e21393dc03e898616b2a71f0a72a0f3bc5f936439130ada2648

# If you plan to use AI Lab recipes, pre-pull the specific recipe images from
# quay.io/ai-lab and save them the same way before going offline.

# Verify saved images
ls -lh ~/offline-ai-lab/images/
```

## Step 2: Download Models on the Online Machine

```bash
# Download model files in GGUF format
# Mistral 7B (general purpose)
curl -L -o ~/offline-ai-lab/models/mistral-7b-instruct-q4_k_m.gguf \
  "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf"

# CodeLlama 7B (code generation)
curl -L -o ~/offline-ai-lab/models/codellama-7b-instruct-q4_k_m.gguf \
  "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf"

# Verify downloads with checksums
(
  cd ~/offline-ai-lab/models
  sha256sum *.gguf > checksums.txt
  cat checksums.txt
)

# Check total size of offline assets
du -sh ~/offline-ai-lab/
```

## Step 3: Transfer Assets to the Offline Machine

```bash
# Option 1: USB drive transfer
# Create a compressed archive
tar czf ~/offline-ai-lab.tar.gz -C ~/ offline-ai-lab/

# Copy to USB drive
sudo mount /dev/sdb1 /mnt/usb
cp ~/offline-ai-lab.tar.gz /mnt/usb/
sudo umount /mnt/usb

# On the offline machine, extract from USB
sudo mount /dev/sdb1 /mnt/usb
tar xzf /mnt/usb/offline-ai-lab.tar.gz -C ~/
sudo umount /mnt/usb

# Option 2: SCP over local network (if available)
scp -r ~/offline-ai-lab/ user@offline-machine:~/

# Verify checksums on the offline machine
cd ~/offline-ai-lab/models
sha256sum -c checksums.txt
```

## Step 4: Load Images on the Offline Machine

```bash
# Load all container images from tar archives
for tarfile in ~/offline-ai-lab/images/*.tar; do
  echo "Loading $(basename "$tarfile")..."
  podman load -i "$tarfile"
done

# Verify images are available
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Copy models to a local directory you can mount into the model service
mkdir -p ~/ai-models
cp ~/offline-ai-lab/models/*.gguf ~/ai-models/
ls -lh ~/ai-models/
```

## Step 5: Run AI Lab Offline

At this point, AI Lab can import the GGUF file from `~/ai-models` without downloading it again, and the same local model-service runtime can also be started directly with Podman as shown below.

```bash
# Start the local GGUF model-service image used for offline serving
podman run -d \
  --name offline-ai-server \
  --security-opt label=disable \
  -p 127.0.0.1:8080:8000 \
  -v ~/ai-models:/models:ro \
  -e MODEL_PATH=/models/mistral-7b-instruct-q4_k_m.gguf \
  -e HOST=0.0.0.0 \
  -e PORT=8000 \
  quay.io/ramalama/ramalama-llama-server@sha256:293f66f2dfea8e21393dc03e898616b2a71f0a72a0f3bc5f936439130ada2648

# Wait for the server to become healthy
until curl -sf http://localhost:8080/health > /dev/null; do sleep 2; done

# Test locally (the server is only published on localhost)
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, are you running offline?"}
    ],
    "max_tokens": 100
  }' | python3 -m json.tool
```

## Creating an Offline Startup Script

```bash
cat << 'SCRIPT' > ~/start-offline-ai.sh
#!/bin/bash
# Start the offline AI inference server
# This script keeps the API published only on localhost

MODEL_DIR="${HOME}/ai-models"
MODEL_FILE="mistral-7b-instruct-q4_k_m.gguf"
CONTAINER_NAME="offline-ai-server"
PORT=8080

# Stop any existing instance
podman stop "$CONTAINER_NAME" 2>/dev/null
podman rm "$CONTAINER_NAME" 2>/dev/null

# Verify the model exists
if [ ! -f "${MODEL_DIR}/${MODEL_FILE}" ]; then
  echo "ERROR: Model not found at ${MODEL_DIR}/${MODEL_FILE}"
  exit 1
fi

# Start the server and publish it only on localhost
podman run -d \
  --name "$CONTAINER_NAME" \
  --security-opt label=disable \
  -p 127.0.0.1:${PORT}:8000 \
  -v "${MODEL_DIR}:/models:ro" \
  -e MODEL_PATH="/models/${MODEL_FILE}" \
  -e HOST=0.0.0.0 \
  -e PORT=8000 \
  quay.io/ramalama/ramalama-llama-server@sha256:293f66f2dfea8e21393dc03e898616b2a71f0a72a0f3bc5f936439130ada2648

echo "Offline AI server starting on http://127.0.0.1:${PORT} ..."
echo "Test: curl http://127.0.0.1:${PORT}/health"
SCRIPT
chmod +x ~/start-offline-ai.sh
```

## Verifying Local-Only Access

```bash
# Confirm the service is only published on the loopback interface
podman port offline-ai-server
# Should show: 8000/tcp -> 127.0.0.1:8080

# Confirm the server is healthy
curl -f http://localhost:8080/health

# Verify the API responds locally
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Ping"}],"max_tokens":8}' | python3 -m json.tool
```

## Summary

Podman AI Lab works fully offline once you pre-download the necessary container images and model files. The process involves downloading assets on an internet-connected machine, transferring them to the target system, and loading them into Podman before disconnecting the target machine. Publishing the model service only on `127.0.0.1` keeps the API local to the offline machine while still allowing local validation with `curl`. This setup is ideal for environments with strict security requirements where data must never leave the local machine.
