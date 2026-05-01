# How to Enable GPU Support for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GPU, NVIDIA, Machine Learning

Description: Configure NVIDIA GPU access for Docker containers in Portainer for machine learning and compute workloads.

---

Advanced container configuration in Portainer exposes many of Docker's container runtime settings through the web UI, allowing you to configure specialized settings without writing raw Docker commands.

## Accessing Advanced Container Settings

When creating or editing a container in Portainer:
1. Navigate to **Containers > Add container**
2. Fill in basic settings (image, name, ports)
3. Expand the **Advanced container settings** section

## Device Mapping Configuration

```bash
# Equivalent docker run command for device mapping

docker run -d \
  --device /dev/video0:/dev/video0 \
  --device /dev/snd:/dev/snd \
  --name my-container \
  busybox:latest sleep 3600
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Runtime > Devices**

## Sysctls Configuration

```bash
# Equivalent docker run for sysctl settings
docker run -d \
  --sysctl net.ipv4.ip_forward=1 \
  --name high-connection-server \
  nginx:latest
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Runtime > Sysctls**

## GPU Configuration (NVIDIA)

```bash
# Portainer GPU support is currently available only on Docker Standalone
# environments and only for NVIDIA GPUs. Ensure NVIDIA Container Toolkit
# is installed on the host first.

# Equivalent docker run to validate GPU access
docker run --rm \
  --gpus all \
  nvidia/cuda \
  nvidia-smi
```

In Portainer UI: **Advanced container settings > Runtime & Resources > GPU**

## Linux Capabilities

```bash
# Drop all capabilities, add only what's needed (secure approach)
docker run -d \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --cap-add CHOWN \
  --name secure-container \
  busybox:latest sleep 3600
```

## Shared Memory Size

```bash
# Increase shared memory for applications like browsers or ML frameworks
docker run -d \
  --shm-size=2g \
  --name ml-worker \
  busybox:latest sleep 3600
```

## DNS Settings

```bash
# Set custom DNS for a container
docker run -d \
  --dns 1.1.1.1 \
  --dns 8.8.8.8 \
  --dns-search example.com \
  --name my-app \
  busybox:latest sleep 3600
```

## Privileged Mode (Use Sparingly)

```bash
# Only use privileged mode when absolutely necessary
# Privileged containers receive extended privileges and access to host devices
docker run -d \
  --privileged \
  --name system-tool \
  busybox:latest sleep 3600
```

---

*Monitor container resource usage and performance with [OneUptime](https://oneuptime.com).*
