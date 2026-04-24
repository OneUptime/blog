# How to Deploy Vaultwarden (Bitwarden) via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Vaultwarden, Bitwarden, Password Manager, Self-Hosted, Security

Description: Deploy Vaultwarden (a Bitwarden-compatible server) via Portainer for a self-hosted password manager that works with all official Bitwarden clients.

## Introduction

Vaultwarden is an unofficial, lightweight implementation of the Bitwarden server API written in Rust. It's compatible with all official Bitwarden clients (browser extensions, desktop apps, mobile apps) while using significantly less resources than the official server. Deploy via Portainer for a private, self-hosted password manager.

## Deploy as a Stack

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    environment:
      # Required: Set your domain URL
      DOMAIN: https://vault.example.com
      
      # Admin panel (generate token with: openssl rand -hex 32)
      ADMIN_TOKEN: your_generated_admin_token
      
      # Disable user registration after initial setup
      SIGNUPS_ALLOWED: "true"   # Set to false after creating your account
      
      # Email settings
      SMTP_HOST: smtp.example.com
      SMTP_FROM: vaultwarden@example.com
      SMTP_PORT: 587
      SMTP_SECURITY: starttls
      SMTP_USERNAME: vaultwarden@example.com
      SMTP_PASSWORD: smtp_password
      
      # Security
      INVITATION_ORG_NAME: "Your Organization"
      
      # Performance
      ROCKET_WORKERS: 2
    volumes:
      - vaultwarden_data:/data
    ports:
      - "8080:80"    # HTTP (put behind HTTPS reverse proxy)
    restart: unless-stopped

volumes:
  vaultwarden_data:
```

## HTTPS Requirement

Vaultwarden should be served over **HTTPS** for proper client and web vault operation. The recommended way is to use Traefik or Caddy as a reverse proxy:

### With Traefik

```yaml
services:
  vaultwarden:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vaultwarden.rule=Host(`vault.example.com`)"
      - "traefik.http.routers.vaultwarden.entrypoints=websecure"
      - "traefik.http.routers.vaultwarden.tls.certresolver=letsencrypt"
      - "traefik.http.services.vaultwarden.loadbalancer.server.port=80"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

### With Caddy

```caddyfile
vault.example.com {
    reverse_proxy vaultwarden:80
}
```

## Initial Setup

1. Access `https://vault.example.com` and create your account
2. Access the admin panel at `https://vault.example.com/admin` using your ADMIN_TOKEN
3. After creating your account(s), set `SIGNUPS_ALLOWED: "false"` in the stack

## Configuring Bitwarden Clients

### Browser Extension

1. Open the Bitwarden extension on the login or registration screen
2. Select **Logging in on** and choose **Self-hosted**
3. Enter `https://vault.example.com` as the **Server URL**
4. Click **Save** and log in with your account

### Desktop App (Windows/Mac/Linux)

1. Open Bitwarden on the login or registration screen
2. Select **Logging in on** and choose **Self-hosted**
3. Enter `https://vault.example.com` as the **Server URL**
4. Click **Save** and log in

### Mobile App (iOS/Android)

1. Open Bitwarden on the login or registration screen
2. Tap **Logging in on** and select **Self-hosted**
3. Enter `https://vault.example.com` as the **Server URL**
4. Tap **Save** and log in

## Enabling 2FA

1. In the web vault, go to **Settings > Security > Two-step login**
2. Enable TOTP authenticator
3. Scan QR code with your authenticator app

## Backup Vaultwarden

```bash
# Backup Vaultwarden data

docker stop vaultwarden

docker run --rm \
  --volumes-from vaultwarden \
  -v /backups:/backup \
  alpine tar czf /backup/vaultwarden-$(date +%Y%m%d).tar.gz /data

docker start vaultwarden
```

## Conclusion

Vaultwarden deployed via Portainer gives you a private, self-hosted password manager that's compatible with official Bitwarden clients. HTTPS is effectively required for proper client and web vault operation, and a reverse proxy like Traefik or Caddy is the recommended way to provide it. Once set up, it provides a Bitwarden-compatible experience with complete control over your password data.
