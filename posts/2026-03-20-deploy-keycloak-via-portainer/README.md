# How to Deploy Keycloak via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Keycloak, SSO, Identity Management, Docker, OAuth2, OpenID Connect

Description: Learn how to deploy Keycloak, the enterprise-grade identity and access management server, via Portainer with a PostgreSQL backend for production use.

---

Keycloak provides single sign-on (SSO), social login, and user federation out of the box. It implements OpenID Connect and SAML 2.0, making it compatible with almost any modern application. Portainer simplifies ongoing management of the Keycloak container.

## Prerequisites

- Portainer running
- At least 1GB RAM (Keycloak is JVM-based)
- A domain for the `KC_HOSTNAME` setting

## Compose Stack

This stack pairs Keycloak with a PostgreSQL database. Keycloak's built-in H2 database is not recommended for production:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloakpass    # Change this
    volumes:
      - keycloak_db:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    restart: always
    ports:
      - "8082:8080"
    depends_on:
      - postgres
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloakpass       # Must match postgres service
      KC_HOSTNAME: keycloak.example.com  # Your actual hostname
      KC_HTTP_ENABLED: "true"
      KC_HEALTH_ENABLED: "true"          # Enables /health endpoints
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: adminpass # Change this
    # Start in production mode
    command: start

volumes:
  keycloak_db:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `keycloak`.
3. Replace `keycloak.example.com` and passwords, then click **Deploy the stack**.

The first startup takes 30–60 seconds as Keycloak runs database migrations.

## Creating Your First Realm

Navigate to `http://<host>:8082` and log in with the admin credentials. Then:

1. Click **Create Realm** in the left sidebar.
2. Set a realm name (e.g., `myrealm`).
3. Create clients under **Clients > Create client** for each application.
4. Add users under **Users > Create new user**.

## OIDC Integration Example

```python
# Example: validate a Keycloak JWT in Python using python-jose

from jose import jwt

# Fetch the public key from Keycloak's JWKS endpoint
# GET http://keycloak.example.com:8082/realms/myrealm/protocol/openid-connect/certs

def verify_token(token: str, public_key: str, audience: str) -> dict:
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=audience,
    )
```

## Monitoring

Add an HTTP monitor in OneUptime pointing to `http://<host>:8082/health/ready`. Keycloak returns `{"status":"UP"}` when ready to serve traffic. Alert immediately if this endpoint returns anything other than `200`.
