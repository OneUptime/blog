# How to Fix GPU Enabling Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, GPU, Docker, NVIDIA, CUDA, Container Configuration

Description: Learn how to fix GPU enabling errors in Portainer when deploying containers that require NVIDIA or AMD GPU access, including runtime configuration and capability settings.

---

GPU access in Portainer's Docker container UI only supports NVIDIA GPUs on Docker Standalone environments and requires the NVIDIA Container Toolkit on the host. For AMD GPUs, use manual device mappings in a stack or container configuration and ensure the host has ROCm-compatible drivers.

## Prerequisites Check

```bash
# Verify NVIDIA drivers are installed

nvidia-smi

# Verify NVIDIA Container Toolkit is installed
nvidia-ctk --version

# Verify Docker can use the NVIDIA runtime
docker run --rm --gpus all ubuntu nvidia-smi
```

## Error: "could not select device driver with capabilities: [[gpu]]"

This usually means the NVIDIA Container Toolkit is not installed or Docker is not configured to use it:

```bash
# Install NVIDIA Container Toolkit on Ubuntu
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use the NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Error: "unknown runtime specified nvidia"

The NVIDIA runtime is not registered with Docker:

```bash
# Check /etc/docker/daemon.json
cat /etc/docker/daemon.json
```

```json
{
  "runtimes": {
    "nvidia": {
      "path": "/usr/bin/nvidia-container-runtime",
      "runtimeArgs": []
    }
  }
}
```

```bash
# If missing, re-run the NVIDIA runtime configuration and restart Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Configuring GPU in Portainer

In Portainer's container creation UI, GPU support is only available for NVIDIA GPUs on Docker Standalone environments. For stack-based deployments, use Docker Compose GPU reservations:

```yaml
services:
  gpu-app:
    image: nvidia/cuda:12.9.0-base-ubuntu22.04
    # Request all available GPUs
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    command: nvidia-smi
```

## AMD GPU Support

For AMD GPUs, Portainer's GPU toggle does not apply. Map the required devices manually and ensure the host has ROCm-compatible drivers:

```yaml
services:
  rocm-app:
    image: rocm/rocm-terminal:latest
    devices:
      - /dev/kfd:/dev/kfd
      - /dev/dri:/dev/dri
```
