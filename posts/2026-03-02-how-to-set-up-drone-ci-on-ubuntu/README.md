# How to Set Up Drone CI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, Drone, Docker, DevOps

Description: Set up Drone CI on Ubuntu using Docker, connect it to Gitea or GitHub, configure pipelines with .drone.yml files, and run builds in isolated Docker containers.

---

Drone CI takes a different philosophy from Jenkins - it's lightweight, Docker-native, and pipeline definitions live entirely in a `.drone.yml` file at the root of each repository. Every build step runs in a container, which means consistent, reproducible builds without managing build tool installations on the server. Setup is quick compared to Jenkins, and the YAML syntax is clean.

This guide covers running Drone on Ubuntu with Docker Compose, connecting it to a Git provider, and writing pipeline definitions.

## Architecture Overview

Drone has two components:
- **Drone Server** - the web UI and API, handles webhook events from your Git provider
- **Drone Runner** - polls the server for builds to execute, runs them locally in Docker containers

For small to medium setups, both components run on the same server.

## Prerequisites

```bash
# Install Docker and Docker Compose if not already present
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

# Enable Docker
sudo systemctl enable --now docker

# Add your user to docker group
sudo usermod -aG docker $USER
# Log out and back in for this to take effect

# Verify Docker is working
docker run --rm hello-world
```

## Generating a Shared Secret

The Drone server and runner authenticate using a shared secret:

```bash
# Generate a cryptographically random shared secret
openssl rand -hex 32
# Save this output - you'll use it in both server and runner config
```

## Setting Up OAuth with Your Git Provider

Drone uses OAuth to authenticate users via your Git provider. The configuration differs by provider.

### For Gitea

```bash
# In Gitea: Settings > Applications > Manage OAuth2 Applications
# Create a new OAuth2 application:
# Name: Drone CI
# Redirect URI: https://drone.example.com/login

# Gitea will give you a Client ID and Client Secret
# Save both for the Drone Server configuration
```

### For GitHub

```bash
# On GitHub: Settings > Developer settings > OAuth Apps > New OAuth App
# Application name: Drone CI
# Homepage URL: https://drone.example.com
# Authorization callback URL: https://drone.example.com/login

# GitHub will give you a Client ID and Client Secret
```

## Docker Compose Configuration

Create a directory for Drone and a Docker Compose file:

```bash
# Create Drone directory
sudo mkdir -p /opt/drone
sudo chown $USER:$USER /opt/drone
cd /opt/drone
```

Create `docker-compose.yml`:

```yaml
# Docker Compose configuration for Drone CI
version: "3.8"

services:
  drone-server:
    image: drone/drone:2
    container_name: drone-server
    restart: unless-stopped
    ports:
      - "3000:80"         # HTTP (Nginx will proxy this)
      - "3001:443"        # HTTPS (if not using external proxy)
    volumes:
      - drone-data:/data  # Persistent storage for build data
    environment:
      # Replace with your actual domain
      - DRONE_SERVER_HOST=drone.example.com
      - DRONE_SERVER_PROTO=https

      # Shared secret between server and runner (generate with openssl rand -hex 32)
      - DRONE_RPC_SECRET=your-shared-secret-here

      # Git provider configuration - use ONE of these sections:

      # --- Gitea ---
      - DRONE_GITEA_SERVER=https://gitea.example.com
      - DRONE_GITEA_CLIENT_ID=your-gitea-client-id
      - DRONE_GITEA_CLIENT_SECRET=your-gitea-client-secret

      # --- GitHub (uncomment to use instead of Gitea) ---
      # - DRONE_GITHUB_CLIENT_ID=your-github-client-id
      # - DRONE_GITHUB_CLIENT_SECRET=your-github-client-secret

      # Admin user (your Git username)
      - DRONE_USER_CREATE=username:your-git-username,admin:true

      # Database (default is SQLite, fine for small setups)
      # For larger setups, use PostgreSQL:
      # - DRONE_DATABASE_DRIVER=postgres
      # - DRONE_DATABASE_DATASOURCE=postgres://drone:password@postgres/drone?sslmode=disable

  drone-runner:
    image: drone/drone-runner-docker:1
    container_name: drone-runner
    restart: unless-stopped
    depends_on:
      - drone-server
    volumes:
      # Required: Docker socket for running build containers
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Point runner at the server
      - DRONE_RPC_PROTO=http
      - DRONE_RPC_HOST=drone-server
      - DRONE_RPC_SECRET=your-shared-secret-here  # Must match server

      # Number of concurrent builds
      - DRONE_RUNNER_CAPACITY=4
      - DRONE_RUNNER_NAME=ubuntu-runner-01

      # Optional: restrict which repos this runner handles
      # - DRONE_LIMIT_REPOS=org/repo1,org/repo2

volumes:
  drone-data:
```

```bash
# Start Drone
docker compose up -d

# Check that both containers started
docker compose ps

# View logs
docker compose logs -f drone-server
docker compose logs -f drone-runner
```

## Configuring Nginx as a Reverse Proxy

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/drone
```

```nginx
# Nginx proxy for Drone CI
server {
    listen 80;
    server_name drone.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drone.example.com;

    ssl_certificate     /etc/letsencrypt/live/drone.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drone.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;

    # Increase timeouts for long-running build log streams
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for Server-Sent Events (live log streaming)
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/drone /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Set up SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d drone.example.com
```

## Activating a Repository

After logging into Drone via your Git provider:

1. Click your username > **Repositories** (or visit `https://drone.example.com`)
2. Find your repository and click **Activate**
3. Drone installs a webhook in your Git provider automatically

Any push or pull request to that repository now triggers a build.

## Writing Drone Pipeline Files

Create `.drone.yml` in the root of your repository:

### Basic Pipeline

```yaml
# .drone.yml - basic build and test pipeline
kind: pipeline
type: docker
name: default

steps:
  # Each step runs in a separate container
  - name: install
    image: node:20-alpine
    commands:
      - npm ci

  - name: test
    image: node:20-alpine
    commands:
      - npm test

  - name: build
    image: node:20-alpine
    commands:
      - npm run build
    # Only run build on main branch
    when:
      branch:
        - main
```

### Pipeline with Services (e.g., Database for Tests)

```yaml
# .drone.yml - pipeline with PostgreSQL service for integration tests
kind: pipeline
type: docker
name: integration-tests

# Background services available during the pipeline
services:
  - name: postgres
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpassword

steps:
  - name: wait-for-db
    image: postgres:16-alpine
    commands:
      # Wait until Postgres is accepting connections
      - until pg_isready -h postgres -U testuser; do sleep 1; done
      - echo "Database ready"
    environment:
      PGPASSWORD: testpassword

  - name: run-tests
    image: python:3.12-slim
    environment:
      DATABASE_URL: postgresql://testuser:testpassword@postgres/testdb
    commands:
      - pip install -r requirements.txt
      - python -m pytest tests/ -v
```

### Docker Build and Push Pipeline

```yaml
# .drone.yml - build and push Docker image on tag
kind: pipeline
type: docker
name: docker-build

trigger:
  # Only run when a tag is pushed
  event:
    - tag

steps:
  - name: build-and-push
    image: plugins/docker
    settings:
      registry: registry.example.com
      repo: registry.example.com/myapp
      # Use the git tag as the image tag
      tags:
        - ${DRONE_TAG}
        - latest
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
```

### Multi-Stage Pipeline with Parallel Steps

```yaml
# .drone.yml - parallel test stages
kind: pipeline
type: docker
name: parallel-tests

steps:
  - name: build
    image: node:20-alpine
    commands:
      - npm ci
      - npm run build

  # These two steps run in parallel (depends_on not set, same position)
  - name: unit-tests
    image: node:20-alpine
    depends_on:
      - build
    commands:
      - npm run test:unit

  - name: lint
    image: node:20-alpine
    depends_on:
      - build
    commands:
      - npm run lint

  - name: deploy
    image: alpine
    depends_on:
      - unit-tests
      - lint
    commands:
      - echo "All checks passed, deploying..."
    when:
      branch:
        - main
```

## Managing Secrets

Store sensitive values as Drone secrets rather than hardcoding them:

```bash
# Install the Drone CLI
curl -L https://github.com/harness/drone-cli/releases/latest/download/drone_linux_amd64.tar.gz | tar xz
sudo install -t /usr/local/bin drone

# Configure CLI
export DRONE_SERVER=https://drone.example.com
export DRONE_TOKEN=your-personal-token  # From Account > API Tokens in Drone UI

# Add a secret to a repository
drone secret add --repository org/myapp --name docker_username --data myuser
drone secret add --repository org/myapp --name docker_password --data mypassword

# List secrets (values are not shown)
drone secret ls --repository org/myapp
```

Reference secrets in `.drone.yml`:
```yaml
steps:
  - name: deploy
    image: alpine
    environment:
      API_KEY:
        from_secret: deploy_api_key
    commands:
      - ./deploy.sh
```

## Troubleshooting

**Runner not picking up builds:**
```bash
# Check runner logs
docker compose logs drone-runner

# Verify runner is connected to server
docker compose exec drone-runner drone-runner ping
```

**Webhook not triggering builds:**
```bash
# Check the repository webhook in your Git provider
# The webhook URL should be: https://drone.example.com/hook

# Check Drone server logs for incoming webhooks
docker compose logs drone-server | grep webhook
```

**Build containers can't pull images:**
```bash
# If using a private registry, add registry credentials in Drone:
# Organization or Repository > Settings > Registries
```

## Summary

Drone CI on Ubuntu is a fast, container-native CI/CD solution with minimal moving parts. The Docker Compose setup gets you running in minutes, and pipeline definitions in `.drone.yml` keep your build process versioned alongside your code. The plugin ecosystem covers common tasks like Docker builds, deployments, and notifications, and the secret management system keeps credentials out of your pipeline files.
