# How to Run Authentik in Docker for Identity Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Authentik, Identity Provider, SSO, Authentication, OAuth, SAML, Docker Compose

Description: Deploy Authentik in Docker as a self-hosted identity provider with SSO, OAuth2, SAML, and LDAP support

---

Authentik is an open-source identity provider that handles authentication for your applications. It supports OAuth2, OpenID Connect, SAML, LDAP, and proxy authentication. Think of it as a self-hosted alternative to Auth0 or Okta. Authentik provides single sign-on (SSO), multi-factor authentication, user management, and social login integration. Running it in Docker is the recommended deployment method, and the project provides official Docker Compose files that work out of the box.

This guide covers deploying Authentik, configuring it as an identity provider, integrating applications, and setting up common authentication flows.

## Prerequisites

Authentik requires:
- Docker or Podman with Docker Compose V2
- At least 2 CPU cores and 2 GB of RAM
- A domain name (for production deployments)

Generate the required secret key before starting:

```bash
# Generate a secret key for Authentik

echo "AUTHENTIK_SECRET_KEY=$(openssl rand -base64 60 | tr -d '\n')" >> .env

# Generate a PostgreSQL password
echo "PG_PASS=$(openssl rand -base64 36 | tr -d '\n')" >> .env
```

## Docker Compose Deployment

Here is the complete Docker Compose configuration:

```yaml
# docker-compose.yml - Authentik full deployment
services:
  postgresql:
    image: docker.io/library/postgres:16-alpine
    container_name: authentik-db
    env_file:
      - .env
    volumes:
      - database:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${PG_DB:-authentik}
      POSTGRES_USER: ${PG_USER:-authentik}
      POSTGRES_PASSWORD: ${PG_PASS:?database password required}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d $${POSTGRES_DB} -U $${POSTGRES_USER}"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s
    restart: unless-stopped

  server:
    image: ${AUTHENTIK_IMAGE:-ghcr.io/goauthentik/server}:${AUTHENTIK_TAG:-2026.5.2}
    container_name: authentik-server
    command: server
    ports:
      - "${COMPOSE_PORT_HTTP:-9000}:9000"    # HTTP
      - "${COMPOSE_PORT_HTTPS:-9443}:9443"   # HTTPS
    env_file:
      - .env
    environment:
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY:?secret key required}
      AUTHENTIK_POSTGRESQL__HOST: postgresql
      AUTHENTIK_POSTGRESQL__USER: ${PG_USER:-authentik}
      AUTHENTIK_POSTGRESQL__NAME: ${PG_DB:-authentik}
      AUTHENTIK_POSTGRESQL__PASSWORD: ${PG_PASS}
    volumes:
      - ./data:/data
      - ./custom-templates:/templates
    depends_on:
      postgresql:
        condition: service_healthy
    restart: unless-stopped
    shm_size: 512mb

  worker:
    image: ${AUTHENTIK_IMAGE:-ghcr.io/goauthentik/server}:${AUTHENTIK_TAG:-2026.5.2}
    container_name: authentik-worker
    command: worker
    env_file:
      - .env
    environment:
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY:?secret key required}
      AUTHENTIK_POSTGRESQL__HOST: postgresql
      AUTHENTIK_POSTGRESQL__USER: ${PG_USER:-authentik}
      AUTHENTIK_POSTGRESQL__NAME: ${PG_DB:-authentik}
      AUTHENTIK_POSTGRESQL__PASSWORD: ${PG_PASS}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data
      - ./certs:/certs
      - ./custom-templates:/templates
    depends_on:
      postgresql:
        condition: service_healthy
    restart: unless-stopped
    shm_size: 512mb
    user: root

volumes:
  database:
```

Start Authentik:

```bash
# Launch all Authentik services
docker compose pull
docker compose up -d

# Monitor startup
docker compose logs -f server
```

## Initial Setup

Once the server is running, create the initial admin account:

```bash
# Navigate to the setup URL
# http://localhost:9000/if/flow/initial-setup/
```

Open http://localhost:9000/if/flow/initial-setup/ in your browser. Create the admin (akadmin) account with a strong password. After that, you can access the admin interface at http://localhost:9000/if/admin/.

## Configuring an OAuth2/OpenID Connect Provider

Set up Authentik as an OAuth2 provider for your applications. This is done through the admin interface, but here is the API approach:

```bash
# Create an OAuth2 provider via the API.
# Replace the UUIDs with flow IDs from your Authentik instance.
curl -X POST http://localhost:9000/api/v3/providers/oauth2/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Web App",
    "authorization_flow": "AUTHORIZATION_FLOW_UUID",
    "invalidation_flow": "INVALIDATION_FLOW_UUID",
    "client_type": "confidential",
    "client_id": "my-web-app",
    "client_secret": "my-client-secret",
    "redirect_uris": [
      {
        "matching_mode": "strict",
        "url": "http://localhost:3000/callback"
      },
      {
        "matching_mode": "strict",
        "url": "http://localhost:3000/silent-renew"
      }
    ],
    "signing_key": null,
    "access_token_validity": "hours=1",
    "refresh_token_validity": "days=30"
  }'

# Link the provider to an application slug used by the OIDC discovery URL
# Replace the provider value with the pk returned by the provider API call.
curl -X POST http://localhost:9000/api/v3/core/applications/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Web App",
    "slug": "my-web-app",
    "provider": 1,
    "policy_engine_mode": "all"
  }'
```

## Integrating a Web Application

Here is how to integrate a Node.js application with Authentik using OpenID Connect:

```javascript
// app.js - Express app with Authentik OIDC authentication
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";

const app = express();

app.use(cookieParser());
app.use(session({
  secret: "session-secret",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate("session"));

async function setupAuth() {
  // Discover Authentik's OIDC configuration
  const config = await client.discovery(
    new URL("http://localhost:9000/application/o/my-web-app/"),
    "my-web-app",
    "my-client-secret",
  );

  passport.use("oidc", new Strategy({
    config,
    scope: "openid email profile",
    callbackURL: new URL("http://localhost:3000/callback"),
  }, (tokens, done) => done(null, tokens.claims())));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}

// Login route
app.get("/login", passport.authenticate("oidc"));

// Callback route
app.get("/callback",
  passport.authenticate("oidc", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/")
);

// Protected route
app.get("/", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.json({ user: req.user });
});

setupAuth().then(() => app.listen(3000));
```

## Proxy Authentication

Authentik can act as an authentication proxy in front of applications that do not support OIDC natively. Authentik includes an embedded outpost for proxy providers, or you can deploy a separate proxy outpost:

```yaml
# Add to docker-compose.yml for proxy authentication
  authentik-proxy:
    image: ghcr.io/goauthentik/proxy:2026.5.2
    container_name: authentik-proxy
    ports:
      - "4180:9000"
      - "4443:9443"
    environment:
      AUTHENTIK_HOST: http://server:9000
      AUTHENTIK_INSECURE: "true"
      AUTHENTIK_TOKEN: "your-outpost-token"
    depends_on:
      - server
    restart: unless-stopped
```

## LDAP Integration

Authentik can also serve as an LDAP server for applications that only support LDAP authentication:

```yaml
# Add LDAP outpost to docker-compose.yml
  authentik-ldap:
    image: ghcr.io/goauthentik/ldap:2026.5.2
    container_name: authentik-ldap
    ports:
      - "389:3389"    # LDAP
      - "636:6636"    # LDAPS
    environment:
      AUTHENTIK_HOST: http://server:9000
      AUTHENTIK_INSECURE: "true"
      AUTHENTIK_TOKEN: "your-ldap-outpost-token"
    depends_on:
      - server
    restart: unless-stopped
```

Test LDAP connectivity:

```bash
# Test LDAP search against Authentik
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=ldapservice,ou=users,dc=ldap,dc=goauthentik,dc=io" \
  -w "service-account-password" \
  -b "ou=users,dc=ldap,dc=goauthentik,dc=io" \
  "(objectClass=user)"
```

## Multi-Factor Authentication

Enable MFA through the admin interface. Authentik supports TOTP (authenticator apps), WebAuthn (hardware keys), and SMS-based verification. Configure MFA enforcement in authentication flows:

1. Go to Admin > Flows & Stages
2. Edit the default authentication flow
3. Add an "Authenticator Validation" stage
4. Configure which authenticator types are accepted

## Email Configuration

Configure email for password resets and notifications:

```yaml
# Add email environment variables to the server and worker services
environment:
  AUTHENTIK_EMAIL__HOST: smtp.example.com
  AUTHENTIK_EMAIL__PORT: 587
  AUTHENTIK_EMAIL__USERNAME: authentik@example.com
  AUTHENTIK_EMAIL__PASSWORD: email-password
  AUTHENTIK_EMAIL__USE_TLS: "true"
  AUTHENTIK_EMAIL__FROM: authentik@example.com
```

## Backup

Back up the PostgreSQL database and data files:

```bash
# Backup the database
docker exec authentik-db pg_dump -U authentik authentik > authentik-backup.sql

# Backup data files (custom branding, uploaded media, etc.)
mkdir -p backups
tar czf backups/authentik-data.tar.gz data
```

## Conclusion

Authentik in Docker provides enterprise-grade identity management for self-hosted environments. It supports every major authentication protocol, so it can integrate with virtually any application. The flow-based authentication engine gives you fine-grained control over login processes, including conditional MFA, user enrollment, and password recovery. Start by deploying the base stack, create an OAuth2 provider for your first application, and expand from there. The admin interface makes most configuration tasks straightforward, and the API enables automation for larger deployments.
