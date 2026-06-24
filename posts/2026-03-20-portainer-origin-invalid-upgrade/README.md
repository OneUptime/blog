# How to Fix 'Origin Invalid' Errors After Upgrading Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Security, Upgrade, CORS

Description: Resolve 'Origin Invalid' or CORS-related errors that appear after upgrading Portainer, caused by stricter origin validation introduced in recent versions.

## Introduction

Portainer 2.27.7 and 2.27.8 have a documented known issue where deployments behind some reverse proxy configurations can return "Origin invalid" errors. Portainer added `--trusted-origins` and `TRUSTED_ORIGINS` as a workaround in 2.27.9 LTS and 2.31.3 STS. If you access Portainer via an IP address, a different hostname than expected, or behind a proxy that doesn't preserve the external host and scheme correctly, you'll see "Invalid Origin" errors. This guide explains the root cause and the available fixes.

## Why Origin Validation Was Added

Portainer validates request origin as part of its CSRF protection. In affected releases, reverse proxy setups that changed the effective host or scheme seen by Portainer could trigger `Origin` / `Referer` validation failures.

## Step 1: Identify the Error

```bash
# Check browser console for the error

# Open F12 → Console
# Error typically looks like:
# "Forbidden - Origin invalid"
# POST https://portainer.yourdomain.com/api/auth 403 (Forbidden)

# Check Portainer logs
docker logs portainer 2>&1 | grep -Ei "origin invalid|Failed to validate Origin or Referer" | tail -20
```

## Step 2: Access via the Correct URL

The most reliable fix is to access Portainer via a consistent, trusted URL:

```bash
# After the upgrade, if you're getting "Invalid Origin":
# 1. Open a private/incognito window or clear site data for Portainer
# 2. Navigate to the HTTPS URL: https://portainer.yourdomain.com
# 3. Do NOT mix IP access and hostname access

# The issue often occurs when:
# - You're on an affected Portainer release behind a reverse proxy
# - You're accessing via IP or a different hostname than the one you intend to trust
# - The reverse proxy is not preserving the external host/scheme correctly
```

## Step 3: Fix Origin Validation via `--trusted-origins`

Portainer added a dedicated flag for this issue when running behind a reverse proxy:

```text
# Use the hostname you access Portainer with
# CLI flag:
--trusted-origins portainer.yourdomain.com

# Docker Compose / environment variable equivalent:
TRUSTED_ORIGINS=portainer.yourdomain.com
```

## Step 4: Fix Reverse Proxy Configuration

The most common cause is a reverse proxy not preserving the external host and scheme that Portainer uses during origin checks:

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;

        # Preserve the external host and scheme
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Real IP headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Traefik

```yaml
# File provider example
http:
  routers:
    portainer:
      rule: Host(`portainer.yourdomain.com`)
      entryPoints:
        - websecure
      service: portainer
      tls: {}
  services:
    portainer:
      loadBalancer:
        servers:
          - url: http://portainer:9000
```

### Caddy

```text
portainer.yourdomain.com {
    reverse_proxy 127.0.0.1:9000
}
```

## Step 5: Update to a Release with the Workaround

If you're on an affected release, update to a release that includes `--trusted-origins` support:

```bash
# Stop and remove the old container
docker stop portainer
docker rm portainer

# Pull a current LTS image
docker pull portainer/portainer-ce:lts

docker run -d \
  -p 127.0.0.1:9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --trusted-origins portainer.yourdomain.com

# Then confirm your reverse proxy points to the same hostname
# you configured as trusted
```

## Step 6: Fix Docker Compose + Traefik Origin Issues

```yaml
version: "3.8"
services:
  portainer:
    image: portainer/portainer-ce:lts
    command: -H unix:///var/run/docker.sock
    restart: always
    environment:
      - TRUSTED_ORIGINS=portainer.yourdomain.com
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.yourdomain.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
volumes:
  portainer_data:
```

## Step 7: Clear Portainer Site Data

After fixing the reverse proxy, clear any stale browser storage for the Portainer origin:

```javascript
// In the browser console on the Portainer page:
// This clears script-accessible cookies and storage for the current origin.
// If you still have issues, use your browser's site-data UI to clear the rest.
document.cookie.split(";").forEach(function(c) {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/");
});

// Clear local and session storage
localStorage.clear();
sessionStorage.clear();

// Reload
location.reload();
```

## Step 8: Use HTTPS Consistently

After upgrading, always use HTTPS:

```bash
# Redirect HTTP to HTTPS in Nginx
server {
    listen 80;
    server_name portainer.yourdomain.com;
    return 301 https://$host$request_uri;
}

# If you access Portainer directly rather than through a reverse proxy,
# you can make Portainer HTTPS-only
docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --http-disabled
```

## Conclusion

"Origin Invalid" errors after upgrading Portainer are a documented issue for Portainer 2.27.7 and 2.27.8 behind some reverse proxy setups. The fix is to update to a release that supports `--trusted-origins` / `TRUSTED_ORIGINS`, ensure your reverse proxy preserves the external host and scheme, and then clear stale browser storage. Access Portainer via a consistent domain/URL rather than mixing IP and hostname access.
