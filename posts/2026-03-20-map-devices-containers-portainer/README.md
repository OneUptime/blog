# How to Map Devices to Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Device, GPU, Hardware

Description: Learn how to map host devices such as USB, GPU, or serial ports to Docker containers using Portainer's device mapping configuration.

---

Advanced container configuration in Portainer exposes a broad range of Docker runtime options through the web UI, allowing you to configure specialized settings without writing raw Docker commands.

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
  ubuntu:24.04 sleep infinity
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Devices**

## Sysctls Configuration

```bash
# Equivalent docker run for sysctl settings
docker run -d \
  --sysctl net.core.somaxconn=65535 \
  --sysctl net.ipv4.ip_forward=1 \
  --name high-connection-server \
  nginx:latest
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Sysctls**

## GPU Configuration (NVIDIA)

In Portainer, GPU support for containers is only available on Docker Standalone environments and only supports NVIDIA GPUs.

```bash
# Ensure nvidia-container-toolkit is installed on the host first
# Then configure GPU access in Portainer

# Equivalent docker run
docker run --rm \
  --gpus all \
  tensorflow/tensorflow:latest-gpu \
  python -c "import tensorflow as tf; print(tf.reduce_sum(tf.random.normal([1000, 1000])))"
```

In Portainer UI: **Advanced container settings > Runtime & Resources > GPU**

## Linux Capabilities

```bash
# Drop all capabilities, add only what's needed (secure approach)
docker run -d \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --name secure-web \
  python:3.12-slim \
  python -m http.server 80
```

## Shared Memory Size

```bash
# Increase shared memory for applications like browsers or ML frameworks
docker run -d \
  --shm-size=2g \
  --name ml-worker \
  ubuntu:24.04 sleep infinity
```

## DNS Settings

```bash
# Set custom DNS for a container
docker run -d \
  --dns 1.1.1.1 \
  --dns 8.8.8.8 \
  --name my-app \
  nginx:latest
```

In Portainer UI: **Advanced container settings > Network > Primary DNS Server / Secondary DNS Server**

## Privileged Mode (Use Sparingly)

```bash
# Only use privileged mode when absolutely necessary
# Privileged containers have full host access
docker run -d \
  --privileged \
  --name system-tool \
  ubuntu:24.04 sleep infinity
```

---

*Monitor container resource usage and performance with [OneUptime](https://oneuptime.com).*
