# How to Configure Infisical for Secret Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Secrets, DevOps, Open Source

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

Infisical's self-hosted option is the full platform, not a stripped-down version.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker Engine and Docker Compose v2
- 4 GB RAM minimum
- A domain name (for SSL)
- Ports 80, 443 available

## Deploying Infisical with Docker Compose

Clone the official deployment repository:

```bash
git clone https://github.com/Infisical/infisical.git
cd infisical
```

Copy the environment template:

```bash
cp .env.example .env
nano .env
```

Key settings to configure:

```bash
# Database connection
POSTGRES_DB=infisical
POSTGRES_USER=infisical
POSTGRES_PASSWORD=generate_a_strong_password_here

# Encryption key (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your_32_character_hex_string_here

# JWT secrets (generate each with: openssl rand -base64 32)
JWT_AUTH_SECRET=your_jwt_auth_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_SERVICE_SECRET=your_service_secret
JWT_SIGNUP_SECRET=your_signup_secret

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
docker compose up -d

# Monitor startup
docker compose logs -f
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
4. Projects automatically get `dev`, `staging`, and `production` environments

## Installing the Infisical CLI

```bash
# Add the Infisical repository
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash

# Install
sudo apt install infisical -y

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
infisical secrets set API_KEY="sk-prod-abc123" --env=production

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
INFISICAL_TOKEN="st.your-service-token" infisical run --env=production -- ./start.sh
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
ExecStart=/usr/bin/infisical run --env=production -- /opt/app/server
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
const { InfisicalClient } = require("@infisical/sdk");

const client = new InfisicalClient({
  token: process.env.INFISICAL_TOKEN,
  siteUrl: "https://secrets.yourdomain.com" // for self-hosted
});

// Fetch a secret dynamically
const secret = await client.getSecret({
  secretName: "DATABASE_URL",
  projectId: "your-project-id",
  environment: "production"
});

console.log(secret.secretValue);
```

### Python

```bash
pip install infisical-python
```

```python
from infisical import InfisicalClient

client = InfisicalClient(
    token=os.environ["INFISICAL_TOKEN"],
    site_url="https://secrets.yourdomain.com"
)

# Retrieve a secret
db_url = client.get_secret(
    secret_name="DATABASE_URL",
    project_id="your-project-id",
    environment="production"
)
```

## Kubernetes Integration

Infisical integrates with Kubernetes via the Infisical Operator:

```bash
# Install the operator
helm repo add infisical-helm-charts 'https://dl.cloudsmith.io/public/infisical/helm-charts/helm/charts/'
helm install infisical-operator infisical-helm-charts/infisical-operator --namespace infisical-operator-system --create-namespace
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

  infisical:
    secretsPath: "/"
    serviceToken: "st.your-token"

  managedSecretReference:
    secretName: my-app-k8s-secrets
    secretNamespace: default
```

## Audit Logs

Every secret access and modification is logged. View audit logs in the dashboard under Audit Logs, or query them via the API:

```bash
curl -H "Authorization: Bearer $INFISICAL_TOKEN" \
  "https://secrets.yourdomain.com/api/v1/audit-logs?workspaceId=your-project-id"
```

## Backup and Recovery

Back up the PostgreSQL database:

```bash
# Dump the database
docker exec infisical-postgres pg_dump -U infisical infisical > infisical-backup-$(date +%Y%m%d).sql

# Compress and store securely
gzip infisical-backup-$(date +%Y%m%d).sql
```

Restore from backup:

```bash
gunzip -c infisical-backup-20260302.sql.gz | docker exec -i infisical-postgres psql -U infisical infisical
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
infisical secrets --token $INFISICAL_TOKEN --env production

# Check the project ID in .infisical.json matches your project
```

Infisical's advantage over traditional approaches like `.env` files or CI/CD built-in secret stores is the central audit trail and the ability to grant fine-grained, environment-specific access. The open-source codebase means you can audit exactly how your secrets are handled.
