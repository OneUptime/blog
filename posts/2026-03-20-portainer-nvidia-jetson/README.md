# How to Install Portainer on NVIDIA Jetson for AI Edge Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NVIDIA Jetson, Edge AI, ARM, Docker

Description: Learn how to install Portainer on NVIDIA Jetson devices to manage AI and machine learning container deployments at the edge, with GPU access for inference workloads.

## Why Run Portainer on Jetson?

NVIDIA Jetson (Nano, Orin, AGX Xavier) devices are purpose-built for AI inference at the edge. Portainer on Jetson lets you:

- Deploy AI models as containers without SSH
- Manage multiple Jetson devices from a central Portainer Server
- Monitor container CPU and memory in Portainer, and use Jetson telemetry tools for GPU metrics
- Update models and applications remotely

## Jetson Architecture Notes

Jetson devices use ARM64 (aarch64) architecture. Portainer provides ARM64 images, and NVIDIA provides Jetson-compatible containers and wheels for frameworks like PyTorch and TensorFlow.

## Prerequisites

- NVIDIA JetPack 5.x or 6.x installed, with Docker and the NVIDIA Container Runtime configured
- Sufficient storage for Docker images (AI models can be large)
- Network connectivity

## Step 1: Verify Docker Is Running on Jetson

```bash
# Verify Docker is active
sudo systemctl status docker

# Check Docker supports NVIDIA runtime
docker info | grep -i runtime
# Should include: nvidia

# Test GPU access in Docker with a Jetson-compatible NGC image
# Use a PyTorch tag that matches your JetPack release
docker run --rm --runtime nvidia \
  nvcr.io/nvidia/pytorch:<tag-matching-your-jetpack-version>-py3 \
  python3 -c "import torch; print(torch.cuda.is_available())"
# Should print: True
```

## Step 2: Install Portainer

```bash
# Create volume for Portainer data
docker volume create portainer_data

# Install Portainer CE (ARM64 image is auto-selected)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Access Portainer at https://JETSON_IP:9443
```

## Step 3: Deploy a Jetson-Compatible AI Container via Portainer

In Portainer: **Stacks → Add Stack**

```yaml
version: "3.8"

services:
  ai-workload:
    image: nvcr.io/nvidia/pytorch:<tag-matching-your-jetpack-version>-py3
    command: ["tail", "-f", "/dev/null"]
    restart: unless-stopped
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=all
    volumes:
      - models:/models
      - /tmp:/tmp
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  models:
```

## Step 4: Install Portainer as an Edge Agent (Recommended for Multi-Device)

For managing multiple Jetson devices from a central Portainer Server:

```bash
# On the Jetson device, run the Edge Agent
# (get the exact command from Portainer Server > Environments > Add Edge Agent)
# Use the same Portainer tag as the server. If you are using Portainer's
# default self-signed certificate on port 9443, include EDGE_INSECURE_POLL=1.
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  --restart always \
  -e EDGE=1 \
  -e EDGE_ID=<your-edge-id> \
  -e EDGE_KEY=<your-edge-key> \
  -e EDGE_INSECURE_POLL=1 \
  --name portainer_edge_agent \
  portainer/agent:sts
```

## Monitoring Jetson GPU Metrics

Use NVIDIA's built-in `tegrastats` utility for live GPU, CPU, memory, and thermal metrics:

```bash
sudo tegrastats --interval 1000
```

## Jetson-Specific Considerations

| Consideration | Recommendation |
|--------------|----------------|
| Image size | AI images are 5-20GB; use an SSD |
| Power mode | Use the appropriate performance profile for your module, for example `sudo nvpmodel -m 0` for MAXN on many Jetson devices |
| Swap | Enable swap for memory-intensive models |
| Cooling | Ensure adequate cooling under sustained inference load |

## Conclusion

Portainer on NVIDIA Jetson provides a practical management layer for edge AI deployments. The combination of Portainer's container management with NVIDIA's GPU-accelerated Docker runtime lets you deploy, update, and monitor AI inference containers with the same workflows you use for any other containerized application.
