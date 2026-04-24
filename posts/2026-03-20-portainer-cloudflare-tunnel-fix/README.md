# How to Fix Portainer Not Working Behind Cloudflare Tunnel - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Cloudflare, Tunnel, Reverse Proxy, Troubleshooting

Description: Fix Portainer connectivity issues when deployed behind a Cloudflare Tunnel, including WebSocket failures, container console issues, and log streaming problems.

## Introduction

Cloudflare Tunnel (formerly Argo Tunnel) is a popular way to expose self-hosted services without opening ports. However, Portainer has specific requirements for WebSocket support, HTTP header forwarding, and session handling that require specific Cloudflare Tunnel configuration. This guide covers all common issues.

## Common Issues with Portainer Behind Cloudflare Tunnel

1. Container console (terminal) not working
2. Log streaming stopping after a few seconds
3. "WebSocket connection failed" errors
4. Session drops during container operations
5. "Origin not allowed" errors

## Step 1: Enable WebSocket Support in Cloudflare

```bash
# In the Cloudflare Dashboard:

# 1. Log in to Cloudflare Dashboard
# 2. Go to your domain → Network
# 3. Find "WebSockets"
# 4. Toggle it to "On"

# This is required for:
# - Container console/terminal
# - Real-time log streaming
# - Live stats updates
```

## Step 2: Configure the Cloudflare Tunnel for Portainer

```yaml
# ~/.cloudflared/config.yml or cloudflared tunnel config

tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  # Portainer configuration
  - hostname: portainer.yourdomain.com
    service: https://localhost:9443
    originRequest:
      # Don't verify self-signed cert
      noTLSVerify: true
      # Keep idle connections available to the origin
      keepAliveConnections: 10
      keepAliveTimeout: 90s
      # Set connection timeout explicitly
      connectTimeout: 30s
      # Set proper headers
      httpHostHeader: portainer.yourdomain.com

  # Catch-all
  - service: http_status:404
```

Deploy with:

```bash
cloudflared tunnel run your-tunnel-name
# or as a service:
sudo cloudflared --config ~/.cloudflared/config.yml service install
sudo systemctl start cloudflared
```

## Step 3: Fix Using Cloudflare Zero Trust Dashboard

If using the Cloudflare Zero Trust (ZTNA) dashboard instead of config file:

1. Go to **Zero Trust** → **Networks** → **Connectors** → **Cloudflare Tunnels**
2. Click your tunnel → **Edit**
3. Under **Published application routes**, add or edit a route:
   - **Subdomain**: portainer
   - **Domain**: yourdomain.com
   - **Service type**: HTTPS
   - **URL**: localhost:9443 (or `portainer:9443` if `cloudflared` runs in a separate Docker container)
4. Under **Additional application settings** → **TLS Settings**:
   - Enable **No TLS Verify** (for self-signed Portainer cert)
5. Under **Additional application settings** → **HTTP Settings**:
   - **HTTP Host Header**: portainer.yourdomain.com

## Step 4: Fix WebSocket Proxy Configuration

```bash
# Install wscat if you want a minimal WebSocket client
npm install -g wscat

# Portainer's console uses authenticated WebSocket endpoints,
# so testing the bare root URL is not a reliable check.
# Instead, open your browser dev tools, start a Portainer console session,
# and confirm the WebSocket request gets HTTP 101 Switching Protocols.
```

## Step 5: Fix Cloudflare Cache Interference

```bash
# If you already have Cache Rules or Page Rules affecting this hostname,
# bypass cache for Portainer:

# In Cloudflare Dashboard → Rules → Cache Rules
# Create rule:
# Match: hostname portainer.yourdomain.com
# Action: Bypass cache
```

## Step 6: Fix Origin Validation Errors

Portainer can return "Origin invalid" errors behind a reverse proxy. Configure the tunnel to send the correct host header:

```yaml
# cloudflared config.yml
ingress:
  - hostname: portainer.yourdomain.com
    service: https://localhost:9443
    originRequest:
      noTLSVerify: true
      # Tell Portainer what origin to expect
      httpHostHeader: portainer.yourdomain.com
```

Or configure Portainer to trust the public hostname:

```bash
docker run -d \
  -p 9443:9443 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-disabled \
  --trusted-origins portainer.yourdomain.com
```

## Step 7: Fix Timeout for Long Operations

Cloudflare tunnels have default timeouts that affect Portainer operations:

```yaml
# In cloudflared config, increase timeouts
ingress:
  - hostname: portainer.yourdomain.com
    service: https://localhost:9443
    originRequest:
      noTLSVerify: true
      # Allow more time to establish the connection to Portainer
      connectTimeout: 60s
      # Keep the TCP connection alive between Cloudflare and Portainer
      tcpKeepAlive: 30s
```

Cloudflare's default proxy read timeout for standard HTTP requests is 120 seconds. For operations that take longer, use the Portainer API with polling rather than waiting for a single long request.

## Step 8: Configure Cloudflare Access Policies (Optional)

Add authentication to your Portainer tunnel:

```bash
# In Cloudflare Zero Trust → Access controls → Applications → Add an application
# Type: Self-hosted
# Application domain: portainer.yourdomain.com
# Configure policy (e.g., only your email can access)

# This adds Cloudflare Access as an extra auth layer
# Users must authenticate through Cloudflare before reaching Portainer login
```

## Step 9: Fix Docker Compose Deployment for Tunnel

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    # Only expose locally - accessed via Cloudflare Tunnel
    expose:
      - "9443"
    # No public port binding needed with Cloudflare Tunnel
    # From the cloudflared container, reach Portainer at https://portainer:9443
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: "your-cloudflare-tunnel-token"
    depends_on:
      - portainer

volumes:
  portainer_data:
```

## Step 10: Verify the Full Flow

```bash
# If you enabled Cloudflare Access, authenticate through Access first
# or run these checks from the origin side of the tunnel.

# Test 1: Basic connectivity
curl -I https://portainer.yourdomain.com

# Test 2: Login
curl -X POST https://portainer.yourdomain.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}'

# Test 3: In browser DevTools → Network, start a container console session
# and confirm the WebSocket request gets HTTP 101 Switching Protocols.

# If Test 2 works but the console still fails:
# Re-check WebSockets and reverse-proxy timeout settings
```

## Conclusion

The most critical requirements for Portainer behind a Cloudflare Tunnel are: WebSocket support enabled in Cloudflare Network settings, `noTLSVerify: true` when Portainer is serving a self-signed HTTPS certificate on `9443`, and the correct `httpHostHeader` to pass the right hostname. If Portainer returns "Origin invalid" errors, configure `--trusted-origins` with the public hostname. Container terminal and log streaming still depend on WebSocket support and sane proxy timeout settings.
