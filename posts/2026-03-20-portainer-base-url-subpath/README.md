# How to Run Portainer Under a Subpath (Base URL)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, Reverse-proxy, Subpaths, Base-url, Configuration

Description: A guide to running Portainer under a URL subpath (e.g., /portainer/) using a reverse proxy, instead of at the root domain.

## Overview

By default, Portainer serves at the root path (`/`). Running Portainer under a subpath like `https://example.com/portainer/` allows you to host multiple applications on the same domain. In current Portainer versions, this requires starting Portainer with `--base-url /portainer` and configuring a reverse proxy (Nginx, Traefik, or Caddy) to strip the `/portainer` prefix before forwarding requests.

## Prerequisites

- Portainer CE or Business Edition
- Portainer started with `--base-url /portainer`
- Nginx, Traefik, or Caddy reverse proxy
- Admin access to the reverse proxy configuration

## Method 1: Nginx Reverse Proxy with Subpath

```nginx
# /etc/nginx/conf.d/portainer.conf

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/example.crt;
    ssl_certificate_key /etc/nginx/ssl/example.key;

    # Other applications at root or other paths can coexist

    # Portainer at /portainer/
    location /portainer/ {
        proxy_pass https://localhost:9443/;
        proxy_ssl_verify off;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Required for Portainer WebSocket connections
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Access Portainer at:
# https://example.com/portainer/
```

## Method 2: Traefik with Subpath

```yaml
# docker-compose.yml with Traefik
version: "3.8"
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command: -H unix:///var/run/docker.sock --base-url /portainer --http-enabled
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Path(`/portainer`) || PathPrefix(`/portainer/`)"
      - "traefik.http.middlewares.portainer-strip.stripprefix.prefixes=/portainer"
      - "traefik.http.routers.portainer.middlewares=portainer-strip"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
      - "traefik.http.routers.portainer.tls=true"

volumes:
  portainer_data:
```

## Method 3: Caddy with Subpath

```caddyfile
# Caddyfile
example.com {
    handle /portainer/* {
        uri strip_prefix /portainer
        reverse_proxy https://localhost:9443 {
            transport http {
                tls_insecure_skip_verify
            }
        }
    }
    
    # Other services at other paths...
}
```

## Important: Portainer WebSocket Requirements

Portainer uses WebSockets for container console/log streaming. Ensure your proxy supports WebSocket upgrades:

```nginx
# Required WebSocket headers in Nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

## Testing the Subpath Setup

```bash
# Test that Portainer is accessible at the subpath
curl -k https://example.com/portainer/api/status

# Then open the Portainer container console or log viewer in the UI
# and confirm the WebSocket connection stays open.
```

## Common Issues

### Portainer CSS/JS Not Loading

If the Portainer UI loads but appears broken (no styles):

```nginx
# Portainer should be started with --base-url /portainer
# The trailing slash in proxy_pass is also critical
# Correct: proxy_pass https://localhost:9443/;  (note trailing slash)
# Wrong:   proxy_pass https://localhost:9443;   (no trailing slash)
```

### Redirect Loops

```nginx
# Ensure X-Forwarded-Proto is set correctly
proxy_set_header X-Forwarded-Proto https;

# If you proxy to Portainer's default listener, keep the upstream on HTTPS:
# proxy_pass https://localhost:9443/;
```

### 404 on API Calls

Portainer's API calls from the frontend must also go through the proxy path. Verify by checking the browser's Network tab for failed requests.

## Conclusion

Running Portainer under a subpath requires careful reverse proxy configuration, particularly the `--base-url` setting, the trailing slash in `proxy_pass` (for Nginx), and WebSocket headers. Nginx, Traefik, and Caddy all support this pattern with the configurations shown above. Test both the UI and WebSocket functionality (container console) after setup to ensure full functionality.
