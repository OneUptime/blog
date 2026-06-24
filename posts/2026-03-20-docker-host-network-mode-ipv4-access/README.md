# How to Use Docker Host Network Mode for Direct IPv4 Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, Host Network, IPv4, Performance, Container

Description: Configure Docker containers to use the host network mode, sharing the host's IPv4 stack directly for maximum performance and simplified port management, with security trade-offs explained.

## Introduction

On Linux, Docker's `host` network mode makes the container share the Docker host's network namespace directly. The container doesn't get its own IP address, and any ports it opens are exposed on the host without NAT or port mapping, which can reduce networking overhead and simplify firewall rules.

## Running a Container in Host Network Mode

```bash
# Run nginx using the host network - it listens on the host's port 80 directly

docker run -d \
  --name nginx-host \
  --network host \
  nginx:alpine

# No -p port mapping needed - nginx is directly on host:80
curl http://localhost:80
```

## Verifying the Container Uses Host Networking

```bash
# Confirm Docker attached the container to the host network
docker inspect -f '{{.HostConfig.NetworkMode}}' nginx-host
# Output: host

# Port 80 is listening on the host network stack
sudo ss -tlnp | grep ':80 '
# Shows a listener on port 80 on the host
```

## Docker Compose with Host Network

```yaml
# docker-compose.yml
services:
  app:
    image: my-high-performance-app:latest
    network_mode: host
    # No ports: section needed or allowed in host mode
```

Note: In Docker Compose, `ports:` mappings must not be used with `network_mode: host`; Compose returns a runtime error.

## Use Cases for Host Networking on Linux

| Use Case | Reason |
|---|---|
| High-performance network applications | No NAT overhead, direct socket access |
| Network monitoring tools (tcpdump, sniffers) | Access to all host interfaces |
| Services needing low-latency UDP | No port translation delay |
| Applications binding to a specific source IP | Container sees host's real IP |

## Security Trade-offs

Host network mode reduces container network isolation:
- Any port the container opens is directly on the host
- On Linux, the container can access all host network interfaces
- A compromised container has full host network access

Use host mode only for trusted, internal workloads where network performance is critical.

## Checking Available Host Interfaces from Container

```bash
# From within a host-networked container on Linux
docker exec nginx-host cat /proc/net/dev
# Lists the interfaces visible in the shared network namespace
```

## Linux vs. Docker Desktop (macOS/Windows)

Host network mode works natively on **Linux**. On Docker Desktop, host networking is supported in Docker Desktop 4.34 and later as an opt-in feature, but it is not equivalent to Linux host networking: it operates at layer 4, supports TCP and UDP only, does not provide direct access to the host's network interfaces, and only works with Linux containers.

## Conclusion

On Linux, `--network host` removes Docker NAT and connects the container directly to the host network stack. On Docker Desktop 4.34 and later, the feature is available with layer-4-only limitations. Use it for high-performance, low-latency applications or network tools. Be aware of the security implications and restrict use to trusted, well-monitored workloads.
