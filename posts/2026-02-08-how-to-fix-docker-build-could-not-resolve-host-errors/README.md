# How to Fix Docker Build 'Could Not Resolve Host' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, build, dns, could not resolve host, troubleshooting, networking, dockerfile

Description: Fix Docker build failures caused by DNS resolution errors with practical solutions for daemon configuration, build arguments, and network settings.

---

You run `docker build` and everything goes smoothly until a `RUN` instruction tries to download something from the internet. Then the build crashes with a message like `Could not resolve host: registry.npmjs.org`. Your host machine can reach the internet just fine, but the build context cannot resolve any hostnames. This specific failure during builds, rather than at runtime, trips up a lot of developers.

Let's look at why DNS resolution breaks during Docker builds and how to fix it.

## Why Build-Time DNS Is Different

When Docker builds an image, each `RUN` instruction executes inside a temporary container. These temporary containers inherit their DNS configuration from the Docker daemon, not from the `--dns` flag you might pass to `docker run`. This means DNS settings that work for running containers may not apply during builds.

The build error typically looks like this:

```
Step 5/12 : RUN apt-get update
 ---> Running in a1b2c3d4e5f6
Err:1 http://archive.ubuntu.com/ubuntu focal InRelease
  Could not resolve 'archive.ubuntu.com'
E: Failed to fetch http://archive.ubuntu.com/ubuntu/dists/focal/InRelease  Could not resolve 'archive.ubuntu.com'
```

Or for Node.js projects:

```
Step 6/12 : RUN npm install
npm ERR! code EAI_AGAIN
npm ERR! errno EAI_AGAIN
npm ERR! request to https://registry.npmjs.org/express failed, reason: getaddrinfo EAI_AGAIN registry.npmjs.org
```

## Fix 1: Configure DNS at the Daemon Level

The most reliable fix is to set DNS servers in Docker's daemon configuration. This affects all containers, including build containers.

```bash
# Edit the Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

Add public DNS servers:

```json
{
    "dns": ["8.8.8.8", "8.8.4.4"]
}
```

Restart Docker:

```bash
# Restart Docker daemon to apply DNS changes
sudo systemctl restart docker
```

Test the fix by running a quick build:

```dockerfile
# Dockerfile to test DNS resolution during build
FROM alpine:latest
RUN apk update && echo "DNS works!"
```

```bash
# Build the test image
docker build -t dns-test .
```

## Fix 2: Use the --network Flag During Build

Docker BuildKit supports specifying the network mode for builds. Using `--network=host` makes the build container use the host's network stack directly, including its DNS configuration.

```bash
# Build using the host's network (bypasses Docker's DNS entirely)
DOCKER_BUILDKIT=1 docker build --network=host -t myimage .
```

In Docker Compose with BuildKit:

```yaml
# docker-compose.yml using host network for builds
services:
  app:
    build:
      context: .
      network: host
    image: myapp:latest
```

The `--network=host` approach bypasses Docker's internal DNS entirely and uses whatever DNS the host machine is configured with. This works well for development, but be aware that it reduces network isolation during the build.

## Fix 3: Handle systemd-resolved on Ubuntu

Ubuntu systems running systemd-resolved set `/etc/resolv.conf` to point at `127.0.0.53`. This loopback address works on the host but is unreachable from Docker build containers.

Check if this is your situation:

```bash
# See what DNS the Docker daemon is passing to containers
docker run --rm alpine cat /etc/resolv.conf
```

If you see `nameserver 127.0.0.53`, that confirms the problem. You have two options.

Option A: Point Docker to a real DNS server via daemon.json (shown in Fix 1).

Option B: Configure systemd-resolved to listen on the Docker bridge interface:

```bash
# Find Docker's bridge IP
ip addr show docker0 | grep inet

# Edit resolved.conf to also listen on Docker's bridge
sudo mkdir -p /etc/systemd/resolved.conf.d/
```

Create a drop-in configuration:

```ini
# /etc/systemd/resolved.conf.d/docker.conf
# Allow the Docker bridge to reach systemd-resolved
[Resolve]
DNSStubListenerExtra=172.17.0.1
```

```bash
# Restart systemd-resolved to apply
sudo systemctl restart systemd-resolved
```

Then configure Docker to use the bridge IP as its DNS server:

```json
{
    "dns": ["172.17.0.1"]
}
```

## Fix 4: Build Behind a Corporate Proxy

Corporate networks often require a proxy for external access. Docker builds do not inherit your shell's proxy environment variables automatically.

Pass proxy settings as build arguments:

```dockerfile
# Dockerfile with proxy-aware package installation
FROM ubuntu:22.04

# These ARGs will be set during build
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# Set environment variables for the package manager
ENV http_proxy=${HTTP_PROXY}
ENV https_proxy=${HTTPS_PROXY}
ENV no_proxy=${NO_PROXY}

RUN apt-get update && apt-get install -y curl
```

```bash
# Build with proxy settings
docker build \
  --build-arg HTTP_PROXY=http://proxy.company.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.company.com:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1,.company.com \
  -t myimage .
```

Alternatively, configure the proxy at the Docker daemon level so it applies to all builds:

```json
{
    "dns": ["8.8.8.8", "8.8.4.4"],
    "proxies": {
        "http-proxy": "http://proxy.company.com:8080",
        "https-proxy": "http://proxy.company.com:8080",
        "no-proxy": "localhost,127.0.0.1,.company.com"
    }
}
```

## Fix 5: Firewall and iptables Issues

Docker needs specific iptables rules to allow build containers to reach the internet. If your firewall rules were modified or flushed, DNS traffic may be blocked.

```bash
# Check if Docker's iptables rules exist
sudo iptables -L DOCKER -n 2>/dev/null
sudo iptables -L DOCKER-USER -n 2>/dev/null

# Test if outbound DNS works from a container
docker run --rm alpine nslookup google.com 8.8.8.8
```

If DNS works with an explicit server (8.8.8.8) but not with Docker's automatic DNS, the problem is in the daemon configuration. If DNS does not work at all, check your firewall:

```bash
# Allow outbound DNS through the firewall
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Restart Docker to recreate its iptables rules
sudo systemctl restart docker
```

## Fix 6: Multi-Stage Builds with Network Issues

In multi-stage builds, each stage may need internet access. If only certain stages fail, the issue might be related to the base image's DNS configuration.

```dockerfile
# Multi-stage Dockerfile with explicit DNS workaround
FROM node:18-alpine AS builder

# If DNS is flaky, add a resolv.conf override
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

Note: Overriding `/etc/resolv.conf` inside the Dockerfile is a workaround, not a proper fix. It is better to fix the DNS at the daemon level.

## Debugging Build DNS Problems

When you need to pinpoint exactly where DNS fails during a build, add diagnostic steps:

```dockerfile
# Diagnostic Dockerfile for DNS troubleshooting
FROM ubuntu:22.04

# Check DNS configuration
RUN cat /etc/resolv.conf

# Test DNS resolution
RUN apt-get update || (echo "apt-get failed, testing DNS manually..." && \
    cat /etc/resolv.conf && \
    getent hosts archive.ubuntu.com || echo "DNS resolution failed" && \
    ping -c 1 8.8.8.8 || echo "No network connectivity")
```

Run with verbose output:

```bash
# Build with progress output to see DNS diagnostic info
docker build --progress=plain --no-cache -t dns-debug .
```

## Quick Reference

| Symptom | Fix |
|---------|-----|
| Cannot resolve any host during build | Set dns in daemon.json |
| Works on host, fails in build | systemd-resolved issue, use daemon.json dns |
| Works in some networks | Corporate proxy, pass build args |
| Intermittent failures | Add DNS retry options or use --network=host |
| Works with docker run, fails with docker build | Use --network=host for build or fix daemon dns |

## Summary

DNS failures during Docker builds happen because build containers get their DNS from the Docker daemon, not from your shell or host configuration. The most reliable fix is adding `"dns": ["8.8.8.8", "8.8.4.4"]` to `/etc/docker/daemon.json`. For corporate environments, also configure proxy settings at the daemon level. If you need a quick workaround, `docker build --network=host` will use your host's DNS directly. Always test your DNS configuration after changes by running a simple build that fetches packages from the internet.
