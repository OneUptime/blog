# How to Set Container Hostname and Domain in Portainer - Set Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Hostname, Networking, Container

Description: Configure custom hostnames and domain names for Docker containers in Portainer for proper service discovery and identification.

---

Advanced container configuration in Portainer exposes many Docker container settings through the web UI, allowing you to configure specialized settings without writing raw Docker commands.

## Accessing Advanced Container Settings

When creating a container in Portainer:
1. Navigate to **Containers > Add container**
2. Fill in basic settings (image, name, ports)
3. Expand the **Advanced container settings** section

## Device Mapping Configuration

```bash
# Equivalent docker run command for device mapping

docker run -d \
  --device /dev/video0:/dev/video0 \
  --device /dev/snd \
  --name my-container \
  myimage:latest
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
# Ensure nvidia-container-toolkit is installed on the host first
# Then configure GPU access in Portainer

# Equivalent docker run
docker run -d \
  --gpus all \
  --name ml-training \
  tensorflow/tensorflow:latest-gpu \
  python train.py
```

In Portainer UI: **Advanced container settings > Runtime & Resources > GPU**

## Linux Capabilities

```bash
# Drop all capabilities, add only what's needed (secure approach)
docker run -d \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --cap-add CHOWN \
  --cap-add DAC_OVERRIDE \
  --cap-add SETGID \
  --cap-add SETUID \
  --name secure-nginx \
  nginx:latest
```

## Shared Memory Size

```bash
# Increase shared memory for applications like browsers or ML frameworks
docker run -d \
  --shm-size=2g \
  --name ml-worker \
  pytorch/pytorch:latest
```

## Hostname, Domain, and DNS Settings

```bash
# Set a custom hostname, domain name, and DNS for a container
docker run -d \
  --hostname app01 \
  --domainname example.com \
  --dns 1.1.1.1 \
  --dns 8.8.8.8 \
  --dns-search example.com \
  --name my-app \
  myapp:latest
```

In Portainer UI: **Advanced container settings > Network > Hostname / Domain Name / Primary DNS Server / Secondary DNS Server**

## Privileged Mode (Use Sparingly)

```bash
# Only use privileged mode when absolutely necessary
# Privileged containers have broad host-level access
docker run -d \
  --privileged \
  --name system-tool \
  systool:latest
```

---

*Monitor container resource usage and performance with [OneUptime](https://oneuptime.com).*
