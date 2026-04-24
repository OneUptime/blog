# How to Disable HTTP Access in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, HTTP, HTTPS, Hardening

Description: A guide to disabling HTTP access in Portainer to enforce encrypted HTTPS-only connections.

## Overview

Portainer's HTTP port (9000) transmits credentials and session tokens in plaintext, making it a security risk in production environments. This guide covers how to completely disable HTTP access in Portainer across all deployment types.

## Prerequisites

- Portainer CE or Business Edition
- Docker CLI access
- HTTPS must be configured before disabling HTTP

## Why Disable HTTP?

- Credentials transmitted in plaintext over HTTP
- Session tokens can be intercepted
- Compliance requirements (PCI DSS, HIPAA, SOC 2) mandate encrypted transport
- Reduces attack surface

## Step 1: Verify HTTPS Is Working First

```bash
# Test HTTPS access before disabling HTTP

curl -k https://localhost:9443/api/status
# Expected: {"Version":"2.x.x","InstanceID":"..."}

# If HTTPS is not working, configure it first
```

## Step 2: Disable HTTP in Docker Run

```bash
# Stop existing container
docker stop portainer
docker rm portainer

# Deploy with --http-disabled flag
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-disabled
```

## Step 3: Disable HTTP in Docker Compose

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command: --http-disabled
    ports:
      - "9443:9443"
      - "8000:8000"
      # Port 9000 intentionally omitted
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Step 4: Disable HTTP in Docker Swarm

```bash
# Run this on a Swarm manager node
docker service update \
  --args "--http-disabled" \
  --publish-rm 9000 \
  portainer_portainer
```

## Step 5: Disable HTTP in Kubernetes (Helm)

```yaml
# portainer-values.yaml
tls:
  force: true

service:
  type: LoadBalancer
  httpsPort: 9443
  edgePort: 8000
```

```bash
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  -f portainer-values.yaml
```

## Step 6: Verify HTTP Is Disabled

```bash
# These should all fail or be refused:
curl http://localhost:9000/
curl -v http://portainer.example.com/

# HTTPS should still work:
curl -k https://localhost:9443/api/status

# Check no process listening on port 9000
ss -tlnp | grep 9000
# Should return nothing

# Check Portainer container doesn't expose port 9000
docker inspect portainer | jq '.[0].NetworkSettings.Ports'
```

## Firewall Defense-in-Depth

Even with `--http-disabled`, block port 9000 at the firewall level:

```bash
# Ubuntu/Debian
sudo ufw deny 9000/tcp
sudo ufw reload

# RHEL/Rocky/Oracle
sudo firewall-cmd --permanent --add-rich-rule='rule port port="9000" protocol="tcp" drop'
sudo firewall-cmd --reload
```

## Troubleshooting

### "Connection refused" on HTTPS after disabling HTTP

```bash
# Verify SSL certificates are properly configured
docker logs portainer | grep -i "ssl\|cert\|tls\|error"

# Inspect the certificate Portainer is presenting on 9443
openssl s_client -connect localhost:9443 -servername localhost -showcerts </dev/null
```

## Conclusion

Disabling HTTP in Portainer is a critical security hardening step for any production deployment. The `--http-disabled` flag ensures Portainer only listens on the HTTPS port. Always verify HTTPS is fully functional before disabling HTTP, and apply defense-in-depth by also blocking port 9000 at the firewall level.
