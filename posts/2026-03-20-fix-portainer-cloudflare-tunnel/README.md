# How to Fix Portainer Not Working Behind Cloudflare Tunnel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Cloudflare Tunnel, Reverse Proxy, WebSocket, Networking

Description: Learn how to fix Portainer UI and console issues when accessed through a Cloudflare Tunnel, including WebSocket configuration and HTTP/2 compatibility settings.

---

Cloudflare Tunnel provides a secure way to expose Portainer without opening inbound firewall ports. However, if WebSockets are disabled at the Cloudflare zone or Portainer does not trust the public hostname, the container console can fail and Portainer can return origin validation errors.

## Step 1: Confirm Cloudflare WebSockets Are Enabled

Cloudflare supports proxied WebSockets without tunnel-specific configuration, but WebSockets must be enabled for the zone:

1. Go to **Cloudflare Dashboard > Network**.
2. Ensure **WebSockets** is enabled.

## Step 2: Set the Tunnel Origin to HTTP, Not HTTPS

Portainer inside Docker is typically plain HTTP (port 9000). Set the tunnel origin accordingly:

```text
# In Cloudflare Tunnel configuration (config.yml)

ingress:
  - hostname: portainer.example.com
    service: http://portainer:9000    # Use http, not https
    originRequest:
      httpHostHeader: portainer.example.com
  - service: http_status:404
```

## Step 3: Fix "Origin Invalid" Errors

If Portainer shows `Origin invalid`, configure Portainer to trust the public hostname used by the reverse proxy:

```bash
# Add the public hostname Portainer should trust behind the reverse proxy
docker run -d ... portainer/portainer-ce:latest \
  --trusted-origins portainer.example.com
```

If you previously disabled HTTP in Portainer, re-enable it with `--http-enabled` or point the tunnel at `https://portainer:9443` instead.

## Step 4: Understand Cloudflare SSL/TLS Mode

Cloudflare's SSL/TLS mode does not change the local protocol used by the tunnel. The `service: http://portainer:9000` setting above is what keeps the `cloudflared` to Portainer hop on HTTP.

If you switch the tunnel service to `https://portainer:9443`, configure the tunnel's origin TLS settings to match your certificate instead of changing this HTTP example.

## Step 5: Use HTTP/2 Only as a Troubleshooting Step

HTTP/2 is enabled by default in Cloudflare. This is not a Portainer-specific WebSocket requirement, and the setting is zone-wide rather than per-hostname:

1. In Cloudflare Dashboard go to **Speed > Settings > Protocol Optimization**.
2. If you are specifically troubleshooting `ERR_HTTP2_PROTOCOL_ERROR`, disable HTTP/2 temporarily for the zone to test. This is a generic Cloudflare troubleshooting step, not a standard Portainer fix.

## Step 6: Fix Container Console Disconnects Behind Cloudflare

The container console uses a long-lived WebSocket. If it disconnects unexpectedly, review timeout settings across the proxy path and use keepalives:

1. In **Cloudflare Dashboard > Network** ensure **WebSockets** is enabled.
2. If sessions still close, check timeout settings on every proxy in front of Portainer and implement keepalives. Portainer documents increasing reverse-proxy read timeouts when the console closes unexpectedly.
3. Consider using Cloudflare Access policies to restrict who can reach Portainer while keeping the tunnel functional.

## Testing the Fix

```bash
# Validate that cloudflared will send the hostname to the Portainer service
cloudflared tunnel ingress rule https://portainer.example.com

# Then open Portainer, launch a container console, and verify the browser
# shows a 101 Switching Protocols request under /api/websocket/.
```
