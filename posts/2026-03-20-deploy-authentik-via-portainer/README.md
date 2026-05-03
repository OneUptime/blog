# How to Deploy Authentik via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Authentik, SSO, Identity Provider, Docker, OAuth2, LDAP

Description: Learn how to deploy Authentik, the flexible open-source identity provider, via Portainer using the official Docker Compose stack with PostgreSQL and Redis.

---

Authentik is a feature-rich identity provider supporting OIDC, SAML, LDAP, and SCIM. It ships with a built-in proxy provider that protects applications without code changes, making it ideal for homelab SSO.

## Prerequisites

- Portainer running
- At least 2GB RAM
- PostgreSQL and Redis (included in the stack)

## Compose Stack

Authentik requires a worker process in addition to the server. The following stack deploys all three components:

```yaml
version: "3.8"

services:
  postgresql:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: authentikpass    # Change this
      POSTGRES_USER: authentik
      POSTGRES_DB: authentik
    volumes:
      - authentik_db:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data

  server:
    image: ghcr.io/goauthentik/server:2024.2
    restart: unless-stopped
    command: server
    ports:
      - "9000:9000"    # HTTP
      - "9443:9443"    # HTTPS
    depends_on:
      - postgresql
      - redis
    environment:
      AUTHENTIK_REDIS__HOST: redis
      AUTHENTIK_POSTGRESQL__HOST: postgresql
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentikpass
      AUTHENTIK_SECRET_KEY: changeme-use-long-random-string  # Change this

  worker:
    image: ghcr.io/goauthentik/server:2024.2
    restart: unless-stopped
    # Worker handles background tasks: email, LDAP sync, flows
    command: worker
    depends_on:
      - postgresql
      - redis
    environment:
      AUTHENTIK_REDIS__HOST: redis
      AUTHENTIK_POSTGRESQL__HOST: postgresql
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentikpass
      AUTHENTIK_SECRET_KEY: changeme-use-long-random-string  # Must match server

volumes:
  authentik_db:
  redis_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `authentik`.
3. Update passwords and `AUTHENTIK_SECRET_KEY` (generate with `openssl rand -hex 32`).
4. Click **Deploy the stack**.

Access the setup wizard at `http://<host>:9000/if/flow/initial-setup/`.

## Creating an OIDC Provider

1. Go to **Admin Interface > Applications > Providers > Create**.
2. Choose **OAuth2/OpenID Provider**.
3. Set redirect URIs for your application.
4. Copy the **Client ID** and **Client Secret** into your application's OIDC config.

## Monitoring

OneUptime can monitor `http://<host>:9000/-/health/ready/`. Authentik returns `204 No Content` when the database and Redis are reachable, and `503` if either is down. Set up an alert for any downtime since SSO failures cascade to all protected applications.
