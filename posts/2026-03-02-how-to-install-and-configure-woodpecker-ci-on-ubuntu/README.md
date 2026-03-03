# How to Install and Configure Woodpecker CI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, Woodpecker, DevOps, Docker

Description: Install and configure Woodpecker CI on Ubuntu, connect it to Gitea or Forgejo, write pipeline definitions in YAML, and run isolated container-based builds for your projects.

---

Woodpecker CI is a community fork of Drone CI that diverged to remain fully open source and avoid the licensing changes that made Drone's advanced features proprietary. It uses the same `.woodpecker.yml` pipeline format (compatible with many Drone pipelines), connects to self-hosted Git providers like Gitea and Forgejo, and runs builds in Docker containers. If you're running a self-hosted Git stack, Woodpecker fits in cleanly.

This guide covers installing Woodpecker on Ubuntu using Docker Compose, connecting it to Gitea, and writing pipeline definitions.

## Prerequisites

```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group change to apply

# Verify
docker --version
docker compose version
```

You also need a running Gitea, Forgejo, GitHub, or GitLab instance to connect Woodpecker to.

## Creating the OAuth Application

Woodpecker authenticates users via your Git provider's OAuth.

### For Gitea / Forgejo

```text
1. Log into Gitea as an admin
2. Go to: Settings > Applications > Manage OAuth2 Applications
3. Click "Create OAuth2 Application"
4. Name: Woodpecker CI
5. Redirect URI: https://ci.example.com/authorize
6. Save - note the Client ID and Client Secret
```

### For GitHub

```text
1. Go to: GitHub > Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Application name: Woodpecker CI
4. Homepage URL: https://ci.example.com
5. Authorization callback URL: https://ci.example.com/authorize
6. Register and note the Client ID and Client Secret
```

## Generating the Shared Secret

```bash
# Generate a shared secret for server-agent communication
openssl rand -hex 32
# Save this - you need it in both server and agent config
```

## Docker Compose Setup

```bash
# Create directory for Woodpecker
sudo mkdir -p /opt/woodpecker
sudo chown $USER:$USER /opt/woodpecker
cd /opt/woodpecker

# Create data directories
mkdir -p data
```

Create `docker-compose.yml`:

```yaml
# Docker Compose for Woodpecker CI
version: "3.8"

services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:latest
    container_name: woodpecker-server
    restart: unless-stopped
    ports:
      - "8000:8000"   # HTTP (reverse-proxied by Nginx)
      - "9000:9000"   # gRPC port (agent communication)
    volumes:
      - ./data:/var/lib/woodpecker/
    environment:
      # Public-facing server URL (must match OAuth callback)
      - WOODPECKER_HOST=https://ci.example.com
      - WOODPECKER_SERVER_ADDR=:8000

      # Agent communication secret (must match agent WOODPECKER_AGENT_SECRET)
      - WOODPECKER_AGENT_SECRET=your-shared-secret-here

      # Git provider - use ONE of these sections:

      # --- Gitea / Forgejo ---
      - WOODPECKER_GITEA=true
      - WOODPECKER_GITEA_URL=https://gitea.example.com
      - WOODPECKER_GITEA_CLIENT=your-gitea-client-id
      - WOODPECKER_GITEA_SECRET=your-gitea-client-secret

      # --- GitHub (uncomment to use instead) ---
      # - WOODPECKER_GITHUB=true
      # - WOODPECKER_GITHUB_CLIENT=your-github-client-id
      # - WOODPECKER_GITHUB_SECRET=your-github-client-secret

      # Admin users (comma-separated Git usernames)
      - WOODPECKER_ADMIN=your-gitea-username

      # Database - SQLite for small setups, PostgreSQL for production
      - WOODPECKER_DATABASE_DRIVER=sqlite3
      - WOODPECKER_DATABASE_DATASOURCE=/var/lib/woodpecker/woodpecker.sqlite

      # For PostgreSQL:
      # - WOODPECKER_DATABASE_DRIVER=postgres
      # - WOODPECKER_DATABASE_DATASOURCE=postgres://woodpecker:password@postgres:5432/woodpecker?sslmode=disable

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:latest
    container_name: woodpecker-agent
    restart: unless-stopped
    depends_on:
      - woodpecker-server
    volumes:
      # Required: agent mounts Docker socket to launch build containers
      - /var/run/docker.sock:/var/run/docker.sock
      # Optional: tmp volume for build workspaces
      - /tmp/woodpecker:/tmp/woodpecker
    environment:
      # Point agent at server gRPC port
      - WOODPECKER_SERVER=woodpecker-server:9000
      - WOODPECKER_AGENT_SECRET=your-shared-secret-here  # Must match server

      # Agent name and capacity
      - WOODPECKER_MAX_WORKFLOWS=4
      - WOODPECKER_HOSTNAME=agent-01

      # Backend for running builds
      - WOODPECKER_BACKEND=docker
```

```bash
# Start the stack
docker compose up -d

# Verify both containers are running
docker compose ps

# Tail logs to confirm startup
docker compose logs -f
```

## Nginx Reverse Proxy Configuration

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/woodpecker
```

```nginx
# Nginx reverse proxy for Woodpecker CI
server {
    listen 80;
    server_name ci.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ci.example.com;

    ssl_certificate     /etc/letsencrypt/live/ci.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ci.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Allow larger file uploads
    client_max_body_size 50m;

    # Longer timeouts for log streaming
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Server-Sent Events support for live log streaming
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/woodpecker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ci.example.com
```

## Activating Repositories

Log into Woodpecker via `https://ci.example.com` using your Git provider credentials. Then:

1. Click the "+" icon to add a repository
2. Find your repository in the list and click **Enable**
3. Woodpecker adds a webhook to your repository automatically

Pushes and pull requests to the repository now trigger builds.

## Writing Woodpecker Pipelines

Create `.woodpecker.yml` (or a `.woodpecker/` directory with multiple YAML files) in your repository root.

### Basic Pipeline

```yaml
# .woodpecker.yml - simple build and test pipeline
steps:
  # Step names become labels in the Woodpecker UI
  - name: install-deps
    image: node:20-alpine
    commands:
      - npm ci

  - name: lint
    image: node:20-alpine
    commands:
      - npm run lint

  - name: test
    image: node:20-alpine
    commands:
      - npm test

  - name: build
    image: node:20-alpine
    commands:
      - npm run build
    # Only build on the main branch, not on feature branches
    when:
      branch: main
```

### Pipeline with Secrets and Environment Variables

```yaml
# .woodpecker.yml - deploy with secrets
steps:
  - name: build
    image: python:3.12-slim
    commands:
      - pip install -r requirements.txt
      - python setup.py build

  - name: test
    image: python:3.12-slim
    commands:
      - pip install -r requirements-test.txt
      - pytest tests/ -v --tb=short

  - name: deploy-staging
    image: alpine:latest
    secrets:
      # Reference secrets stored in Woodpecker
      - source: deploy_ssh_key
        target: DEPLOY_SSH_KEY
      - source: staging_host
        target: DEPLOY_HOST
    commands:
      - apk add --no-cache openssh-client
      - mkdir -p ~/.ssh
      - echo "$DEPLOY_SSH_KEY" > ~/.ssh/deploy_key
      - chmod 600 ~/.ssh/deploy_key
      - ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no \
          deploy@$DEPLOY_HOST "cd /app && ./deploy.sh"
    when:
      branch: main
      event: push
```

### Pipeline with Multiple Parallel Steps

```yaml
# .woodpecker.yml - parallel test matrix
steps:
  - name: build
    image: node:20-alpine
    commands:
      - npm ci
      - npm run build

  # These steps depend on 'build' but run in parallel with each other
  - name: unit-tests
    image: node:20-alpine
    depends_on: [build]
    commands:
      - npm run test:unit

  - name: integration-tests
    image: node:20-alpine
    depends_on: [build]
    commands:
      - npm run test:integration

  - name: security-scan
    image: node:20-alpine
    depends_on: [build]
    commands:
      - npm audit --audit-level high

  # Deploy only runs after all tests pass
  - name: deploy
    image: alpine
    depends_on:
      - unit-tests
      - integration-tests
      - security-scan
    commands:
      - echo "All checks passed"
      - ./scripts/deploy.sh
    when:
      branch: main
```

### Pipeline with a Service Container

```yaml
# .woodpecker.yml - pipeline using a PostgreSQL service
services:
  - name: database
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass

steps:
  - name: wait-for-db
    image: postgres:16-alpine
    environment:
      PGPASSWORD: testpass
    commands:
      - until pg_isready -h database -U testuser; do
          echo "Waiting for database...";
          sleep 2;
        done
      - echo "Database is ready"

  - name: migrate-and-test
    image: python:3.12-slim
    environment:
      DATABASE_URL: postgresql://testuser:testpass@database/testdb
    commands:
      - pip install -r requirements.txt
      - python manage.py migrate
      - python manage.py test
```

## Managing Secrets

Add secrets through the Woodpecker UI (Repository > Settings > Secrets) or via CLI:

```bash
# Install Woodpecker CLI
curl -L https://github.com/woodpecker-ci/woodpecker/releases/latest/download/woodpecker-cli_linux_amd64.tar.gz | tar xz
sudo install -t /usr/local/bin woodpecker-cli

# Configure CLI
export WOODPECKER_SERVER=https://ci.example.com
export WOODPECKER_TOKEN=your-personal-token  # From Profile > API Tokens

# Add a secret
woodpecker-cli secret add --repository org/myapp \
  --name deploy_api_key \
  --value "the-secret-value"

# List secrets (values hidden)
woodpecker-cli secret list --repository org/myapp
```

## Monitoring and Maintenance

```bash
# Check Woodpecker server and agent health
docker compose ps
docker compose logs woodpecker-server --tail=50
docker compose logs woodpecker-agent --tail=50

# Update to latest version
docker compose pull
docker compose up -d

# Backup Woodpecker data
tar -czf woodpecker-backup-$(date +%Y%m%d).tar.gz /opt/woodpecker/data/

# Check disk usage from build workspaces
du -sh /tmp/woodpecker/
```

## Troubleshooting

**Agent not connecting to server:**
```bash
# Verify gRPC port is not blocked between agent and server
docker compose exec woodpecker-agent nc -z woodpecker-server 9000

# Check agent logs for connection errors
docker compose logs woodpecker-agent | grep -i error
```

**OAuth callback URL mismatch:**
The redirect URI in your Git provider's OAuth app must exactly match `https://ci.example.com/authorize`. Any mismatch causes login failures.

**Builds not triggering:**
```bash
# Check webhook delivery in Gitea:
# Repository > Settings > Webhooks > (click webhook) > Recent Deliveries

# Check Woodpecker server logs for incoming webhooks
docker compose logs woodpecker-server | grep -i webhook
```

## Summary

Woodpecker CI on Ubuntu is a clean, container-native CI solution that works well with self-hosted Git providers. The Docker Compose setup takes about 15 minutes to get running, pipeline definitions in `.woodpecker.yml` keep your build configuration versioned in the repository, and secret management keeps credentials off disk. For teams already running Gitea or Forgejo, Woodpecker integrates naturally without adding heavy infrastructure.
