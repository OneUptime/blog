# How to Use Docker with IPv6 Proxy Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Proxy, HTTP Proxy, HTTPS Proxy, Environment Variable

Description: Configure Docker containers and the Docker daemon to use an HTTP/HTTPS proxy for IPv6 outbound connections, set proxy environment variables for builds and runtime, and handle proxy bypass for...

## Introduction

Docker supports HTTP/HTTPS proxy configuration for both the Docker daemon (for pulling images) and for containers at runtime. When your environment requires outbound traffic to go through a proxy, you must configure proxy settings that support IPv6 connections. IPv6 proxy configuration follows the same environment variable approach as IPv4, but requires the proxy server to accept IPv6 connections and proper `NO_PROXY` settings to bypass local IPv6 ranges.

## Configure Proxy for Docker Daemon

Method 1: `daemon.json` (Docker 23.0+)

```json
{
  "proxies": {
    "http-proxy": "http://proxy.example.com:3128",
    "https-proxy": "http://proxy.example.com:3128",
    "no-proxy": "localhost,127.0.0.1,::1,fd00::/8,192.168.0.0/16"
  }
}
```

After saving `/etc/docker/daemon.json`, restart Docker:

```bash
sudo systemctl restart docker
```

```bash
# Method 2: systemd drop-in override

sudo mkdir -p /etc/systemd/system/docker.service.d/
sudo tee /etc/systemd/system/docker.service.d/proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,::1,fd00::/8,10.0.0.0/8"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify proxy settings applied
sudo systemctl show --property=Environment docker
```

## Proxy Environment Variables for Containers

```bash
# Pass proxy settings to a container at runtime
docker run --rm \
    -e HTTP_PROXY=http://proxy.example.com:3128 \
    -e HTTPS_PROXY=http://proxy.example.com:3128 \
    -e NO_PROXY="localhost,::1,fd00::/8" \
    alpine sh -c 'env | grep -i _PROXY'

# For lowercase variants (some tools prefer lowercase)
docker run --rm \
    -e http_proxy=http://proxy.example.com:3128 \
    -e https_proxy=http://proxy.example.com:3128 \
    -e no_proxy="localhost,::1,fd00::/8" \
    alpine sh -c 'env | grep -i _PROXY'
```

## Docker Compose with Proxy Settings

```yaml
# compose.yaml

x-proxy-env: &proxy-env
  HTTP_PROXY: "http://proxy.example.com:3128"
  HTTPS_PROXY: "http://proxy.example.com:3128"
  NO_PROXY: "localhost,127.0.0.1,::1,fd00::/8,internal.example.com"
  http_proxy: "http://proxy.example.com:3128"
  https_proxy: "http://proxy.example.com:3128"
  no_proxy: "localhost,127.0.0.1,::1,fd00::/8,internal.example.com"

services:
  web:
    image: nginx:latest
    environment:
      <<: *proxy-env

  app:
    image: myapp:latest
    environment:
      <<: *proxy-env
      # Service-specific override
      NO_PROXY: "localhost,::1,fd00::/8,db"
```

## Proxy for Docker Builds (Build-Time)

```dockerfile
# Dockerfile - build args are enough for proxy configuration
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl
```

```bash
# Build with proxy arguments
docker build \
    --build-arg HTTP_PROXY=http://proxy.example.com:3128 \
    --build-arg HTTPS_PROXY=http://proxy.example.com:3128 \
    --build-arg NO_PROXY="localhost,::1,fd00::/8" \
    -t myapp:latest .
```

## IPv6 NO_PROXY Configuration

```bash
# Include IPv6 ranges in NO_PROXY to bypass proxy for local/container traffic
# Include:
# - ::1 (IPv6 loopback)
# - fd00::/8 (ULA for Docker networks)
# - Your specific container subnets

# Example comprehensive NO_PROXY
NO_PROXY_VALUE="localhost,127.0.0.1,::1,fd00::/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,internal.example.com,.internal"

docker run --rm \
    -e NO_PROXY="$NO_PROXY_VALUE" \
    -e HTTPS_PROXY=http://proxy.example.com:3128 \
    curlimages/curl -v http://[fd00::10]/api/
# Should connect directly (bypassing proxy) for fd00::10
```

## Conclusion

Configure Docker daemon proxy settings in `/etc/docker/daemon.json` under `"proxies"` (Docker 23+) or via systemd environment variables. Pass `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` to containers through `-e` flags or `environment` in Compose. Include IPv6 loopback (`::1`), ULA ranges (`fd00::/8`), and your Docker network subnets in `NO_PROXY` to prevent proxying internal container-to-container traffic. Both uppercase and lowercase proxy environment variable names are supported by different tools - provide both forms for maximum compatibility.
