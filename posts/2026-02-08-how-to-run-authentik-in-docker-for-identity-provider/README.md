# How to Run Authentik in Docker for Identity Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Authentik, Identity Provider, SSO, Authentication, OAuth, SAML, Docker Compose

Description: Deploy Authentik in Docker as a self-hosted identity provider with SSO, OAuth2, SAML, and LDAP support

---

Authentik is an open-source identity provider that handles authentication for your applications. It supports OAuth2, OpenID Connect, SAML, LDAP, and proxy authentication. Think of it as a self-hosted alternative to Auth0 or Okta. Authentik provides single sign-on (SSO), multi-factor authentication, user management, and social login integration. Running it in Docker is the recommended deployment method, and the project provides official Docker Compose files that work out of the box.

This guide covers deploying Authentik, configuring it as an identity provider, integrating applications, and setting up common authentication flows.

## Prerequisites

Authentik requires:
- Docker Engine 24.0+ and Docker Compose V2
- At least 2 GB of RAM
- A domain name (for production deployments)

Generate the required secret key before starting:

```bash
# Generate a secret key for Authentik
echo "AUTHENTIK_SECRET_KEY=$(openssl rand -base64 36)" >> .env

# Generate a PostgreSQL password
echo "PG_PASS=$(openssl rand -base64 36)" >> .env
```

## Docker Compose Deployment

Here is the complete Docker Compose configuration:

```yaml
# docker-compose.yml - Authentik full deployment
version: "3.8"

services:
  postgresql:
    image: postgres:16-alpine
    container_name: authentik-db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: authentik
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD: ${PG_PASS}
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "authentik"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: authentik-redis
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  server:
    image: ghcr.io/goauthentik/server:2024.8
    container_name: authentik-server
    command: server
    ports:
      - "9000:9000"    # HTTP
      - "9443:9443"    # HTTPS
    environment:
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY}
      AUTHENTIK_REDIS__HOST: redis
      AUTHENTIK_POSTGRESQL__HOST: postgresql
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: ${PG_PASS}
    volumes:
      - authentik-media:/media
      - authentik-templates:/templates
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    image: ghcr.io/goauthentik/server:2024.8
    container_name: authentik-worker
    command: worker
    environment:
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY}
      AUTHENTIK_REDIS__HOST: redis
      AUTHENTIK_POSTGRESQL__HOST: postgresql
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: ${PG_PASS}
    volumes:
      - authentik-media:/media
      - authentik-templates:/templates
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
  authentik-media:
  authentik-templates:
```

Start Authentik:

```bash
# Launch all Authentik services
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
# Create an OAuth2 provider via the API
curl -X POST http://localhost:9000/api/v3/providers/oauth2/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Web App",
    "authorization_flow": "default-provider-authorization-explicit-consent",
    "client_type": "confidential",
    "client_id": "my-web-app",
    "client_secret": "my-client-secret",
    "redirect_uris": "http://localhost:3000/callback\nhttp://localhost:3000/silent-renew",
    "signing_key": null,
    "access_token_validity": "hours=1",
    "refresh_token_validity": "days=30"
  }'
```

## Integrating a Web Application

Here is how to integrate a Node.js application with Authentik using OpenID Connect:

```javascript
// app.js - Express app with Authentik OIDC authentication
const express = require("express");
const { Issuer, Strategy } = require("openid-client");
const passport = require("passport");
const session = require("express-session");

const app = express();

app.use(session({
  secret: "session-secret",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

async function setupAuth() {
  // Discover Authentik's OIDC configuration
  const issuer = await Issuer.discover("http://localhost:9000/application/o/my-web-app/");

  const client = new issuer.Client({
    client_id: "my-web-app",
    client_secret: "my-client-secret",
    redirect_uris: ["http://localhost:3000/callback"],
    response_types: ["code"],
  });

  passport.use("oidc", new Strategy({ client }, (tokenSet, userinfo, done) => {
    return done(null, userinfo);
  }));

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

Authentik can act as an authentication proxy in front of applications that do not support OIDC natively. Use the embedded outpost:

```yaml
# Add to docker-compose.yml for proxy authentication
  authentik-proxy:
    image: ghcr.io/goauthentik/proxy:2024.8
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
    image: ghcr.io/goauthentik/ldap:2024.8
    container_name: authentik-ldap
    ports:
      - "3389:3389"    # LDAP
      - "6636:6636"    # LDAPS
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
ldapsearch -x -H ldap://localhost:3389 \
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

Back up the PostgreSQL database and media files:

```bash
# Backup the database
docker exec authentik-db pg_dump -U authentik authentik > authentik-backup.sql

# Backup media files (custom branding, etc.)
docker run --rm -v authentik-media:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/authentik-media.tar.gz /data
```

## Conclusion

Authentik in Docker provides enterprise-grade identity management for self-hosted environments. It supports every major authentication protocol, so it can integrate with virtually any application. The flow-based authentication engine gives you fine-grained control over login processes, including conditional MFA, user enrollment, and password recovery. Start by deploying the base stack, create an OAuth2 provider for your first application, and expand from there. The admin interface makes most configuration tasks straightforward, and the API enables automation for larger deployments.
