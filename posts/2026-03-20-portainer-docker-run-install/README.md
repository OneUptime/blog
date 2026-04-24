# How to Install Portainer Using Docker Run Command - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Installation, Docker-run, Quick-start

Description: A complete reference guide for installing Portainer CE using the docker run command, covering all common flags, options, and configurations.

## Overview

The `docker run` command is the quickest way to deploy Portainer CE. While Docker Compose provides better reproducibility, `docker run` is ideal for quick setups and is the most commonly documented approach. This guide provides a comprehensive reference for all Portainer `docker run` configurations.

## Minimal Installation

The simplest Portainer CE deployment:

```bash
docker volume create portainer_data

docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Access at `https://localhost:9443`.

## Full Production Command

```bash
# 8000: Optional Edge Agent tunnel port
# 9000: HTTP UI (legacy/optional)
# 9443: HTTPS UI
docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --hostname portainer \
  --restart=always \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Command Flags Explained

```bash
docker run \
  -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# -d: Run in detached (background) mode
# -p 8000:8000: Expose the optional Edge Agent tunnel port (host:container)
# -p 9443:9443: Expose HTTPS port (host:container)
# --name portainer: Container name for easy management
# --restart=always: Auto-restart policy. Other common values include unless-stopped and on-failure
# -v /var/run/docker.sock:/var/run/docker.sock: Docker socket access
# -v portainer_data:/data: Persistent data storage
# portainer/portainer-ce:latest: Image name and tag
```

## Custom Port Configuration

```bash
# Change HTTPS port to 8443 (if 9443 is in use)

docker run -d \
  -p 8000:8000 \
  -p 8443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
# Access at: https://localhost:8443
```

## Pin to Specific Version

```bash
# Use a specific Portainer version (recommended for production)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.40.0    # Specific version tag
```

## With Custom TLS Certificates

```bash
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/ssl/portainer:/certs:ro \
  portainer/portainer-ce:latest \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

## Disable HTTPS (HTTP Only - Dev/Test Only)

```bash
# WARNING: Only for development or internal trusted networks
docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-enabled \
  --bind-https ""
# Access at: http://localhost:9000
```

## With Admin Password Pre-configured

```bash
# Pre-configure admin password (useful for automated deployment)
# Generate bcrypt hash of your password:
docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'YourStrongPassword' | cut -d: -f2

# Use the hash in the run command:
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password='$2y$05$hash...'
```

## Limit Container Resources

```bash
# Limit the container to 256 MB of memory and half a CPU
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --memory="256m" \
  --cpus="0.5" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Useful Management Commands

```bash
# View Portainer logs
docker logs portainer
docker logs -f portainer    # Follow logs

# Check container status
docker inspect portainer
docker stats portainer

# Restart Portainer
docker restart portainer

# Update Portainer
docker pull portainer/portainer-ce:latest
docker stop portainer && docker rm portainer
# Run the original docker run command again

# Remove Portainer completely (keeps data volume)
docker stop portainer && docker rm portainer

# Remove everything including data (DESTRUCTIVE)
docker stop portainer && docker rm portainer
docker volume rm portainer_data
```

## Conclusion

The `docker run` command provides a quick, straightforward way to deploy Portainer CE. Understanding each flag helps you customize the deployment for your specific needs - from changing ports to adding TLS certificates to limiting resources. For production environments, consider pinning to a specific version tag rather than `latest` to ensure predictable deployments. When managing multiple server configurations, transitioning to Docker Compose provides better maintainability.
