# How to Enable Debug Logging in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Debugging, Logging, Troubleshooting, Diagnostic

Description: A guide to enabling and using debug logging in Portainer for troubleshooting issues and diagnosing problems.

## Overview

Portainer's default log level is INFO, which records significant events but omits more verbose troubleshooting details. When troubleshooting connectivity issues, authentication problems, or unexpected behavior, enabling debug logging provides much more detailed output. This guide covers enabling debug logs, collecting them, and using them to diagnose common issues.

## Prerequisites

- Running Portainer installation
- Docker CLI access to the Portainer host
- Admin access (for Portainer BE runtime log level changes via API)

## Default Log Levels

| Level | Description |
|---|---|
| DEBUG | Verbose troubleshooting output |
| INFO | Standard operational events |
| WARN | Warning conditions |
| ERROR | Errors and failures |

## Method 1: Enable Debug Logging at Startup

```bash
# Stop existing container

docker stop portainer
docker rm portainer

# Redeploy with --log-level=DEBUG
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=DEBUG

# View debug logs
docker logs -f portainer
```

## Method 2: Change Log Level at Runtime (Portainer BE via API)

Portainer Business Edition supports changing the debug log setting without restarting the container:

```bash
PORTAINER_URL="https://portainer.example.com:9443"
JWT="your-admin-jwt"

# Enable debug logging
curl -X PUT \
  "${PORTAINER_URL}/api/support/debug_log" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"debugLogEnabled": true}'

# Disable debug logging (back to INFO)
curl -X PUT \
  "${PORTAINER_URL}/api/support/debug_log" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"debugLogEnabled": false}'
```

## Reading Debug Logs

```bash
# View recent logs
docker logs --tail 100 portainer

# Follow logs in real time
docker logs -f portainer

# Filter for specific patterns
docker logs portainer 2>&1 | grep -i "error\|fail\|auth"

# Filter for HTTP-related messages
docker logs portainer 2>&1 | grep -i "http"

# Save logs to file for analysis
docker logs portainer > portainer-debug-$(date +%Y%m%d-%H%M%S).log 2>&1
```

## Common Debug Scenarios

### Authentication Issues

```bash
# Look for auth-related log entries
docker logs portainer 2>&1 | grep -i "auth\|login\|token\|jwt"
```

Expected debug output format varies by Portainer version and log mode, so focus on authentication-related entries, 4xx/5xx responses, and LDAP/OAuth errors rather than exact message text.

### Docker Endpoint Connectivity

```bash
# Check endpoint connection logs
docker logs portainer 2>&1 | grep -i "endpoint\|socket\|docker"
```

### Kubernetes Cluster Issues

```bash
# Check k8s-related logs
docker logs portainer 2>&1 | grep -i "kubernetes\|k8s\|kubeconfig"
```

## Docker Compose with Debug Logging

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command: --log-level=DEBUG
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

volumes:
  portainer_data:
```

## Log Rotation

Debug logs are verbose and can fill disk quickly:

```bash
# Configure Docker log rotation for Portainer
docker run -d \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=DEBUG
```

## Restoring Normal Logging

```bash
# Portainer BE: always disable debug logging after troubleshooting
curl -X PUT "${PORTAINER_URL}/api/support/debug_log" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"debugLogEnabled": false}'
```

## Conclusion

Debug logging is an invaluable tool for diagnosing Portainer issues but should be disabled in production after troubleshooting due to the volume of output and potential exposure of sensitive information in logs. On Portainer Business Edition, the runtime log level change via the support API or UI avoids a container restart. On Portainer Community Edition, enabling debug logging at startup remains the documented option. Always configure log rotation when running in debug mode to prevent disk exhaustion.
