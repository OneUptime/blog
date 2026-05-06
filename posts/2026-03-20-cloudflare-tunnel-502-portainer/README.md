# How to Fix 502 Bad Gateway Errors with Cloudflare Tunnel and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Tunnel, 502 Bad Gateway, Troubleshooting

Description: Learn how to diagnose and fix 502 Bad Gateway errors when accessing Portainer through a Cloudflare Tunnel, covering network issues, timeouts, and misconfigured service URLs.

## Understanding 502 with Cloudflare Tunnel

A 502 from Cloudflare Tunnel means the cloudflared connector reached your server but couldn't forward the request to Portainer. This is different from a regular Nginx 502 - the request successfully traverses the tunnel but fails at the last hop.

```text
Browser → Cloudflare → cloudflared connector → Portainer
                                              ↑ This hop fails → 502
```

## Common Causes

| Cause | Symptom |
|-------|---------|
| Portainer not running | cloudflared logs: "connect: connection refused" |
| Wrong service URL in tunnel config | 502 immediately on all requests |
| cloudflared not on same network as Portainer | cloudflared logs: "lookup portainer: no such host" |
| Portainer HTTP vs HTTPS mismatch | cloudflared logs: "malformed HTTP response" |

## Step 1: Check Portainer Is Running

```bash
docker ps | grep portainer
# Must show "Up" status

# Test Portainer is responding locally on its default HTTPS port

curl -k -I https://localhost:9443
# Expected: an HTTP response

# If you explicitly enabled legacy HTTP:
curl -I http://localhost:9000
```

## Step 2: Verify cloudflared Can Reach Portainer

```bash
# If both are containers, verify they share at least one Docker network
docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' cloudflared
docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' portainer
# At least one network name must match

# Or if cloudflared runs as a host service:
curl -k -I https://localhost:9443
# If you explicitly enabled legacy HTTP:
curl -I http://localhost:9000
```

## Step 3: Check Tunnel Service URL Configuration

In Cloudflare Zero Trust → **Networks → Connectors → Cloudflare Tunnels** → edit the tunnel route:

```text
Public Hostname:  portainer.yourdomain.com
Service:          https://localhost:9443    ← if cloudflared runs on host
                  https://portainer:9443    ← if cloudflared runs in Docker
                  http://portainer:9000     ← only if you explicitly enabled Portainer HTTP
```

Common mistakes:
- Using `http://localhost:9443` when Portainer uses HTTPS
- Using `https://localhost:9000` when Portainer uses legacy HTTP on port 9000
- Using `portainer:9443` or `portainer:9000` but cloudflared is on a different Docker network
- Wrong port (`9443` is the default UI/API port; `9000` is legacy HTTP)

## Step 4: Fix Docker Network Issue

If cloudflared is a container and uses container name routing:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    networks:
      - default    # Must match Portainer's network

  portainer:
    image: portainer/portainer-ce:latest
    networks:
      - default    # Same network

# Tunnel config service URL: https://portainer:9443
# Use http://portainer:9000 only if you explicitly enabled Portainer HTTP
```

## Step 5: Handle HTTP vs HTTPS

Portainer serves HTTPS on port 9443 by default:

In Cloudflare tunnel public hostname:
```text
Service: https://localhost:9443
```

Also enable in Cloudflare tunnel settings:
- **No TLS Verify**: ON (quick workaround for Portainer's default self-signed cert)

Or via cloudflared config:

```yaml
# config.yml
ingress:
  - hostname: portainer.yourdomain.com
    service: https://localhost:9443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

## Step 6: Check cloudflared Logs

```bash
# If running as Docker container
docker logs cloudflared 2>&1 | tail -30

# Look for connection errors:
# level=error msg="error dialing service URL"
# level=error msg="connect: connection refused"
```

## Step 7: Tune Cloudflare Tunnel Origin Settings

If logs point to slow TCP connection setup or TLS handshakes to the origin, you can tune the origin connection settings. These affect tunnel-to-origin connectivity, not how long a Portainer task runs:

```yaml
# cloudflared config.yml
ingress:
  - hostname: portainer.yourdomain.com
    service: https://localhost:9443
    originRequest:
      connectTimeout: 30s
      tlsTimeout: 30s
      tcpKeepAlive: 30s
      keepAliveTimeout: 1m30s
      keepAliveConnections: 100
  - service: http_status:404
```

## Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== Cloudflare Tunnel + Portainer Diagnostics ==="

echo -e "\n1. Portainer container status:"
docker ps --filter name=portainer --format "{{.Names}}: {{.Status}}"

echo -e "\n2. Portainer local HTTPS response:"
curl -sk -o /dev/null -w "HTTPS Status: %{http_code}\n" https://localhost:9443

echo -e "\n3. cloudflared container status:"
docker ps --filter name=cloudflared --format "{{.Names}}: {{.Status}}"

echo -e "\n4. cloudflared logs (last 10 lines):"
docker logs cloudflared 2>&1 | tail -10

echo -e "\n5. Docker networks for cloudflared:"
docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' cloudflared 2>/dev/null || echo "cloudflared container not found"

echo -e "\n6. Docker networks for portainer:"
docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' portainer 2>/dev/null || echo "portainer container not found"
```

## Conclusion

502 errors with Cloudflare Tunnel are usually a misconfigured service URL, a Docker network isolation issue, or a Portainer HTTP/HTTPS mismatch. The key diagnostic is verifying that the tunnel's service URL matches how Portainer is actually exposed and, if you use container-name routing, that `cloudflared` and Portainer share a Docker network.
