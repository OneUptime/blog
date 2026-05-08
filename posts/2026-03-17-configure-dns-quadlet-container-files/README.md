# How to Configure DNS in Quadlet Container Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, DNS, Networking

Description: Learn how to configure custom DNS servers and search domains in Podman Quadlet container files.

---

> Override default DNS settings in your Quadlet containers by configuring custom DNS servers and search domains through PodmanArgs.

Containers inherit DNS settings from the host by default, but sometimes you need to point containers to specific DNS servers for internal service discovery or to comply with network policies. Quadlet lets you configure DNS through PodmanArgs.

---

## Setting Custom DNS Servers

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=Application with custom DNS

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
PublishPort=3000:3000

# Use custom DNS servers
PodmanArgs=--dns=8.8.8.8
PodmanArgs=--dns=8.8.4.4

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Setting DNS Search Domains

```ini
[Container]
Image=docker.io/myorg/myapp:latest

# Set DNS search domains
PodmanArgs=--dns-search=example.com
PodmanArgs=--dns-search=internal.example.com
```

With this configuration, looking up `api` inside the container will also try `api.example.com` and `api.internal.example.com`.

## Setting DNS Options

```ini
[Container]
Image=docker.io/myorg/myapp:latest

# Set DNS options
PodmanArgs=--dns-option=ndots:5
PodmanArgs=--dns-option=timeout:2
PodmanArgs=--dns-option=attempts:3
```

## Combined DNS Configuration

```ini
# ~/.config/containers/systemd/internal-app.container
[Unit]
Description=Internal application with full DNS config

[Container]
Image=docker.io/myorg/internal-app:latest
Network=mynet
PublishPort=8080:8080

# Internal DNS server
PodmanArgs=--dns=10.0.0.53
# Fallback DNS
PodmanArgs=--dns=8.8.8.8
# Search domains
PodmanArgs=--dns-search=svc.cluster.local
PodmanArgs=--dns-search=internal.company.com
# DNS options
PodmanArgs=--dns-option=ndots:3

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using Container Network DNS

When containers are on a custom Podman network, DNS resolution between containers is automatic:

```ini
# ~/.config/containers/systemd/app.container
[Unit]
Description=App using network DNS

[Container]
Image=docker.io/myorg/app:latest
# Containers on this network resolve each other by name
Network=mynet

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Verify DNS Configuration

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start myapp.service

# Check DNS configuration inside the container
podman exec myapp cat /etc/resolv.conf

# Test DNS resolution
podman exec myapp nslookup example.com
```

## Summary

Quadlet containers can be configured with custom DNS servers, search domains, and resolver options using PodmanArgs. Use custom DNS for internal service discovery, network compliance requirements, or when the default host DNS does not suit your containerized workload. Containers on custom Podman networks get automatic DNS resolution by container name.
