# How to Set Up a CI/CD Stack (Gitea + Drone) with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Gitea, Drone CI, CI/CD, DevOps, Git, Self-Hosted

Description: Deploy a self-hosted CI/CD pipeline with Gitea for Git hosting and Drone for automated builds using Docker Compose.

---

Self-hosted CI/CD gives you full control over your build infrastructure, no vendor lock-in, and the ability to run builds on your own hardware. Gitea is a lightweight Git hosting solution written in Go that runs anywhere. Drone CI integrates tightly with Gitea and provides a clean, container-native build system where every pipeline step runs in its own Docker container.

This guide sets up both services with Docker Compose, configures the OAuth2 integration between them, and walks through creating your first build pipeline.

## Architecture

```mermaid
graph LR
    Developer --> Gitea["Gitea (Git Server)"]
    Gitea --> Drone["Drone Server"]
    Drone --> Runner["Drone Runner"]
    Runner --> Docker["Docker Engine"]
    Docker --> Build["Build Containers"]
```

Developers push code to Gitea. Gitea sends webhooks to Drone when events happen (pushes, pull requests, tags). The Drone server schedules the pipeline, and Drone runners execute each step in isolated Docker containers.

## Prerequisites

You need Docker Engine and Docker Compose installed. You also need a hostname or IP address that both Gitea and Drone can use to communicate with each other. For local development, `localhost` works, but for team use, you will want a proper domain or static IP.

Generate a shared secret for Drone and Gitea:

```bash
# Generate a random secret for RPC communication between Drone server and runners
openssl rand -hex 16
```

Save this value. You will use it in the compose configuration.

## Docker Compose Configuration

```yaml
# CI/CD Stack - Gitea + Drone CI
version: "3.8"

services:
  # Gitea - lightweight Git hosting
  gitea:
    image: gitea/gitea:1.21
    container_name: gitea
    ports:
      - "3000:3000"
      - "2222:22"
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__database__DB_TYPE=sqlite3
      - GITEA__server__ROOT_URL=http://localhost:3000/
      - GITEA__server__DOMAIN=localhost
      - GITEA__server__SSH_DOMAIN=localhost
      - GITEA__server__SSH_PORT=2222
    volumes:
      - gitea-data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    networks:
      - cicd-network

  # Drone CI Server - pipeline orchestration
  drone:
    image: drone/drone:2
    container_name: drone
    ports:
      - "8080:80"
    environment:
      - DRONE_GITEA_SERVER=http://gitea:3000
      - DRONE_GITEA_CLIENT_ID=${DRONE_GITEA_CLIENT_ID}
      - DRONE_GITEA_CLIENT_SECRET=${DRONE_GITEA_CLIENT_SECRET}
      - DRONE_RPC_SECRET=${DRONE_RPC_SECRET}
      - DRONE_SERVER_HOST=localhost:8080
      - DRONE_SERVER_PROTO=http
      - DRONE_USER_CREATE=username:your-gitea-admin,admin:true
    volumes:
      - drone-data:/data
    depends_on:
      - gitea
    restart: unless-stopped
    networks:
      - cicd-network

  # Drone Runner - executes pipeline steps in Docker containers
  drone-runner:
    image: drone/drone-runner-docker:1
    container_name: drone-runner
    environment:
      - DRONE_RPC_PROTO=http
      - DRONE_RPC_HOST=drone
      - DRONE_RPC_SECRET=${DRONE_RPC_SECRET}
      - DRONE_RUNNER_CAPACITY=2
      - DRONE_RUNNER_NAME=local-runner
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - drone
    restart: unless-stopped
    networks:
      - cicd-network

volumes:
  gitea-data:
  drone-data:

networks:
  cicd-network:
    driver: bridge
```

## Environment File

Create a `.env` file for the secrets:

```bash
# .env - CI/CD stack secrets (do not commit to version control)
DRONE_RPC_SECRET=your_generated_hex_secret_here
DRONE_GITEA_CLIENT_ID=
DRONE_GITEA_CLIENT_SECRET=
```

You will fill in the Gitea OAuth client ID and secret after the initial setup.

## Initial Setup

Start Gitea first, then configure the OAuth2 application:

```bash
# Start only Gitea first
docker compose up -d gitea

# Wait for it to be ready
sleep 10
curl http://localhost:3000
```

### Step 1: Configure Gitea

1. Open http://localhost:3000 in your browser
2. Complete the installation wizard (defaults are fine for SQLite)
3. Register an admin account

### Step 2: Create OAuth2 Application

1. In Gitea, go to Settings, then Applications
2. Create a new OAuth2 application with these values:
   - Application Name: Drone
   - Redirect URI: http://localhost:8080/login
3. Copy the Client ID and Client Secret

### Step 3: Update Environment and Start Drone

```bash
# Update the .env file with the OAuth2 credentials
# DRONE_GITEA_CLIENT_ID=your_client_id
# DRONE_GITEA_CLIENT_SECRET=your_client_secret

# Now start the full stack
docker compose up -d
```

### Step 4: Activate Drone

1. Open http://localhost:8080
2. You will be redirected to Gitea for authorization
3. Authorize the Drone application
4. Drone will sync your repositories

## Creating Your First Pipeline

Create a repository in Gitea and add a `.drone.yml` file at the root:

```yaml
# .drone.yml - Example CI pipeline for a Node.js application
kind: pipeline
type: docker
name: default

steps:
  # Install dependencies
  - name: install
    image: node:20-alpine
    commands:
      - npm ci

  # Run linting
  - name: lint
    image: node:20-alpine
    commands:
      - npm run lint

  # Run tests
  - name: test
    image: node:20-alpine
    commands:
      - npm test

  # Build the application
  - name: build
    image: node:20-alpine
    commands:
      - npm run build

trigger:
  branch:
    - main
  event:
    - push
    - pull_request
```

Push this file to your Gitea repository, and Drone will automatically pick it up and run the pipeline.

## Pipeline with Docker Build

For building and pushing Docker images from your pipeline:

```yaml
# .drone.yml - Pipeline that builds and pushes a Docker image
kind: pipeline
type: docker
name: build-and-push

steps:
  - name: test
    image: node:20-alpine
    commands:
      - npm ci
      - npm test

  - name: docker
    image: plugins/docker
    settings:
      repo: registry.example.com/myapp
      registry: registry.example.com
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
      tags:
        - latest
        - ${DRONE_COMMIT_SHA:0:8}
    when:
      branch:
        - main
      event:
        - push
```

## Adding Secrets to Drone

Store sensitive values like API keys and passwords in Drone secrets:

```bash
# Install the Drone CLI
curl -L https://github.com/harness/drone-cli/releases/latest/download/drone_linux_amd64.tar.gz | tar zx
sudo install drone /usr/local/bin/

# Configure the CLI
export DRONE_SERVER=http://localhost:8080
export DRONE_TOKEN=your_token_from_drone_ui

# Add a secret to a repository
drone secret add --repository your-user/your-repo --name docker_username --data your_username
drone secret add --repository your-user/your-repo --name docker_password --data your_password
```

## Pipeline with Services

Drone can spin up service containers alongside your build steps, similar to Docker Compose:

```yaml
# .drone.yml - Pipeline with PostgreSQL service for integration tests
kind: pipeline
type: docker
name: integration-tests

services:
  # PostgreSQL service available during the build
  - name: postgres
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb

steps:
  - name: test
    image: python:3.11-slim
    environment:
      DATABASE_URL: postgresql://test:test@postgres:5432/testdb
    commands:
      - pip install -r requirements.txt
      - pytest tests/integration/
```

## Monitoring Build Status

Check build status from the command line:

```bash
# List recent builds for a repository
drone build ls your-user/your-repo

# Get details of a specific build
drone build info your-user/your-repo 1

# View build logs
drone build logs your-user/your-repo 1 1
```

## Scaling Runners

You can run multiple Drone runners to handle more concurrent builds:

```yaml
# Add additional runners to docker-compose.yml
drone-runner-2:
  image: drone/drone-runner-docker:1
  environment:
    - DRONE_RPC_PROTO=http
    - DRONE_RPC_HOST=drone
    - DRONE_RPC_SECRET=${DRONE_RPC_SECRET}
    - DRONE_RUNNER_CAPACITY=2
    - DRONE_RUNNER_NAME=runner-2
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  networks:
    - cicd-network
```

Each runner with `DRONE_RUNNER_CAPACITY=2` handles two concurrent pipelines. Two runners give you four parallel builds.

## Using PostgreSQL Instead of SQLite

For team use, switch Gitea to PostgreSQL for better performance:

```yaml
# Add PostgreSQL service for Gitea
gitea-db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: gitea
    POSTGRES_PASSWORD: gitea
    POSTGRES_DB: gitea
  volumes:
    - gitea-db-data:/var/lib/postgresql/data
  networks:
    - cicd-network
```

Then update the Gitea environment:

```yaml
gitea:
  environment:
    - GITEA__database__DB_TYPE=postgres
    - GITEA__database__HOST=gitea-db:5432
    - GITEA__database__NAME=gitea
    - GITEA__database__USER=gitea
    - GITEA__database__PASSWD=gitea
```

## Troubleshooting

```bash
# Check Drone server logs
docker compose logs drone

# Check runner logs for build execution issues
docker compose logs drone-runner

# Verify Gitea webhook delivery
# In Gitea: Settings > Webhooks > click the webhook > Recent Deliveries

# Test connectivity between services
docker compose exec drone wget -qO- http://gitea:3000/api/v1/version
```

## Summary

This CI/CD stack gives you a fully self-hosted alternative to GitHub Actions or GitLab CI. Gitea provides a fast, lightweight Git server, and Drone offers container-native CI/CD that scales horizontally by adding more runners. The entire setup lives in a Docker Compose file that you can version control and deploy anywhere Docker runs.
