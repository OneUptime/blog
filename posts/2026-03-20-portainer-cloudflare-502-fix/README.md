# How to Fix 502 Bad Gateway with Cloudflare Tunnel in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Troubleshooting, 502, Tunnel

Description: Learn how to diagnose and fix 502 Bad Gateway errors when accessing Portainer through a Cloudflare Tunnel, covering connectivity, configuration, WebSocket, and timeout issues.

## Introduction

A 502 Bad Gateway error when accessing Portainer through a Cloudflare Tunnel means cloudflared cannot reach the Portainer backend, or the backend is returning an error that Cloudflare interprets as invalid. These errors can stem from container networking issues, wrong service URLs in the tunnel config, timeout settings, or SSL/TLS configuration mismatches. This guide covers systematic diagnosis and fixes.

## Prerequisites

- Portainer deployed behind a Cloudflare Tunnel
- Access to Docker logs and the Cloudflare Zero Trust dashboard
- cloudflared running as a container or systemd service

## Step 1: Check Cloudflare Tunnel Status

First, verify the tunnel itself is connected:

```bash
# Check cloudflared container logs

docker logs cloudflared --tail=50

# Look for connection state
docker logs cloudflared 2>&1 | grep -E "(registered|disconnected|error|ERR)"

# Healthy output shows 4 registered connections:
# INF Registered tunnel connection connIndex=0
# INF Registered tunnel connection connIndex=1
# INF Registered tunnel connection connIndex=2
# INF Registered tunnel connection connIndex=3

# Problem indicators:
# ERR Failed to dial to origin - Can't reach the backend
# ERR Unable to reach the origin service - Backend not responding
# WRN Retrying connection - Network/auth issues
```

```bash
# Check in Cloudflare Dashboard
# Cloudflare One → Networks → Connectors → Cloudflare Tunnels
# Your tunnel should show: Status = HEALTHY
# If INACTIVE: the connector has not established a tunnel connection yet
```

## Step 2: Verify the Service URL in Tunnel Config

The service URL in your tunnel configuration must point to the correct container:

**In config.yml mode:**
```yaml
# /opt/cloudflared/config.yml

# WRONG: HTTPS to Portainer's legacy HTTP port
---
ingress:
  - hostname: portainer.example.com
    service: https://portainer:9000

# CORRECT for current Portainer defaults (HTTPS on 9443)
---
ingress:
  - hostname: portainer.example.com
    service: https://portainer:9443
    originRequest:
      noTLSVerify: true    # Required if Portainer uses its default self-signed cert

# CORRECT only if you explicitly exposed Portainer's legacy HTTP port 9000
---
ingress:
  - hostname: portainer.example.com
    service: http://portainer:9000
```

**In Cloudflare Dashboard (for token-mode tunnels):**
```text
Published application route → Edit:
  Type: HTTPS
  URL: portainer:9443
  No TLS Verify: checked    # If Portainer uses its default self-signed cert

If using Portainer's legacy HTTP port instead:
  Type: HTTP
  URL: portainer:9000
```

## Step 3: Test Connectivity on the Shared Docker Network

```bash
# Check which Docker networks each container is using
docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{printf "%s\n" $k}}{{end}}' cloudflared
docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{printf "%s\n" $k}}{{end}}' portainer

# They must share a user-defined network - connect if not
# Replace proxy with the actual shared network name
docker network connect proxy cloudflared
docker network connect proxy portainer

# Test the exact Portainer URL from that shared network
docker run --rm --network proxy curlimages/curl -sS -o /dev/null -w "HTTPS %{http_code}\n" -kI https://portainer:9443

# If you explicitly enabled Portainer's legacy HTTP port instead:
docker run --rm --network proxy curlimages/curl -sS -o /dev/null -w "HTTP %{http_code}\n" -I http://portainer:9000

# Expect an HTTP response such as 200, 302, or 401.
# A timeout or connection refused error means cloudflared will fail too.
```

## Step 4: Handle Timeout Issues

Cloudflare Tunnel timeouts are configurable if slow handshakes or long-lived Portainer operations are causing failures:

```yaml
# config.yml - Increase timeout settings
ingress:
  - hostname: portainer.example.com
    service: https://portainer:9443
    originRequest:
      noTLSVerify: true         # if Portainer uses its default self-signed cert
      connectTimeout: 60s         # default: 30s
      tlsTimeout: 20s             # default: 10s (HTTPS origins only)
      tcpKeepAlive: 30s           # TCP keepalive interval
      keepAliveTimeout: 2m        # default: 1m30s
```

## Step 5: Fix WebSocket Issues

If the main Portainer UI loads but the console does not:

```text
# Ensure WebSockets are enabled in Cloudflare
# Cloudflare Dashboard → Network → WebSockets → ON

# cloudflared handles WebSocket upgrades automatically
# There is no separate WebSocket option required in the tunnel config
# If console sessions still drop, review timeout and keepalive settings on the origin and client
```

## Step 6: Check Portainer Error Logs

The error may originate from Portainer itself:

```bash
# Check Portainer logs
docker logs portainer --tail=100

# Look for relevant errors
docker logs portainer 2>&1 | grep -i "error\|warn\|fail"

# Probe the exact origin URL configured in the tunnel
# Replace proxy with the actual shared network name
docker run --rm --network proxy curlimages/curl -sS -o /dev/null -w "HTTPS %{http_code}\n" -kI https://portainer:9443

# If using legacy HTTP on 9000 instead:
docker run --rm --network proxy curlimages/curl -sS -o /dev/null -w "HTTP %{http_code}\n" -I http://portainer:9000
```

## Step 7: Use Cloudflare Tunnel Logs for Diagnosis

```bash
# Enable verbose cloudflared logging
# In docker-compose.yml, add --loglevel debug to your existing command.
# Example for token-mode tunnels:
# command: tunnel --no-autoupdate --loglevel debug run --token ${TUNNEL_TOKEN}

# Filter for origin connection issues
docker logs cloudflared 2>&1 | grep -i "origin\|ERR\|upstream"

# Common error messages:
# "dial tcp portainer:9000: connect: connection refused"
#   → Portainer not running or not on the proxy network
# "x509: certificate signed by unknown authority"
#   → Add noTLSVerify: true for self-signed Portainer cert
# "context deadline exceeded"
#   → Increase connectTimeout in originRequest settings
```

## Step 8: Systematic Fix Checklist

```bash
#!/bin/bash
# cloudflare-tunnel-debug.sh

echo "=== Cloudflare Tunnel to Portainer Debug ==="

echo "1. Tunnel container running?"
docker ps --filter "name=cloudflared" --format "  {{.Names}}: {{.Status}}"

echo "2. Portainer container running?"
docker ps --filter "name=portainer" --format "  {{.Names}}: {{.Status}}"

echo "3. Shared Docker network?"
CF_NETS=$(docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{printf "%s\n" $k}}{{end}}' cloudflared 2>/dev/null)
PORT_NETS=$(docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{printf "%s\n" $k}}{{end}}' portainer 2>/dev/null)
SHARED_NET=$(comm -12 <(printf "%s\n" "$CF_NETS" | sort) <(printf "%s\n" "$PORT_NETS" | sort) | head -n1)
echo "  Cloudflared networks: $CF_NETS"
echo "  Portainer networks: $PORT_NETS"
echo "  Shared network: ${SHARED_NET:-none}"

echo "4. Connectivity test:"
if [ -n "$SHARED_NET" ]; then
  docker run --rm --network "$SHARED_NET" curlimages/curl -sS -o /dev/null -w "  HTTPS %{http_code}\n" -kI https://portainer:9443 || \
    echo "  FAILED: could not reach https://portainer:9443"
  echo "  If you use Portainer's legacy HTTP port instead, test http://portainer:9000"
else
  echo "  FAILED: no shared Docker network between cloudflared and portainer"
fi
```

## Conclusion

502 errors with Cloudflare Tunnel and Portainer are commonly caused by cloudflared being unable to reach the Portainer container or by a mismatch between the configured origin protocol and Portainer's actual port. Verify they share the same Docker network, confirm the service URL is correct (Portainer defaults to HTTPS on 9443, while 9000 is legacy HTTP), and add `noTLSVerify: true` if Portainer uses its default self-signed certificate. Increase timeout settings only after connectivity and protocol mismatches are ruled out.
