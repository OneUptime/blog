# How to Run Zitadel in Docker for IAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Zitadel, IAM, Identity Management, Authentication, OAuth2, OIDC, Docker Compose

Description: Deploy Zitadel in Docker as a cloud-native identity and access management platform with OIDC and SAML

---

Zitadel is a cloud-native identity and access management (IAM) platform built in Go. It provides user management, authentication, authorization, and single sign-on capabilities. Zitadel follows a modern architecture with event sourcing, which means every state change is stored as an immutable event. This gives you a complete audit trail of all identity operations. Compared to Keycloak, Zitadel is lighter and easier to operate. Docker is the recommended way to run Zitadel, and the setup requires minimal configuration.

This guide covers deploying Zitadel in Docker, configuring it for application authentication, and integrating it with web applications. It also covers a change introduced in Zitadel v4: the login UI now runs as its own `zitadel-login` container, separate from the main Zitadel image.

## Quick Start

The fastest way to get Zitadel running for evaluation is with a local PostgreSQL container:

```bash
# Start PostgreSQL for Zitadel
docker network create zitadel
docker run -d \
  --name zitadel-db \
  --network zitadel \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  postgres:17-alpine

# Start Zitadel (evaluation only - single container with the bundled legacy login)
docker run -d \
  --name zitadel \
  --network zitadel \
  -p 8080:8080 \
  -e ZITADEL_DATABASE_POSTGRES_DSN="postgresql://root:postgres@zitadel-db:5432/postgres?sslmode=disable" \
  -e ZITADEL_EXTERNALSECURE=false \
  -e ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED=false \
  ghcr.io/zitadel/zitadel:v4.15.3 start-from-init \
  --masterkey "MasterkeyNeedsToHave32Characters" \
  --tlsMode disabled
```

Wait about 30 seconds, then access http://localhost:8080/ui/console?login_hint=zitadel-admin@zitadel.localhost. The default credentials are:

- Username: `zitadel-admin@zitadel.localhost`
- Password: `Password1!`

Two details in that command reflect how Zitadel has changed, and both matter:

- The image is pinned to `v4.15.3` instead of `latest`. Zitadel v4 is a major release with breaking changes, and `latest` will eventually roll forward to v5 and beyond. Pin a tag so this setup keeps behaving the way the tutorial describes.
- `ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED=false` tells the instance to use the legacy login UI that is still bundled inside the main Zitadel container (served at `/ui/login`). Without it, this single container would have no login screen at all. The next section explains why.

## Where Is the Login Service? Zitadel v4 and Login V2

If you have looked at Zitadel's official Docker Compose example, you may have noticed a second container named `zitadel-login` that the quick start above does not have. On current versions that is not a detail you can skip, so here is what changed.

Through Zitadel v2 and v3, the login screens were rendered by the Go core itself and served from the same container at `/ui/login`. There was nothing else to run. Starting with Zitadel v4 (which went GA in mid-2025), the login experience was rewritten as **Login V2**: a standalone Next.js application that ships as its own container image, `ghcr.io/zitadel/zitadel-login`. It listens on port 3000, is served under the path `/ui/v2/login`, and talks back to the Zitadel core over the API. It authenticates as a machine user named `login-client` that holds the `IAM_LOGIN_CLIENT` role, using a personal access token (PAT) that the core generates automatically on first startup.

The catch is the default. **New v4 instances are created with Login V2 marked as required**, which means the core no longer serves login pages itself - it redirects every sign-in to `/ui/v2/login`. If you run only the core container and nothing is serving that path, the interactive login breaks even though the API and the console assets are still up. That is exactly the gap a single-container setup leaves, and why the quick start above had to opt back into the bundled login.

You have two ways to get a working login:

1. **Run the separate `zitadel-login` container** alongside the core, behind a reverse proxy that serves both under one origin. This is the supported v4 architecture and what the production compose below sets up.
2. **Opt back into the bundled legacy login** by setting `ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED=false`, as the quick start does. The login screens are then served from the core at `/ui/login` again, which is convenient for local evaluation. Login V1 still ships in v4, but it is on a deprecation path for a future major release, so prefer Login V2 for anything long-lived.

## Production Setup with PostgreSQL

For production, run the full v4 architecture: PostgreSQL, the Zitadel core, the separate Login V2 container, and a reverse proxy that serves all of them under a single origin. Traefik is used here because Zitadel's own Compose example uses it, but any reverse proxy that can route by path will do:

```yaml
# docker-compose.yml - Zitadel v4 with PostgreSQL, the Login V2 container, and Traefik
name: zitadel

services:
  # Reverse proxy: routes /ui/v2/login to the login container and everything
  # else to the Zitadel core, all on one origin (http://localhost:8080).
  proxy:
    image: traefik:v3.6.8
    restart: unless-stopped
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=zitadel
      - --entrypoints.web.address=:80
      - --ping=true
      - --ping.entrypoint=web
    ports:
      - "8080:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - zitadel
    depends_on:
      zitadel:
        condition: service_healthy
      zitadel-login:
        condition: service_healthy

  # Zitadel core: API and console. Serves everything except the Login V2 UI.
  zitadel:
    image: ghcr.io/zitadel/zitadel:v4.15.3
    restart: unless-stopped
    user: "0"
    command: start-from-init --masterkey "MasterkeyNeedsToHave32Characters"
    environment:
      ZITADEL_PORT: 8080
      ZITADEL_EXTERNALDOMAIN: localhost
      ZITADEL_EXTERNALPORT: 8080
      ZITADEL_EXTERNALSECURE: "false"
      ZITADEL_TLS_ENABLED: "false"
      ZITADEL_DATABASE_POSTGRES_DSN: "postgresql://postgres:postgres@postgres:5432/zitadel?sslmode=disable"
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORDCHANGEREQUIRED: "false"
      # Bootstrap the login-client machine user and write its PAT to a shared volume.
      ZITADEL_FIRSTINSTANCE_LOGINCLIENTPATPATH: /zitadel/bootstrap/login-client.pat
      ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_MACHINE_USERNAME: login-client
      ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_MACHINE_NAME: Login client
      ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_PAT_EXPIRATIONDATE: "2099-01-01T00:00:00Z"
      # Tell the core where the Login V2 UI lives so it can redirect sign-in there.
      ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED: "true"
      ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI: "http://localhost:8080/ui/v2/login/"
      ZITADEL_OIDC_DEFAULTLOGINURLV2: "http://localhost:8080/ui/v2/login/login?authRequest="
      ZITADEL_OIDC_DEFAULTLOGOUTURLV2: "http://localhost:8080/ui/v2/login/logout?post_logout_redirect="
    healthcheck:
      test: ["CMD", "/app/zitadel", "ready"]
      interval: 10s
      timeout: 30s
      retries: 12
      start_period: 20s
    volumes:
      - zitadel-bootstrap:/zitadel/bootstrap:rw
    networks:
      - zitadel
    depends_on:
      postgres:
        condition: service_healthy
    labels:
      - traefik.enable=true
      - traefik.docker.network=zitadel
      - traefik.http.services.zitadel.loadbalancer.server.port=8080
      - traefik.http.services.zitadel.loadbalancer.server.scheme=h2c
      - traefik.http.routers.zitadel.rule=Host(`localhost`) && !PathPrefix(`/ui/v2/login`)
      - traefik.http.routers.zitadel.entrypoints=web
      - traefik.http.routers.zitadel.service=zitadel
      - traefik.http.routers.zitadel.priority=100

  # Login V2: the standalone Next.js login UI, shipped as its own image.
  zitadel-login:
    image: ghcr.io/zitadel/zitadel-login:v4.15.3
    restart: unless-stopped
    user: "0"
    environment:
      ZITADEL_API_URL: http://zitadel:8080
      NEXT_PUBLIC_BASE_PATH: /ui/v2/login
      # Reads the PAT the core wrote, to authenticate as the IAM_LOGIN_CLIENT user.
      ZITADEL_SERVICE_USER_TOKEN_FILE: /zitadel/bootstrap/login-client.pat
      CUSTOM_REQUEST_HEADERS: Host:localhost,X-Forwarded-Proto:http
    healthcheck:
      test: ["CMD", "/bin/sh", "-c", "node /app/healthcheck.mjs http://localhost:3000/ui/v2/login/healthy"]
      interval: 10s
      timeout: 30s
      retries: 12
      start_period: 20s
    volumes:
      - zitadel-bootstrap:/zitadel/bootstrap:ro
    networks:
      - zitadel
    depends_on:
      zitadel:
        condition: service_healthy
    labels:
      - traefik.enable=true
      - traefik.docker.network=zitadel
      - traefik.http.services.zitadel-login.loadbalancer.server.port=3000
      - traefik.http.routers.zitadel-login.rule=Host(`localhost`) && PathPrefix(`/ui/v2/login`)
      - traefik.http.routers.zitadel-login.entrypoints=web
      - traefik.http.routers.zitadel-login.service=zitadel-login
      - traefik.http.routers.zitadel-login.priority=250

  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: zitadel
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d zitadel -U postgres"]
      interval: 10s
      timeout: 30s
      retries: 10
      start_period: 20s
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - zitadel

networks:
  zitadel:
    name: zitadel

volumes:
  postgres-data:
  zitadel-bootstrap:
```

Start the stack:

```bash
# Launch the full stack and wait for every container to report healthy
docker compose up -d --wait

# Monitor startup if you want to watch the logs
docker compose logs -f zitadel zitadel-login
```

Once the containers are healthy, open http://localhost:8080/ui/console. Signing in redirects you to the Login V2 UI at `/ui/v2/login`, which the proxy routes to the `zitadel-login` container. Log in with the default admin account `zitadel-admin@zitadel.localhost` and password `Password1!`.

A few things are worth understanding about how the pieces fit together:

- On first startup the core creates the `login-client` machine user and writes its PAT to the shared `zitadel-bootstrap` volume. The `zitadel-login` container reads that same file to authenticate against the core's API.
- The `ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI` and `ZITADEL_OIDC_DEFAULTLOGINURLV2` values tell the core where to send users for login. They must match the public URL the proxy exposes (`http://localhost:8080/ui/v2/login`).
- Traefik routes `/ui/v2/login` to the login container on port 3000 and sends everything else to the core on port 8080 over h2c (the core speaks HTTP/2 cleartext for its gRPC and Connect APIs).

Use `start-from-init` only for the initial database setup. For upgrades on an existing production database, run the setup and runtime phases separately or use `start-from-setup`.

## Creating a Project and Application

After logging into the Zitadel console, you need to create a project and register your application. You can do this through the UI or the API:

```bash
# Create a project via the Project API
curl -X POST http://localhost:8080/zitadel.project.v2.ProjectService/CreateProject \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Connect-Protocol-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "'"$ORG_ID"'",
    "name": "My Application",
    "projectRoleAssertion": true
  }'
```

To create an OIDC application:

```bash
# Register an OIDC browser application
curl -X POST http://localhost:8080/zitadel.application.v2.ApplicationService/CreateApplication \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Connect-Protocol-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'"$PROJECT_ID"'",
    "name": "Web Frontend",
    "oidcConfiguration": {
      "redirectUris": ["http://localhost:3000/callback"],
      "postLogoutRedirectUris": ["http://localhost:3000"],
      "responseTypes": ["OIDC_RESPONSE_TYPE_CODE"],
      "grantTypes": ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"],
      "applicationType": "OIDC_APP_TYPE_USER_AGENT",
      "authMethodType": "OIDC_AUTH_METHOD_TYPE_NONE",
      "accessTokenType": "OIDC_TOKEN_TYPE_JWT",
      "developmentMode": true
    }
  }'
```

## Integrating with a React Application

Here is how to integrate Zitadel with a React frontend using the OIDC client library:

```javascript
// auth.js - Zitadel OIDC configuration for React
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const userManager = new UserManager({
  authority: "http://localhost:8080",
  client_id: "your-client-id-from-zitadel",
  redirect_uri: "http://localhost:3000/callback",
  post_logout_redirect_uri: "http://localhost:3000",
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});

// Redirect to Zitadel login page
export async function login() {
  await userManager.signinRedirect();
}

// Handle the callback after login
export async function handleCallback() {
  const user = await userManager.signinRedirectCallback();
  return user;
}

// Get the current user
export async function getUser() {
  return await userManager.getUser();
}

// Logout
export async function logout() {
  await userManager.signoutRedirect();
}

// Get access token for API calls
export async function getAccessToken() {
  const user = await userManager.getUser();
  return user?.access_token;
}
```

## Backend API Authentication

Validate Zitadel tokens in your backend API:

```python
# auth_middleware.py - validate Zitadel JWT tokens in a Python API
import jwt
from functools import wraps
from flask import request, jsonify

ZITADEL_DOMAIN = "http://localhost:8080"
JWKS_URL = f"{ZITADEL_DOMAIN}/oauth/v2/keys"

# Cache the JWKS keys
jwks_client = jwt.PyJWKClient(JWKS_URL)

def require_auth(f):
    """Decorator to require valid Zitadel authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401

        token = auth_header.split(" ")[1]

        try:
            # Get the signing key from Zitadel's JWKS endpoint
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            # Decode and validate the token
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience="your-project-id",
                issuer=ZITADEL_DOMAIN,
            )
            request.user = payload
        except jwt.exceptions.InvalidTokenError as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated

# Usage in a Flask route
# @app.route("/api/data")
# @require_auth
# def get_data():
#     user_id = request.user["sub"]
#     return jsonify({"user": user_id, "data": "protected content"})
```

## Service Account Authentication (Machine-to-Machine)

For backend services that need to authenticate without a user:

```bash
# Create a service account
curl -X POST http://localhost:8080/v2/users/new \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machine": {
      "username": "api-service"
    }
  }'

# Generate and download a private key for the service account
curl -X POST http://localhost:8080/v2/users/$SERVICE_USER_ID/keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```python
# service_auth.py - machine-to-machine authentication with Zitadel
import requests
import jwt
import time

ZITADEL_URL = "http://localhost:8080"
SERVICE_USER_ID = "your-service-user-id"
KEY_ID = "your-key-id"
PRIVATE_KEY = open("service-key.pem").read()

def get_service_token():
    """Get an access token using JWT bearer assertion."""
    now = int(time.time())
    payload = {
        "iss": SERVICE_USER_ID,
        "sub": SERVICE_USER_ID,
        "aud": ZITADEL_URL,
        "iat": now,
        "exp": now + 300,
    }

    assertion = jwt.encode(payload, PRIVATE_KEY, algorithm="RS256",
                          headers={"kid": KEY_ID})

    response = requests.post(f"{ZITADEL_URL}/oauth/v2/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "scope": "openid",
        "assertion": assertion,
    })

    return response.json()["access_token"]
```

## Custom Branding

Zitadel supports custom branding through the console. You can also configure it via API:

```bash
# Set custom branding colors
curl -X PUT http://localhost:8080/management/v1/policies/label \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryColor": "#1976D2",
    "backgroundColor": "#FAFAFA",
    "warnColor": "#FF5722",
    "fontColor": "#212121",
    "hideLoginNameSuffix": true
  }'
```

## Enabling TLS for Production

In the multi-container layout above, terminate TLS at the reverse proxy and let it talk to the core over plain HTTP internally. Switch the public scheme to HTTPS so the core issues correct URLs, and point the login URLs at your real domain:

```yaml
# On the zitadel (core) service
environment:
  ZITADEL_EXTERNALSECURE: "true"
  ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI: "https://auth.example.com/ui/v2/login/"
  ZITADEL_OIDC_DEFAULTLOGINURLV2: "https://auth.example.com/ui/v2/login/login?authRequest="
  ZITADEL_OIDC_DEFAULTLOGOUTURLV2: "https://auth.example.com/ui/v2/login/logout?post_logout_redirect="

# On the zitadel-login service, advertise HTTPS to the core
# CUSTOM_REQUEST_HEADERS: Host:auth.example.com,X-Forwarded-Proto:https
```

Configure the certificates on Traefik (for example with a Let's Encrypt resolver on a `websecure` entrypoint). Zitadel's official Compose repository ships TLS overlays for exactly this. If you are not running a reverse proxy, the core can serve TLS itself instead:

```yaml
# Serving TLS directly from the core (no proxy in front)
environment:
  ZITADEL_EXTERNALSECURE: "true"
  ZITADEL_TLS_ENABLED: "true"
  ZITADEL_TLS_CERTPATH: /certs/fullchain.pem
  ZITADEL_TLS_KEYPATH: /certs/privkey.pem
volumes:
  - ./certs:/certs:ro
```

## Backup and Restore

Back up the PostgreSQL database:

```bash
# Create a database backup
docker exec zitadel-db pg_dump -U postgres zitadel > zitadel-backup.sql

# Restore from backup
docker exec -i zitadel-db psql -U postgres zitadel < zitadel-backup.sql
```

## Conclusion

Zitadel in Docker provides a modern, cloud-native identity management platform. Its event-sourced architecture gives you a complete audit trail, and the built-in multi-tenancy support makes it suitable for SaaS applications. The setup is simpler than Keycloak, and the Go-based architecture means it runs efficiently with modest resources. Start with the PostgreSQL-backed deployment, register your first application, and implement OIDC authentication in your frontend and backend. The Zitadel APIs let you automate user and application management as your deployment grows.
