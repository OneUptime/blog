# How to Configure Gitea with Woodpecker CI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, Gitea, Woodpecker CI, DevOps

Description: Set up Woodpecker CI integrated with Gitea on Ubuntu for a fully self-hosted, lightweight CI/CD platform that runs pipeline steps in Docker containers.

---

Woodpecker CI is a community fork of Drone CI, maintained after Drone's licensing changes. It works well with Gitea, which is a self-hosted Git platform, giving you a complete self-hosted developer toolchain. Together, Gitea handles source code management and Woodpecker handles automated testing and deployment.

This guide assumes you have Gitea already running and walks through installing Woodpecker CI alongside it.

## Prerequisites

- Ubuntu 20.04 or later with Docker installed
- Gitea running and accessible (see Gitea installation docs)
- A DNS name or IP for Woodpecker
- Ports 80/443 accessible

## Setting Up Gitea OAuth Application

Woodpecker authenticates through Gitea's OAuth2 provider. Create the application in Gitea:

1. Log in to Gitea as an admin
2. Go to Site Administration > Integrations > OAuth2 Applications
3. Add a new application:
   - Application Name: `Woodpecker CI`
   - Redirect URI: `https://ci.example.com/authorize`
4. Copy the generated Client ID and Client Secret

The redirect URI must exactly match the URL Woodpecker will use.

## Creating a Gitea User for Woodpecker

Woodpecker needs a Gitea account to perform webhook management and API calls:

```bash
# In Gitea admin interface, or via API:
# Create a service account user named "woodpecker"
# This account will manage webhooks on repositories

# Alternatively, use an existing admin account's token
# Generate a token in Gitea: Settings > Applications > Access Tokens
```

In Gitea, go to Settings > Applications > Access Tokens for the service account user, generate a token with repository and admin permissions.

## Setting Up Woodpecker with Docker Compose

Create the configuration directory:

```bash
mkdir -p /opt/woodpecker
```

Generate a shared secret for agent-server communication:

```bash
openssl rand -hex 16
# Save this value
```

Create the Docker Compose file:

```bash
nano /opt/woodpecker/docker-compose.yml
```

```yaml
version: '3.8'

services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:latest
    container_name: woodpecker-server
    restart: unless-stopped
    ports:
      - "8000:8000"    # Web interface
      - "9000:9000"    # gRPC (server-agent communication)
    volumes:
      - woodpecker-data:/var/lib/woodpecker
    environment:
      # Public URL of Woodpecker
      - WOODPECKER_HOST=https://ci.example.com

      # Gitea integration
      - WOODPECKER_GITEA=true
      - WOODPECKER_GITEA_URL=https://gitea.example.com
      - WOODPECKER_GITEA_CLIENT=your-gitea-oauth-client-id
      - WOODPECKER_GITEA_SECRET=your-gitea-oauth-client-secret

      # Skip TLS verification if using self-signed certs (not recommended for production)
      # - WOODPECKER_GITEA_SKIP_VERIFY=true

      # Server-agent shared secret
      - WOODPECKER_AGENT_SECRET=your-generated-secret-here

      # Admin users (comma-separated Gitea usernames)
      - WOODPECKER_ADMIN=yourgiteausername

      # Session secret for cookies
      - WOODPECKER_SESSION_SECRET=another-random-secret

      # Database (SQLite by default, use PostgreSQL for production)
      # - WOODPECKER_DATABASE_DRIVER=postgres
      # - WOODPECKER_DATABASE_DATASOURCE=postgres://user:pass@localhost:5432/woodpecker

      # Logging
      - WOODPECKER_LOG_LEVEL=info

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:latest
    container_name: woodpecker-agent
    restart: unless-stopped
    depends_on:
      - woodpecker-server
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Connect to server
      - WOODPECKER_SERVER=woodpecker-server:9000
      - WOODPECKER_AGENT_SECRET=your-generated-secret-here

      # Agent configuration
      - WOODPECKER_MAX_WORKFLOWS=2      # Concurrent builds
      - WOODPECKER_HOSTNAME=ubuntu-agent

      # Backend - use Docker for container builds
      - WOODPECKER_BACKEND=docker

volumes:
  woodpecker-data:
    driver: local
```

## Configuring the Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/woodpecker
```

```nginx
server {
    listen 80;
    server_name ci.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ci.example.com;

    ssl_certificate /etc/letsencrypt/live/ci.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ci.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;

    # Web interface
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Required for WebSocket connections (live logs)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/woodpecker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ci.example.com
```

## Starting Woodpecker

```bash
cd /opt/woodpecker
docker-compose up -d

# Monitor startup
docker-compose logs -f woodpecker-server
docker-compose logs -f woodpecker-agent
```

Once started, navigate to `https://ci.example.com`. You will be redirected to Gitea for OAuth authorization.

## Activating Repositories

After logging in, activate a repository to enable CI:

1. Click "Add Repository" in the Woodpecker interface
2. Find your repository in the list
3. Click the toggle to activate it

Woodpecker will create a webhook in Gitea automatically. Each push, pull request, or tag will trigger a build.

## Writing Woodpecker Pipelines

Woodpecker uses `.woodpecker.yml` in the repository root. The syntax is similar to Drone CI:

```yaml
# .woodpecker.yml

# Global settings for all steps
labels:
  backend: docker

steps:
  # Step 1: Install dependencies and run tests
  - name: test
    image: node:20-alpine
    commands:
      - npm ci
      - npm run lint
      - npm test -- --coverage

  # Step 2: Build and push Docker image
  - name: docker-build
    image: woodpeckerci/plugin-docker-buildx
    settings:
      repo: gitea.example.com/myuser/myapp
      registry: gitea.example.com
      username:
        from_secret: registry_user
      password:
        from_secret: registry_password
      tags:
        - latest
        - ${CI_COMMIT_SHA:0:8}
    when:
      branch: main
      event: push

  # Step 3: Deploy to server
  - name: deploy
    image: alpine/ssh
    environment:
      SSH_PRIVATE_KEY:
        from_secret: deploy_ssh_key
    commands:
      - echo "$SSH_PRIVATE_KEY" > /tmp/deploy_key
      - chmod 600 /tmp/deploy_key
      - ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no \
          deploy@prod.example.com \
          "cd /opt/myapp && docker-compose pull && docker-compose up -d"
    when:
      branch: main
      event: push

# Only run on push to main or pull requests
when:
  event:
    - push
    - pull_request
```

## Parallel Steps

Woodpecker supports running steps in parallel using `group`:

```yaml
steps:
  # These two steps run in parallel
  - name: lint
    image: node:20-alpine
    group: checks
    commands:
      - npm run lint

  - name: test-unit
    image: node:20-alpine
    group: checks
    commands:
      - npm run test:unit

  # This step runs after both parallel steps complete
  - name: test-integration
    image: node:20-alpine
    commands:
      - npm run test:integration
```

## Managing Secrets

Secrets can be set through the Woodpecker UI or CLI:

```bash
# Install Woodpecker CLI
curl -L https://github.com/woodpecker-ci/woodpecker/releases/latest/download/woodpecker-cli_linux_amd64.tar.gz | tar xz
sudo mv woodpecker-cli /usr/local/bin/

# Configure CLI
export WOODPECKER_SERVER=https://ci.example.com
export WOODPECKER_TOKEN=your-api-token  # From Woodpecker UI: Settings > Token

# Add a secret
woodpecker secret add \
    --repository myuser/myrepo \
    --name deploy_ssh_key \
    --value "$(cat ~/.ssh/deploy_id_rsa)"

# List secrets
woodpecker secret list --repository myuser/myrepo

# Organization-wide secret (available to all repos in org)
woodpecker secret add \
    --organization myorg \
    --name registry_password \
    --value "mypassword"
```

## Using Gitea Container Registry

Gitea 1.19+ includes a built-in container registry. Push images there and pull them in CI:

```bash
# Log in to Gitea's container registry
docker login gitea.example.com -u yourusername

# Tag and push an image
docker tag myapp:latest gitea.example.com/myuser/myapp:latest
docker push gitea.example.com/myuser/myapp:latest
```

In Woodpecker pipeline, authenticate to the Gitea registry using secrets.

## Caching Build Artifacts

Woodpecker supports caching to speed up builds:

```yaml
steps:
  - name: restore-cache
    image: meltwater/drone-cache
    settings:
      backend: filesystem
      restore: true
      cache_key: "node-{{ checksum \"package-lock.json\" }}"
      mount:
        - node_modules

  - name: install
    image: node:20-alpine
    commands:
      - npm ci

  - name: rebuild-cache
    image: meltwater/drone-cache
    settings:
      backend: filesystem
      rebuild: true
      cache_key: "node-{{ checksum \"package-lock.json\" }}"
      mount:
        - node_modules
```

## Troubleshooting

**OAuth redirect mismatch:** The redirect URI in Gitea's OAuth app must exactly match what Woodpecker uses. Check the `WOODPECKER_HOST` environment variable and ensure the URI in Gitea ends with `/authorize`.

**Webhook not firing:** Check that Woodpecker created the webhook in the Gitea repository (Settings > Webhooks). If not, re-activate the repository in Woodpecker, or add the webhook manually pointing to `https://ci.example.com/api/hook`.

**Agent not connecting:** Verify `WOODPECKER_AGENT_SECRET` matches exactly in both server and agent configurations. Check agent logs for connection errors.

**Builds fail with image pull errors:** The agent runs builds inside Docker. Ensure the Docker host has internet access (or registry access) to pull the images specified in `.woodpecker.yml`.

The Gitea plus Woodpecker combination offers a fully self-hosted CI/CD stack with minimal resource requirements. A single Ubuntu server with 4GB RAM can comfortably run both services and handle builds for a small to medium development team.
