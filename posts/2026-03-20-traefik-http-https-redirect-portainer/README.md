# How to Configure Traefik HTTP to HTTPS Redirect for Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, HTTPS, Redirect, Security

Description: Learn how to configure Traefik to automatically redirect all HTTP traffic to HTTPS for Portainer and all other services, ensuring secure access at all times.

## Why Force HTTPS?

HTTP traffic is unencrypted and susceptible to interception. Configuring an HTTP to HTTPS redirect at the Traefik level ensures that all clients - whether they type `http://` or click an old bookmark - are automatically redirected to the secure version.

## Method 1: Global Redirect via EntryPoint (Recommended)

Apply the redirect at the entrypoint level so it applies to all services automatically:

```yaml
# traefik.yml

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure    # Redirect to the HTTPS entrypoint
          scheme: https
          permanent: true  # 301 redirect (SEO-friendly)
  websecure:
    address: ":443"
```

With this configuration, any request to `http://portainer.example.com` automatically becomes a `301 Moved Permanently` redirect to `https://portainer.example.com`.

## Method 2: Per-Router Redirect Middleware

For selective redirects (only certain services), use a middleware on specific routers:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "traefik.enable=true"

      # HTTP router - only purpose is to redirect
      - "traefik.http.routers.portainer-http.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer-http.entrypoints=web"
      - "traefik.http.routers.portainer-http.middlewares=redirect-to-https"

      # HTTPS router - serves actual traffic
      - "traefik.http.routers.portainer-https.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer-https.entrypoints=websecure"
      - "traefik.http.routers.portainer-https.tls=true"
      - "traefik.http.routers.portainer-https.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

      # Define the redirect middleware
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"
```

## Testing the Redirect

```bash
# Test that HTTP returns a redirect
curl -I http://portainer.example.com
# Expected output:
# HTTP/1.1 301 Moved Permanently
# Location: https://portainer.example.com/

# Follow redirects
curl -IL http://portainer.example.com
# Should show 301 → 200
```

## HSTS: Preventing Future HTTP Connections

After verifying HTTPS works, add HSTS headers to tell browsers to always use HTTPS:

```yaml
labels:
  # Add HSTS header to all HTTPS responses
  - "traefik.http.middlewares.hsts.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.hsts.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.hsts.headers.stsPreload=true"
  - "traefik.http.routers.portainer-https.middlewares=hsts"
```

## Common Issue: Redirect Loop

If you see a redirect loop, check:

1. Traefik is not receiving traffic on both ports from the same proxy
2. Backend service is not itself redirecting to HTTPS
3. Only one entrypoint handles the redirect, not both

```bash
# Check for redirect loops
curl -IL --max-redirs 5 http://portainer.example.com
# Should stop at the HTTPS URL, not loop
```

## Full Working Configuration

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.6
    ports:
      - "80:80"
      - "443:443"
    command:
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
      - "--entrypoints.websecure.address=:443"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_data:/data

volumes:
  traefik_data:
```

## Conclusion

HTTP to HTTPS redirection at the Traefik entrypoint level is the simplest and most effective approach. It applies to all services behind Traefik, including Portainer, without requiring per-container configuration, and works correctly with Let's Encrypt certificate validation since Traefik handles the HTTP-01 challenge before applying the redirect.
