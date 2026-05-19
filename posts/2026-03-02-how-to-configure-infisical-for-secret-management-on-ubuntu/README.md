# How to Configure Infisical for Secret Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Secret, DevOps, Open Source

Description: Learn how to deploy and configure Infisical for self-hosted secret management on Ubuntu, including CLI setup, environment configuration, and application integration.

---

Infisical is an open-source secret management platform that you can self-host on your own infrastructure. Unlike Doppler or HashiCorp Vault Cloud, Infisical gives you full control over where secrets are stored. It includes a web dashboard, CLI, SDKs for popular languages, and native Kubernetes integration.

This guide covers deploying the Infisical server on Ubuntu and integrating it with applications.

## Why Self-Host Secret Management

Self-hosting secret management makes sense when:
- Compliance requirements prohibit secrets leaving your infrastructure
- You want zero dependency on third-party availability for production systems
- You have existing encryption infrastructure to integrate with
- Cost is a concern at scale

Infisical's self-hosted option includes the open-source core platform, with additional enterprise features available under a commercial license.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker Engine and Docker Compose v2
- 4 GB RAM minimum
- A domain name (for SSL)
- Ports 80, 443 available

## Deploying Infisical with Docker Compose

Download the official production Docker Compose file:

```bash
mkdir infisical
cd infisical
curl -o docker-compose.prod.yml https://raw.githubusercontent.com/Infisical/infisical/main/docker-compose.prod.yml
```

If you will run Nginx on the host, update the backend port mapping in `docker-compose.prod.yml` from `80:8080` to `127.0.0.1:8080:8080` so Nginx can bind ports 80 and 443.

Download the environment template:

```bash
curl -o .env https://raw.githubusercontent.com/Infisical/infisical/main/.env.example
nano .env
chmod 600 .env
```

Key settings to configure:

```bash
# Database connection

POSTGRES_DB=infisical
POSTGRES_USER=infisical
POSTGRES_PASSWORD=generate_a_strong_password_here
DB_CONNECTION_URI=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
REDIS_URL=redis://redis:6379

# Encryption key (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your_32_character_hex_string_here

# Authentication secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your_auth_secret

# Application URL
SITE_URL=https://secrets.yourdomain.com

# Email configuration (for invitations and alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_ADDRESS=noreply@yourdomain.com
```

Start the stack:

```bash
docker compose -f docker-compose.prod.yml up -d

# Monitor startup
docker compose -f docker-compose.prod.yml logs -f
```

## Configuring Nginx Reverse Proxy

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create the Nginx config:

```nginx
# /etc/nginx/sites-available/infisical
server {
    server_name secrets.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/infisical /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d secrets.yourdomain.com
```

## Initial Setup

Visit `https://secrets.yourdomain.com` and create your admin account.

Create your first organization and project:
1. Click "Create Organization"
2. Inside the org, click "Add Project"
3. Name it (e.g., "my-api")
4. Projects automatically get `dev`, `staging`, and `prod` environment slugs

## Installing the Infisical CLI

```bash
# Add the Infisical repository
curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | sudo -E bash

# Install
sudo apt-get update && sudo apt-get install -y infisical

# Verify
infisical --version
```

## Authenticating the CLI

```bash
# Log in to your self-hosted instance
infisical login --domain https://secrets.yourdomain.com

# For cloud (infisical.com)
infisical login
```

## Linking a Project

In your application directory:

```bash
# Initialize Infisical for this project
infisical init

# Select your project and environment when prompted
# This creates .infisical.json in the current directory
cat .infisical.json
```

```json
{
  "workspaceId": "your-project-id",
  "defaultEnvironment": "dev"
}
```

## Adding Secrets

Via CLI:

```bash
# Set a secret
infisical secrets set DATABASE_URL="postgres://user:pass@localhost/mydb"

# Set for a specific environment
infisical secrets set API_KEY="sk-prod-abc123" --env=prod

# List secrets in current environment
infisical secrets
```

Via the dashboard, navigate to your project, select an environment, and click "Add Secret".

## Running Applications with Injected Secrets

```bash
# Inject secrets from dev environment and run the app
infisical run -- node server.js

# Specify environment explicitly
infisical run --env=staging -- python manage.py runserver

# Use with npm scripts
infisical run -- npm start
```

## Service Tokens for Production

Service tokens provide non-interactive authentication for servers and CI/CD:

In the Infisical dashboard:
1. Go to your project
2. Navigate to Settings > Service Tokens
3. Click "Generate Service Token"
4. Select the environment and permissions (read-only for most services)
5. Copy the token

Use it on the server:

```bash
# Run with service token authentication
INFISICAL_TOKEN="st.your-service-token" infisical run --env=prod -- ./start.sh
```

For systemd services:

```bash
sudo nano /etc/systemd/system/my-api.service
```

```ini
[Unit]
Description=My API
After=network.target

[Service]
Type=simple
User=app
Environment=INFISICAL_TOKEN=st.your-service-token-here
ExecStart=/usr/bin/infisical run --env=prod -- /opt/app/server
Restart=always

[Install]
WantedBy=multi-user.target
```

## SDK Integration

Infisical provides SDKs that fetch secrets at runtime (not just at startup):

### Node.js

```bash
npm install @infisical/sdk
```

```javascript
const { InfisicalSDK } = require("@infisical/sdk");

const client = new InfisicalSDK({
  siteUrl: "https://secrets.yourdomain.com" // for self-hosted
});

async function main() {
  await client.auth().universalAuth.login({
    clientId: process.env.INFISICAL_CLIENT_ID,
    clientSecret: process.env.INFISICAL_CLIENT_SECRET
  });

  // Fetch a secret dynamically
  const secret = await client.secrets().getSecret({
    secretName: "DATABASE_URL",
    projectId: "your-project-id",
    environment: "prod",
    secretPath: "/"
  });

  console.log(secret.secretValue);
}

main().catch(console.error);
```

### Python

```bash
pip install infisicalsdk
```

```python
import os
from infisical_sdk import InfisicalSDKClient

client = InfisicalSDKClient(host="https://secrets.yourdomain.com")
client.auth.universal_auth.login(
    client_id=os.environ["INFISICAL_CLIENT_ID"],
    client_secret=os.environ["INFISICAL_CLIENT_SECRET"]
)

# Retrieve a secret
db_url = client.secrets.get_secret_by_name(
    secret_name="DATABASE_URL",
    project_id="your-project-id",
    environment_slug="prod",
    secret_path="/"
)
```

## Kubernetes Integration

Infisical integrates with Kubernetes via the Infisical Operator:

```bash
# Install the operator
helm repo add infisical-helm-charts 'https://dl.cloudsmith.io/public/infisical/helm-charts/helm/charts/'
helm repo update
helm install infisical-operator infisical-helm-charts/secrets-operator --namespace infisical-operator-system --create-namespace
kubectl create secret generic infisical-service-token --from-literal=infisicalToken="st.your-token"
```

Create an InfisicalSecret resource:

```yaml
# infisical-secret.yaml
apiVersion: secrets.infisical.com/v1alpha1
kind: InfisicalSecret
metadata:
  name: my-app-secrets
spec:
  authentication:
    serviceToken:
      serviceTokenSecretReference:
        secretName: infisical-service-token
        secretNamespace: default
      secretsScope:
        envSlug: prod
        secretsPath: "/"

  hostAPI: https://secrets.yourdomain.com/api

  managedKubeSecretReferences:
    - secretName: my-app-k8s-secrets
      secretNamespace: default
```

## Audit Logs

Audit logs record access and modification events when the feature is enabled for your plan or self-hosted license. View audit logs in the dashboard under Audit Logs, or query them via the API:

```bash
curl -H "Authorization: Bearer $INFISICAL_TOKEN" \
  "https://secrets.yourdomain.com/api/v1/organization/audit-logs?projectId=your-project-id"
```

## Backup and Recovery

Back up the PostgreSQL database:

```bash
# Dump the database
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U infisical infisical > infisical-backup-$(date +%Y%m%d).sql

# Compress and store securely
gzip infisical-backup-$(date +%Y%m%d).sql
```

Restore from backup:

```bash
gunzip -c infisical-backup-20260302.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U infisical infisical
```

## Troubleshooting

**Cannot log in - "Invalid credentials":**
Check that the `SITE_URL` in `.env` matches the URL you're accessing. Infisical uses this for redirect URLs in authentication.

**CLI not connecting to self-hosted instance:**
```bash
# Test connectivity
curl -s https://secrets.yourdomain.com/api/status

# Should return {"date":"...","message":"...","status":200}
```

**Secrets not injecting:**
```bash
# Verify the service token is valid
infisical secrets --token $INFISICAL_TOKEN --env prod

# Check the project ID in .infisical.json matches your project
```

Infisical's advantage over traditional approaches like `.env` files or CI/CD built-in secret stores is the central audit trail and the ability to grant fine-grained, environment-specific access. The open-source codebase means you can audit exactly how your secrets are handled.
