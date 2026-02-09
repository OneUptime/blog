# How to Run Zitadel in Docker for IAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Zitadel, IAM, Identity Management, Authentication, OAuth2, OIDC, Docker Compose

Description: Deploy Zitadel in Docker as a cloud-native identity and access management platform with OIDC and SAML

---

Zitadel is a cloud-native identity and access management (IAM) platform built in Go. It provides user management, authentication, authorization, and single sign-on capabilities. Zitadel follows a modern architecture with event sourcing, which means every state change is stored as an immutable event. This gives you a complete audit trail of all identity operations. Compared to Keycloak, Zitadel is lighter and easier to operate. Docker is the recommended way to run Zitadel, and the setup requires minimal configuration.

This guide covers deploying Zitadel in Docker, configuring it for application authentication, and integrating it with web applications.

## Quick Start

The fastest way to get Zitadel running for evaluation:

```bash
# Start Zitadel with the embedded CockroachDB (evaluation only)
docker run -d \
  --name zitadel \
  -p 8080:8080 \
  ghcr.io/zitadel/zitadel:latest start-from-init \
  --masterkey "MasterkeyNeedsToHave32Characters" \
  --tlsMode disabled
```

Wait about 30 seconds, then access http://localhost:8080. The default credentials are:

- Username: `zitadel-admin@zitadel.localhost`
- Password: `Password1!`

## Production Setup with PostgreSQL

For production, use an external PostgreSQL database:

```yaml
# docker-compose.yml - Zitadel with PostgreSQL
version: "3.8"

services:
  zitadel:
    image: ghcr.io/zitadel/zitadel:latest
    container_name: zitadel
    command: start-from-init --masterkey "MasterkeyNeedsToHave32Characters" --tlsMode disabled
    ports:
      - "8080:8080"
    environment:
      # Database configuration
      ZITADEL_DATABASE_POSTGRES_HOST: postgres
      ZITADEL_DATABASE_POSTGRES_PORT: 5432
      ZITADEL_DATABASE_POSTGRES_DATABASE: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_USERNAME: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_PASSWORD: zitadel_password
      ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE: disable
      ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME: postgres
      ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD: postgres_password
      ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE: disable
      # External domain configuration
      ZITADEL_EXTERNALDOMAIN: localhost
      ZITADEL_EXTERNALPORT: 8080
      ZITADEL_EXTERNALSECURE: "false"
      # First instance settings
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME: admin
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD: "Admin123!"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: zitadel-db
    environment:
      POSTGRES_DB: zitadel
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

volumes:
  postgres-data:
```

Start the stack:

```bash
# Launch Zitadel
docker compose up -d

# Monitor startup - wait for "server is listening"
docker compose logs -f zitadel
```

## Creating a Project and Application

After logging into the Zitadel console, you need to create a project and register your application. You can do this through the UI or the API:

```bash
# Create a project via the Management API
curl -X POST http://localhost:8080/management/v1/projects \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application",
    "projectRoleAssertion": true
  }'
```

To create an OIDC application:

```bash
# Register an OIDC web application
curl -X POST http://localhost:8080/management/v1/projects/$PROJECT_ID/apps/oidc \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Frontend",
    "redirectUris": ["http://localhost:3000/callback"],
    "postLogoutRedirectUris": ["http://localhost:3000"],
    "responseTypes": ["OIDC_RESPONSE_TYPE_CODE"],
    "grantTypes": ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"],
    "appType": "OIDC_APP_TYPE_WEB",
    "authMethodType": "OIDC_AUTH_METHOD_TYPE_BASIC"
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
import requests
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

## Service User Authentication (Machine-to-Machine)

For backend services that need to authenticate without a user:

```bash
# Create a service user
curl -X POST http://localhost:8080/management/v1/users/machine \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "api-service",
    "name": "API Service Account",
    "description": "Service account for backend API"
  }'
```

```python
# service_auth.py - machine-to-machine authentication with Zitadel
import requests
import jwt
import time

ZITADEL_URL = "http://localhost:8080"
CLIENT_ID = "your-service-user-client-id"
KEY_ID = "your-key-id"
PRIVATE_KEY = open("service-key.pem").read()

def get_service_token():
    """Get an access token using JWT bearer assertion."""
    now = int(time.time())
    payload = {
        "iss": CLIENT_ID,
        "sub": CLIENT_ID,
        "aud": ZITADEL_URL,
        "iat": now,
        "exp": now + 3600,
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

For production deployments, enable TLS:

```yaml
# Updated environment for TLS
environment:
  ZITADEL_EXTERNALSECURE: "true"
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

Zitadel in Docker provides a modern, cloud-native identity management platform. Its event-sourced architecture gives you a complete audit trail, and the built-in multi-tenancy support makes it suitable for SaaS applications. The setup is simpler than Keycloak, and the Go-based architecture means it runs efficiently with modest resources. Start with the PostgreSQL-backed deployment, register your first application, and implement OIDC authentication in your frontend and backend. The management API lets you automate user and application management as your deployment grows.
