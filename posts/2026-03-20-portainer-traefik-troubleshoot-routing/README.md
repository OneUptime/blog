# How to Troubleshoot Traefik Routing Issues with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Troubleshooting, Routing, Debugging

Description: Learn systematic approaches to diagnose and fix common Traefik routing problems when deployed alongside Portainer, from label misconfiguration to network issues and certificate errors.

## Introduction

Traefik routing issues can stem from incorrect labels, network misconfigurations, certificate problems, or container discovery failures. When Portainer-deployed services aren't routing correctly through Traefik, a systematic debugging approach saves hours of trial and error. This guide covers the most common routing failures and how to diagnose them.

## Prerequisites

- Traefik and Portainer deployed
- Access to Docker logs and the Traefik dashboard
- Basic familiarity with curl and Docker commands

## Step 1: Enable Debug Logging

First, enable verbose logging to see exactly what Traefik is doing:

```yaml
# traefik.yml - Temporarily increase log level

log:
  level: DEBUG    # Change from INFO to DEBUG for troubleshooting
  format: common  # Use 'json' for structured logs

accessLog:
  format: json    # Log every request with details
```

```bash
# Restart Traefik with debug logging
docker restart traefik

# Follow logs
docker logs traefik --follow 2>&1 | grep -E "(error|warn|router|service|provider)"
```

## Step 2: Check the Traefik Dashboard

```bash
# Access the dashboard API to see what Traefik discovered
curl -s -u admin:password https://traefik.example.com/api/http/routers | jq '.[] | {name, rule, status}'

# Look for routers with warnings or errors
curl -s -u admin:password https://traefik.example.com/api/http/routers | \
  jq '.[] | select(.status != "enabled") | {name, status, error}'

# Check services health
curl -s -u admin:password https://traefik.example.com/api/http/services | \
  jq '.[] | {name, serverStatus: .serverStatus}'
```

## Step 3: Diagnose Common Label Issues

**Issue: Container not appearing in Traefik at all**

```bash
# Check: Is traefik.enable=true set?
docker inspect mycontainer | jq '.[].Config.Labels | to_entries | .[] | select(.key | contains("traefik"))'

# Check: Is the container on the proxy network?
docker inspect mycontainer | jq '.[].NetworkSettings.Networks | keys'

# Check: Is exposedByDefault false in traefik.yml? (requires explicit enable)
grep "exposedByDefault" /opt/traefik/traefik.yml
```

**Issue: Router found but service not reachable (502 Bad Gateway)**

```bash
# Check: Is the port correct?
docker inspect mycontainer | jq '.[].Config.ExposedPorts'

# Verify the container is on the same network as Traefik
docker network inspect proxy | jq '.Containers | to_entries[] | .value.Name'

# Test direct container-to-container connectivity
docker run --rm --network proxy alpine wget -qO- http://mycontainer:8080/health
```

**Issue: Wrong network being used (multiple networks)**

```yaml
# Fix: Explicitly specify the Traefik network
labels:
  - "traefik.docker.network=proxy"    # Must match the Docker network name Traefik should use
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"
```

## Step 4: Diagnose Certificate Issues

```bash
# Check if ACME is obtaining certificates
docker logs traefik 2>&1 | grep -i "acme\|certificate\|letsencrypt"

# Verify port 80 is reachable for HTTP challenge
curl -I http://myapp.example.com/.well-known/acme-challenge/test
# You want an HTTP response here (often 404), not connection refused or timeout

# Check certificate details
echo | openssl s_client -servername myapp.example.com \
  -connect myapp.example.com:443 2>/dev/null | openssl x509 -noout -subject -dates -issuer

# If you see Traefik's generated default certificate, Traefik is not presenting
# a matching ACME certificate for this hostname yet
# Subject should not be: CN = TRAEFIK DEFAULT CERT
```

## Step 5: Diagnose Network Issues

```bash
# Get container IP
CONTAINER_IP=$(docker inspect mycontainer | jq -r '.[].NetworkSettings.Networks.proxy.IPAddress')
echo "Container IP on proxy network: $CONTAINER_IP"

# Verify Traefik can reach the container by IP
docker exec traefik wget -qO- --timeout=5 "http://$CONTAINER_IP:8080/" || echo "Connection failed"

# Check if service port is actually listening inside container
docker exec mycontainer netstat -tlnp 2>/dev/null || docker exec mycontainer ss -tlnp
```

## Step 6: Systematic Routing Checklist

```bash
#!/bin/bash
# traefik-debug.sh - Run this to diagnose routing issues

SERVICE_NAME="${1:-myapp}"
DOMAIN="${2:-myapp.example.com}"

echo "=== Traefik Routing Diagnostic for: $SERVICE_NAME ==="
echo ""

echo "1. Container running?"
docker ps --filter "name=$SERVICE_NAME" --format "  {{.Names}}: {{.Status}}"

echo ""
echo "2. Traefik labels present?"
docker inspect "$SERVICE_NAME" 2>/dev/null | \
  jq -r '.[].Config.Labels | to_entries[] | select(.key | startswith("traefik")) | "  \(.key)=\(.value)"'

echo ""
echo "3. Connected to proxy network?"
docker inspect "$SERVICE_NAME" 2>/dev/null | \
  jq -r '.[].NetworkSettings.Networks | keys[] | "  Network: \(.)"'

echo ""
echo "4. DNS resolving?"
nslookup "$DOMAIN" | grep -E "Address|Name"

echo ""
echo "5. HTTP responding?"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN")
echo "  HTTP status: $HTTP_STATUS"

echo ""
echo "6. HTTPS responding?"
HTTPS_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN")
echo "  HTTPS status: $HTTPS_STATUS"
```

## Step 7: Fix Common Configuration Mistakes

```yaml
# WRONG: Service name mismatch between router and service
labels:
  - "traefik.http.routers.myapp.service=my-app"        # Hyphen
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"  # No hyphen - MISMATCH

# CORRECT: Names must match exactly
labels:
  - "traefik.http.routers.myapp.service=myapp"
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"

# WRONG: Port is the host port, not container port
labels:
  - "traefik.http.services.myapp.loadbalancer.server.port=9090"    # Host port
# Container actually listens on 8080 internally

# CORRECT: Always use the container's internal port
labels:
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"    # Container port
```

## Conclusion

Traefik routing issues with Portainer deployments typically fall into one of five categories: missing `traefik.enable=true`, network mismatch, wrong port number, certificate provisioning failure, or service name inconsistency. Enable debug logging and use the Traefik dashboard API to quickly identify which category you're dealing with. The systematic checklist script can automate the most common diagnostic steps.
