# How to Configure Docker Registry Access over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Registry, Container Registry, Image Pull

Description: Configure Docker to pull and push images from container registries over IPv6, run a private Docker registry accessible via IPv6, and troubleshoot registry connectivity over IPv6 connections.

## Introduction

Docker can pull and push images over IPv6 when the registry host resolves to an IPv6 address or when you specify an IPv6 address directly. Running a private registry on an IPv6 address requires binding the registry to an IPv6 interface. Docker's `ipv6` daemon setting is for Docker-managed container networking on Linux, and the registry address in image names can include IPv6 addresses using bracket notation.

## Pull Images from IPv6 Registry

```bash
# Pull from a registry accessible via IPv6

# Registry at 2001:db8::1 on port 5000
docker pull [2001:db8::1]:5000/myapp:latest

# Pull from a registry with a hostname that resolves to IPv6
docker pull registry.example.com:5000/myapp:latest
# (assumes registry.example.com has an AAAA record and the host can reach it over IPv6)

# Test the registry endpoint over IPv6 directly
curl -6 https://registry.example.com:5000/v2/
# Use http:// only if the registry is configured as insecure
```

## Run a Private Registry Bound to IPv6

```bash
# Run a private registry listening on IPv6
docker run -d \
    --name registry \
    -p "[::]:5000:5000" \
    -v /data/registry:/var/lib/registry \
    -e REGISTRY_HTTP_ADDR="[::]:5000" \
    registry:3

# Verify registry is listening on IPv6
ss -tlnp6 | grep 5000

# Test registry access over IPv6
curl -6 http://[::1]:5000/v2/
# {"errors":[{"code":"UNAUTHORIZED"...}]}  or {}

# For a plain HTTP registry, add [::1]:5000 to insecure-registries before pushing or pulling
# Push an image to local IPv6 registry
docker tag nginx:latest [::1]:5000/mynginx:latest
docker push [::1]:5000/mynginx:latest

# Pull from local IPv6 registry
docker pull [::1]:5000/mynginx:latest
```

## Registry with TLS and IPv6

```yaml
# compose.yaml for private registry with TLS

services:
  registry:
    image: registry:3
    ports:
      - "[::]:443:443"
    environment:
      REGISTRY_HTTP_ADDR: "[::]:443"
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /var/lib/registry
    volumes:
      - ./certs:/certs
      - registry-data:/var/lib/registry

volumes:
  registry-data:
```

```bash
# Generate self-signed cert for IPv6 registry
# The cert must include the IPv6 address as a SAN
openssl req -newkey rsa:4096 -nodes \
    -keyout registry.key -x509 \
    -days 365 \
    -out registry.crt \
    -subj "/CN=registry.internal" \
    -addext "subjectAltName=IP:2001:db8::1,DNS:registry.internal"

# Trust the cert on Docker clients
# Use the same registry host name in certs.d that you use in image names
sudo mkdir -p /etc/docker/certs.d/registry.internal
sudo cp registry.crt /etc/docker/certs.d/registry.internal/ca.crt
```

## Configure insecure-registries for IPv6

```json
{
  "insecure-registries": [
    "[::1]:5000",
    "[2001:db8::1]:5000",
    "[fd00::1]:5000"
  ]
}
```

```bash
sudo systemctl restart docker

# Verify insecure registries
docker info | grep -A5 "Insecure"

# Now you can push/pull from the IPv6 registry without TLS
docker pull [2001:db8::1]:5000/myimage:latest
```

## Conclusion

Docker registry access over IPv6 uses bracket notation for IPv6 addresses in image names, e.g., `[2001:db8::1]:5000/image:tag`. Run a private registry bound to IPv6 by setting `REGISTRY_HTTP_ADDR=[::]:5000`. Configure `insecure-registries` in `daemon.json` for HTTP-only IPv6 registries. For TLS-secured registries, generate certificates with IPv6 Subject Alternative Names when clients connect by literal address, and trust the CA in `/etc/docker/certs.d/<registry-host>/` or `/etc/docker/certs.d/<registry-host>:<port>/` for non-default ports.
