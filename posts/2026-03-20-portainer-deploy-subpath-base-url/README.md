# How to Deploy Portainer on a Subpath Using --base-url

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Reverse Proxy, Configuration, Subpaths

Description: Configure Portainer to run on a URL subpath (e.g., /portainer/) using the --base-url flag along with reverse proxy path stripping.

## Introduction

By default, Portainer expects to be served at the root (`/`) of a domain. In environments where multiple services share a single domain, you may need Portainer at a subpath like `https://example.com/portainer/`. The `--base-url` flag tells Portainer to prefix all its routes and asset URLs accordingly.

## Prerequisites

- Docker installed
- Reverse proxy (Nginx or Traefik) configured
- Understanding of reverse proxy path rewriting

## Step 1: Start Portainer with --base-url

```bash
# Run Portainer with a base URL of /portainer

docker run -d \
  --name portainer \
  --network proxy \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-enabled \
  --base-url=/portainer \
  --trusted-origins=example.com
```

Note: The `--trusted-origins` value is `example.com` (just the domain, not `https://example.com` or `https://example.com/portainer`). This example assumes your reverse proxy shares a Docker network named `proxy` with the Portainer container.

### Docker Compose

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    command:
      - "--http-enabled"
      - "--base-url=/portainer"
      - "--trusted-origins=example.com"
    networks:
      - proxy

volumes:
  portainer_data:

networks:
  proxy:
    driver: bridge
```

## Step 2: Configure Nginx Path Proxying

When using a subpath, Nginx must proxy requests **while stripping** the `/portainer` prefix before forwarding them to Portainer:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Proxy /portainer/* to Portainer (strip the /portainer prefix)
    location /portainer/ {
        proxy_pass http://portainer:9000/;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Step 3: Configure Traefik Path Routing

With Traefik, use a PathPrefix rule and StripPrefix middleware so requests reach Portainer without the `/portainer` prefix:

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    command:
      - "--http-enabled"
      - "--base-url=/portainer"
      - "--trusted-origins=example.com"
    labels:
      - "traefik.enable=true"
      # Match requests that start with /portainer
      - "traefik.http.routers.portainer.rule=Host(`example.com`) && PathPrefix(`/portainer`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.routers.portainer.middlewares=portainer-strip"
      - "traefik.http.middlewares.portainer-strip.stripprefix.prefixes=/portainer"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
```

## Verifying the Setup

```bash
# Access Portainer at the subpath
curl -I https://example.com/portainer/

# Should return HTTP 200 or 302 (redirect to login)
# NOT 404

# Check that assets load correctly
curl -s https://example.com/portainer/api/status | python3 -m json.tool
```

## Common Issues

### 404 on Static Assets

If the page loads but CSS/JS is missing, the browser is requesting assets from the wrong path. Verify that `--base-url` is set to exactly the subpath you're serving at, including the leading slash.

### Redirect Loop

If Portainer redirects to `/portainer/portainer/`, the path prefix is being doubled. Check that your proxy is stripping the prefix exactly once before forwarding.

### Login Page Redirects to Wrong URL

Ensure `--trusted-origins` is set to the domain (`example.com`) and not a full URL or path.

## Conclusion

The `--base-url` flag makes Portainer subpath-aware, allowing it to coexist with other services on the same domain. The key is to ensure your reverse proxy strips the subpath before forwarding requests to Portainer, and that `--trusted-origins` is set to the domain rather than the full URL.
