# How to Deploy Authelia via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Authelia, Authentication, SSO, Docker, Reverse Proxy, 2FA

Description: Learn how to deploy Authelia, the open-source authentication and authorization server, via Portainer to add two-factor authentication to your self-hosted services.

---

Authelia acts as an authentication middleware for reverse proxies like Nginx, Traefik, or Caddy. It adds login screens, TOTP two-factor authentication, and access control rules in front of any application without modifying the app itself.

## Prerequisites

- Portainer running
- Traefik or Nginx reverse proxy already deployed
- Redis for session storage (included in the stack below)

## Compose Stack

This stack deploys Authelia with a Redis session backend and an SQLite user database (suitable for small teams):

```yaml
version: "3.8"

services:
  authelia:
    image: authelia/authelia:latest
    restart: unless-stopped
    ports:
      - "9091:9091"
    volumes:
      - authelia_config:/config
    environment:
      TZ: UTC
    # Authelia reads all config from /config/configuration.yml
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  authelia_config:
  redis_data:
```

## Authelia Configuration

Write `/config/configuration.yml` into the `authelia_config` volume before starting:

```yaml
# /config/configuration.yml

server:
  address: 'tcp://0.0.0.0:9091/'

log:
  level: info

totp:
  issuer: example.com

identity_validation:
  reset_password:
    jwt_secret: a_very_long_random_secret_here   # Change this

authentication_backend:
  file:
    path: /config/users_database.yml

access_control:
  default_policy: deny
  rules:
    - domain: "*.example.com"
      policy: two_factor

session:
  secret: another_long_random_secret        # Change this
  expiration: 1h
  inactivity: 5m
  cookies:
    - name: authelia_session
      domain: example.com
      authelia_url: https://auth.example.com
      default_redirection_url: https://example.com
  redis:
    host: redis
    port: 6379

storage:
  encryption_key: a_random_storage_encryption_key   # Change this (min 20 chars)
  local:
    path: /config/db.sqlite3

notifier:
  filesystem:
    filename: /config/notification.txt
```

## User Database

Create `/config/users_database.yml` to define users:

```yaml
# /config/users_database.yml
users:
  admin:
    displayname: "Admin User"
    # Generate a password hash: docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password 'yourpassword'
    password: "$argon2id$v=19$m=65536,t=1,p=8$..."
    email: admin@example.com
    groups:
      - admins
```

## Monitoring

Use OneUptime to monitor `http://<host>:9091/api/health`. Authelia returns `{"status":"OK"}` when healthy. Alert if the endpoint is unreachable, as a down Authelia server will block access to all protected services.
