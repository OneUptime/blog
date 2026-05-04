# How to Configure Portainer Base URL for Subpath Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Reverse Proxy, Nginx, Configuration, DevOps

Description: Learn how to configure Portainer to run under a URL subpath (e.g., /portainer/) when deployed behind a reverse proxy.

---

By default, Portainer expects to be served at the root path (`/`). If you need to run Portainer under a subpath like `https://example.com/portainer/`, you must configure both Portainer and your reverse proxy accordingly.

## Configure the Base URL Flag

Start Portainer with the `--base-url` flag to set the subpath:

```bash
# Run Portainer accessible at /portainer/ subpath

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --base-url /portainer
```

## Configure the Reverse Proxy

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/portainer-subpath
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.crt;
    ssl_certificate_key /etc/ssl/private/example.key;

    # Route /portainer/ to Portainer container
    # The trailing slash on proxy_pass strips the /portainer/ prefix before
    # forwarding, as required when Portainer is started with --base-url.
    location /portainer/ {
        proxy_pass https://localhost:9443/;
        proxy_ssl_verify off;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik Configuration

```yaml
# traefik-portainer.yml
http:
  routers:
    portainer:
      rule: "Host(`example.com`) && PathPrefix(`/portainer`)"
      service: portainer
      tls: {}
      middlewares:
        - portainer-strip

  middlewares:
    portainer-strip:
      stripPrefix:
        prefixes:
          - "/portainer"

  services:
    portainer:
      loadBalancer:
        servers:
          - url: "https://portainer:9443"
```

## Docker Compose Example

```yaml
# docker-compose.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    # Set the subpath for the web UI
    command: --base-url /portainer

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl/certs:ro
    depends_on:
      - portainer

volumes:
  portainer_data:
```

## Verify the Subpath Configuration

```bash
# Test that Portainer responds at the subpath
curl -k -o /dev/null -w "%{http_code}" https://example.com/portainer/
# Expected: 200

# Test that the root path is not serving Portainer
curl -k -o /dev/null -w "%{http_code}" https://example.com/
# Expected: 200 or 404 depending on root route
```

## Common Issues

- **WebSocket errors**: Ensure your reverse proxy passes `Upgrade` and `Connection` headers for console access
- **Asset loading failures**: Verify the `--base-url` path matches exactly what's configured in the reverse proxy
- **Redirect loops**: Check that the proxy isn't rewriting URLs that Portainer already prepends the base URL to

---

*Deploy and monitor your Portainer instances with [OneUptime](https://oneuptime.com) for full observability.*
