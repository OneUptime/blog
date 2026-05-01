# How to Deploy Vaultwarden (Bitwarden) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Vaultwarden, Bitwarden, Password Manager, Docker, Self-Hosting, Security

Description: Learn how to deploy Vaultwarden, the lightweight self-hosted Bitwarden-compatible password manager, via Portainer with admin panel and HTTPS configuration.

---

Vaultwarden is a community-written Bitwarden server implementation in Rust. It uses a fraction of the resources of the official server while remaining compatible with official Bitwarden clients (browser extensions, mobile apps, desktop apps).

## Prerequisites

- Portainer running
- HTTPS is effectively required for Bitwarden clients on a public domain (use a reverse proxy)

## Compose Stack

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:8188:80"
    environment:
      # Admin panel at /admin - use a long random token
      ADMIN_TOKEN: "changeme-use-openssl-rand-base64-32"
      # Enable WebSocket notifications
      ENABLE_WEBSOCKET: "true"
      # Set your domain - HTTPS is required for clients
      DOMAIN: "https://vault.example.com"
      # Disable open registration after creating your account
      SIGNUPS_ALLOWED: "true"
    volumes:
      - vaultwarden_data:/data

volumes:
  vaultwarden_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `vaultwarden`.
3. Generate a strong `ADMIN_TOKEN` with `openssl rand -base64 32`.
4. Set `DOMAIN` to your HTTPS URL.
5. Click **Deploy the stack**.

## Configuring HTTPS with Nginx

Vaultwarden must be accessed over HTTPS. Add a minimal Nginx reverse proxy config:

```nginx
# /etc/nginx/sites-available/vaultwarden

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      "";
}

server {
    listen 80;
    server_name vault.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name vault.example.com;

    # SSL certificates (use Let's Encrypt or Cloudflare)
    ssl_certificate /etc/letsencrypt/live/vault.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.example.com/privkey.pem;

    client_max_body_size 525M;
    proxy_http_version 1.1;

    location / {
        proxy_pass http://127.0.0.1:8188;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Post-Deployment

1. Open `https://vault.example.com` and create your first account.
2. Then set `SIGNUPS_ALLOWED: "false"` in the stack and redeploy to prevent unwanted registrations.
3. Access the admin panel at `https://vault.example.com/admin` with your `ADMIN_TOKEN`.

## Monitoring

Use OneUptime to monitor `https://vault.example.com/alive`. Vaultwarden returns `200 OK` with a timestamp body on this endpoint and uses it for its own healthcheck. Downtime means all clients lose vault access, so configure a low-latency alert.
