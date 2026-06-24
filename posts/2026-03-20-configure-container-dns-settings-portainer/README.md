# How to Configure Container DNS Settings in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, DNS, Networking, Container

Description: Set custom DNS servers and search domains for Docker containers in Portainer to control name resolution behavior.

---

Advanced container configuration in Portainer lets you configure many Docker container settings through the web UI, allowing you to manage specialized options without writing raw Docker commands.

## Accessing Advanced Container Settings

When creating a container in Portainer:
1. Navigate to **Containers > Add container**
2. Fill in basic settings (image, name, ports)
3. Expand the **Advanced container settings** section

## Device Mapping Configuration

```bash
# Equivalent docker run command for device mapping
# The host must have these device paths available

docker run -d \
  --device /dev/video0:/dev/video0 \
  --device /dev/snd \
  --name my-container \
  ubuntu:24.04 \
  tail -f /dev/null
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Devices**

## Sysctls Configuration

```bash
# Equivalent docker run for sysctl settings
docker run -d \
  --sysctl net.core.somaxconn=65535 \
  --sysctl net.ipv4.tcp_tw_reuse=1 \
  --name high-connection-server \
  nginx:latest
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Sysctls**

## GPU Configuration (NVIDIA)

```bash
# Portainer GPU support is only available on Docker Standalone
# environments and currently supports NVIDIA GPUs only.
# Ensure nvidia-container-toolkit is installed on the host first.

# Equivalent docker run
docker run -d \
  --gpus all \
  --name gpu-worker \
  ubuntu:24.04 \
  tail -f /dev/null
```

In Portainer UI: **Advanced container settings > Runtime & Resources > GPU**

## Linux Capabilities

```bash
# Example of explicitly controlling container capabilities
# Add only the capabilities your workload requires
docker run -d \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --cap-add CHOWN \
  --name secure-container \
  ubuntu:24.04 \
  tail -f /dev/null
```

In Portainer UI: **Advanced container settings > Capabilities**

## Shared Memory Size

```bash
# Increase shared memory for applications like browsers or ML frameworks
docker run -d \
  --shm-size=2g \
  --name app-worker \
  ubuntu:24.04 \
  tail -f /dev/null
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Shared memory size**

## DNS Settings

```bash
# Set custom DNS servers for a container
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
# Privileged containers are not securely sandboxed
docker run -d \
  --privileged \
  --name system-tool \
  ubuntu:24.04 \
  tail -f /dev/null
```

In Portainer UI: **Advanced container settings > Runtime & Resources > Privileged mode**

---

*Monitor container resource usage and performance with [OneUptime](https://oneuptime.com).*
