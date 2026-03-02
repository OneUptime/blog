# How to Set Up Drone CI Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, Drone CI, Docker, DevOps

Description: Install and configure Drone CI server on Ubuntu with Docker, connecting it to Gitea or GitHub to build automated CI/CD pipelines for your projects.

---

Drone is a container-native CI/CD platform where every pipeline step runs inside a Docker container. Configuration lives in a `.drone.yml` file in each repository, and the server is lightweight compared to Jenkins. Drone integrates with multiple Git providers including Gitea, GitHub, GitLab, and Bitbucket.

This guide sets up a self-hosted Drone CI server on Ubuntu using Docker, connected to a Gitea or GitHub source control system.

## Prerequisites

- Ubuntu 20.04 or later
- Docker installed and running
- A domain name (or IP address) for the Drone server
- A Git repository provider (Gitea or GitHub)
- Ports 80 and 443 accessible (or an alternative port)

## Installing Docker

```bash
# Install Docker if not already present
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker is running
docker ps
```

## Configuring the Git Provider

### Option A: Connecting to Gitea

In Gitea, create an OAuth2 application:

1. Go to Gitea Settings > Applications > Manage OAuth2 Applications
2. Create a new application:
   - Application Name: `Drone CI`
   - Redirect URI: `https://drone.example.com/login`
3. Save the Client ID and Client Secret

### Option B: Connecting to GitHub

In GitHub, go to Settings > Developer settings > OAuth Apps > New OAuth App:
- Application name: `Drone CI`
- Homepage URL: `https://drone.example.com`
- Authorization callback URL: `https://drone.example.com/login`

Note the Client ID and generate a Client Secret.

## Generating a Shared Secret

Drone server and runner communicate using a shared secret:

```bash
# Generate a random shared secret
openssl rand -hex 16
# Save this value - you will need it for both server and runner config
```

## Setting Up Drone Server with Docker Compose

Create a directory for Drone configuration:

```bash
mkdir -p /opt/drone
cd /opt/drone
```

Create the Docker Compose file:

```bash
nano /opt/drone/docker-compose.yml
```

```yaml
version: '3.8'

services:
  drone-server:
    image: drone/drone:2
    container_name: drone-server
    restart: unless-stopped
    ports:
      - "3000:80"     # HTTP
      - "3001:443"    # HTTPS (if using Drone's built-in TLS)
    volumes:
      - drone-data:/data
    environment:
      # Server host and protocol
      - DRONE_SERVER_HOST=drone.example.com
      - DRONE_SERVER_PROTO=https

      # Shared secret between server and runner
      - DRONE_RPC_SECRET=your-generated-secret-here

      # Gitea OAuth2 credentials (if using Gitea)
      - DRONE_GITEA_SERVER=https://gitea.example.com
      - DRONE_GITEA_CLIENT_ID=your-gitea-client-id
      - DRONE_GITEA_CLIENT_SECRET=your-gitea-client-secret

      # OR GitHub OAuth2 (comment out Gitea section and uncomment this)
      # - DRONE_GITHUB_CLIENT_ID=your-github-client-id
      # - DRONE_GITHUB_CLIENT_SECRET=your-github-client-secret

      # Admin user (must match username in Git provider)
      - DRONE_USER_CREATE=username:yourgitusername,admin:true

      # TLS (optional - can use reverse proxy instead)
      # - DRONE_TLS_AUTOCERT=true

      # Logging
      - DRONE_LOGS_DEBUG=false
      - DRONE_LOGS_TEXT=true

  drone-runner-docker:
    image: drone/drone-runner-docker:1
    container_name: drone-runner-docker
    restart: unless-stopped
    depends_on:
      - drone-server
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Connect to the Drone server
      - DRONE_RPC_PROTO=http
      - DRONE_RPC_HOST=drone-server
      - DRONE_RPC_SECRET=your-generated-secret-here

      # Runner capacity (concurrent builds)
      - DRONE_RUNNER_CAPACITY=2
      - DRONE_RUNNER_NAME=ubuntu-runner

      # Resource limits per pipeline
      - DRONE_MEMORY_LIMIT=2000000000    # 2GB per build
      - DRONE_CPU_LIMIT=2               # 2 CPU cores per build

volumes:
  drone-data:
    driver: local
```

## Setting Up a Reverse Proxy (Nginx)

Instead of exposing Drone directly, use Nginx as a reverse proxy for TLS termination:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

sudo nano /etc/nginx/sites-available/drone
```

```nginx
server {
    listen 80;
    server_name drone.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drone.example.com;

    ssl_certificate /etc/letsencrypt/live/drone.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drone.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (required for live log streaming)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Increase timeouts for long builds
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/drone /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d drone.example.com
```

## Starting Drone

```bash
cd /opt/drone

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f drone-server
docker-compose logs -f drone-runner-docker

# Verify both containers are running
docker-compose ps
```

## First-Time Configuration

Navigate to `https://drone.example.com` in your browser. You will be redirected to your Git provider for OAuth authorization. After authorizing, you will be logged in as the admin user.

## Creating a Pipeline

Add a `.drone.yml` file to a repository to define the CI pipeline:

```yaml
# .drone.yml - place in root of repository

kind: pipeline
type: docker
name: default

steps:
  # Step 1: Run tests
  - name: test
    image: node:18-alpine
    commands:
      - npm ci
      - npm test

  # Step 2: Build Docker image (only on main branch)
  - name: build
    image: plugins/docker
    settings:
      repo: myregistry.example.com/myapp
      tags:
        - latest
        - ${DRONE_COMMIT_SHA:0:8}
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
    when:
      branch:
        - main

  # Step 3: Deploy (only on main branch)
  - name: deploy
    image: alpine
    environment:
      SSH_KEY:
        from_secret: deploy_ssh_key
    commands:
      - apk add openssh-client
      - echo "$SSH_KEY" > /tmp/key && chmod 600 /tmp/key
      - ssh -i /tmp/key -o StrictHostKeyChecking=no deploy@server.example.com "docker pull myregistry.example.com/myapp:latest && docker-compose -f /opt/myapp/docker-compose.yml up -d"
    when:
      branch:
        - main

# Trigger on push and pull requests
trigger:
  event:
    - push
    - pull_request
```

## Adding Secrets

Secrets are stored in Drone and injected into pipelines as environment variables:

```bash
# Using Drone CLI
# Install CLI
curl -L https://github.com/harness/drone-cli/releases/latest/download/drone_linux_amd64.tar.gz | tar zx
sudo mv drone /usr/local/bin/

# Configure CLI
export DRONE_SERVER=https://drone.example.com
export DRONE_TOKEN=your-personal-access-token  # Found in Drone account settings

# Add a secret to a repository
drone secret add --repository myuser/myrepo --name registry_password --data "mypassword"

# List secrets
drone secret list --repository myuser/myrepo
```

Or add secrets through the Drone web UI:
1. Navigate to the repository in Drone
2. Click Settings > Secrets
3. Add name and value

## Managing Repositories

Activate a repository to enable CI:

```bash
# List available repositories
drone repo ls

# Activate a repository
drone repo enable myuser/myrepo

# Or in the web UI: navigate to the repository and click the toggle
```

## Runner Management

```bash
# Check runner status
docker logs drone-runner-docker | tail -20

# Scale up runners (increase capacity)
# Edit docker-compose.yml and change DRONE_RUNNER_CAPACITY, then restart
docker-compose up -d drone-runner-docker

# Add a different type of runner (e.g., exec runner for running directly on host)
# See Drone documentation for runner-exec configuration
```

## Troubleshooting

**OAuth redirect fails:** Verify the callback URL in the OAuth app exactly matches `https://drone.example.com/login`. Check Drone logs for the actual redirect happening.

**Builds stuck in pending:** Check that the runner is connected to the server. In Drone's system settings, look at runner connections. Verify `DRONE_RPC_SECRET` matches between server and runner.

**Builds fail immediately:** Check the pipeline YAML syntax. Drone validates YAML strictly. Use `drone jsonnet` or a YAML linter to check before committing.

**Cannot pull images:** The runner needs Docker registry credentials. Either add them as secrets in your pipeline or configure a Docker credential helper on the runner container.

**WebSocket connection failing in browser:** Ensure the Nginx proxy has WebSocket support enabled (the `Upgrade` and `Connection` headers in the proxy configuration).

Drone is particularly well-suited to teams already using Docker who want a lightweight CI server without the operational overhead of Jenkins or GitLab CI's complexity.
