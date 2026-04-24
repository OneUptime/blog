# How to Deploy Authelia via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Authelia, SSO, 2FA, Reverse Proxy, Self-Hosted

Description: Deploy Authelia via Portainer as a lightweight SSO and two-factor authentication gateway that integrates with Traefik or Nginx for protecting self-hosted applications.

## Introduction

Authelia is a lightweight, open-source authentication and authorization server that works as a forward auth middleware for reverse proxies. It provides SSO, 2FA (TOTP, WebAuthn, Duo), and fine-grained access policies. Unlike Keycloak, it's extremely resource-efficient.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    environment:
      TZ: America/New_York
    volumes:
      - /opt/authelia:/config
    ports:
      - "9091:9091"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.authelia.rule=Host(`auth.example.com`)"
      - "traefik.http.routers.authelia.entrypoints=websecure"
      - "traefik.http.routers.authelia.tls.certresolver=letsencrypt"
      - "traefik.http.services.authelia.loadbalancer.server.port=9091"
      # Middleware definition
      - "traefik.http.middlewares.authelia.forwardAuth.address=http://authelia:9091/api/authz/forward-auth"
      - "traefik.http.middlewares.authelia.forwardAuth.trustForwardHeader=true"
      - "traefik.http.middlewares.authelia.forwardAuth.authResponseHeaders=Remote-User,Remote-Groups,Remote-Email,Remote-Name"
    networks:
      - traefik-public
    restart: unless-stopped

  # Redis for session storage
  authelia-redis:
    image: redis:7-alpine
    container_name: authelia-redis
    networks:
      - traefik-public
    restart: unless-stopped

networks:
  traefik-public:
    external: true
```

## Authelia Configuration

Create `/opt/authelia/configuration.yml`:

```yaml
# configuration.yml

server:
  address: 'tcp://0.0.0.0:9091/'

log:
  level: warn

theme: dark

identity_validation:
  reset_password:
    jwt_secret: your_jwt_secret_here_change_this

authentication_backend:
  file:
    path: /config/users_database.yml

session:
  name: authelia_session
  secret: session_secret_here_change_this
  expiration: 12h
  inactivity: 5m
  cookies:
    - domain: example.com
      authelia_url: https://auth.example.com
      default_redirection_url: https://home.example.com
  redis:
    host: authelia-redis
    port: 6379

regulation:
  max_retries: 3
  find_time: 10m
  ban_time: 12h

storage:
  encryption_key: storage_encryption_key_here_change_this
  local:
    path: /config/db.sqlite3

notifier:
  smtp:
    address: 'submission://smtp.example.com:587'
    username: authelia@example.com
    password: smtp_password
    sender: authelia@example.com
    tls:
      skip_verify: false

access_control:
  default_policy: deny
  rules:
    # Public resources - no auth required
    - domain: public.example.com
      policy: bypass
    
    # Admin panel - 2FA required
    - domain: admin.example.com
      policy: two_factor
      subject: "group:admins"
    
    # Internal apps - single factor
    - domain: "*.example.com"
      policy: one_factor
      subject: "group:users"
```

## Create Users File

Create `/opt/authelia/users_database.yml`:

```yaml
users:
  john:
    disabled: false
    displayname: John Doe
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."  # Use authelia crypto hash generate argon2
    email: john@example.com
    groups:
      - admins
      - users
```

Generate a password hash:

```bash
docker exec authelia authelia crypto hash generate argon2 --password 'your_password'
```

## Protecting Services with Authelia

Add to any Traefik-managed service:

```yaml
services:
  myapp:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`app.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      # Apply Authelia middleware
      - "traefik.http.routers.myapp.middlewares=authelia@docker"
```

## Conclusion

Authelia deployed via Portainer provides a lightweight but powerful authentication gateway for your entire self-hosted application stack. With 2FA support, session management, and Traefik integration, it adds enterprise-level authentication to any service with just a label addition. The minimal resource requirements make it suitable even for Raspberry Pi deployments.
