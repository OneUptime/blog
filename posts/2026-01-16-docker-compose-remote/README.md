# How to Deploy Docker Compose Stacks to Remote Hosts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Compose, Remote, Deployment, SSH

Description: Learn how to deploy Docker Compose stacks to remote hosts using Docker contexts, SSH, and deployment automation.

---

Docker Compose can deploy directly to remote hosts using Docker contexts and SSH. This guide covers deploying compose stacks to remote servers without manual file transfers.

## Docker Contexts

Docker contexts store connection information for remote Docker hosts.

```bash
# Create context for remote host
docker context create remote-server \
  --docker "host=ssh://user@192.168.1.100"

# List contexts
docker context ls

# Use specific context
docker context use remote-server

# Or use per-command
docker --context remote-server ps
```

## SSH-Based Deployment

### Basic Remote Deployment

```bash
# Set context
docker context use remote-server

# Deploy compose stack
docker compose up -d

# View remote containers
docker ps

# View remote logs
docker compose logs -f
```

### Using DOCKER_HOST

```bash
# Set environment variable
export DOCKER_HOST="ssh://user@192.168.1.100"

# All docker commands now use remote host
docker compose up -d
docker ps
```

## Context with SSH Key

```bash
# Create context with SSH key
docker context create production \
  --docker "host=ssh://deploy@prod.example.com"

# Ensure SSH key is loaded
ssh-add ~/.ssh/deploy_key

# Or use SSH config
# ~/.ssh/config
# Host prod.example.com
#   User deploy
#   IdentityFile ~/.ssh/deploy_key

# Deploy
docker --context production compose up -d
```

## Multi-Environment Setup

```bash
# Create contexts for each environment
docker context create dev --docker "host=ssh://user@dev.example.com"
docker context create staging --docker "host=ssh://user@staging.example.com"
docker context create production --docker "host=ssh://user@prod.example.com"

# Deploy to each environment
docker --context dev compose up -d
docker --context staging compose up -d
docker --context production compose up -d
```

## Docker Compose with Context

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: ${REGISTRY}/myapp:${VERSION:-latest}
    ports:
      - "80:80"
    environment:
      DATABASE_URL: ${DATABASE_URL}
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure

  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  pgdata:
```

```bash
# Deploy with environment-specific variables
docker --context production compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d
```

## Deployment Scripts

### Basic Deploy Script

```bash
#!/bin/bash
# deploy.sh

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}

echo "Deploying version $VERSION to $ENVIRONMENT"

# Use appropriate context
docker context use $ENVIRONMENT

# Pull latest images
docker compose pull

# Deploy with zero downtime
docker compose up -d --remove-orphans

# Cleanup old images
docker image prune -f

# Verify deployment
docker compose ps

echo "Deployment complete"
```

### Advanced Deploy Script

```bash
#!/bin/bash
# deploy-advanced.sh

set -e

ENVIRONMENT=$1
VERSION=$2
COMPOSE_FILE="docker-compose.yml"
OVERRIDE_FILE="docker-compose.${ENVIRONMENT}.yml"

# Validate inputs
if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./deploy.sh <environment> <version>"
    exit 1
fi

# Set context
docker context use $ENVIRONMENT

# Export variables
export VERSION=$VERSION
export REGISTRY=${REGISTRY:-ghcr.io/myorg}

# Health check function
wait_for_health() {
    local service=$1
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T $service wget -q --spider http://localhost/health 2>/dev/null; then
            echo "$service is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    echo "$service failed health check"
    return 1
}

# Pre-deployment
echo "Starting deployment of $VERSION to $ENVIRONMENT"

# Pull images
docker compose -f $COMPOSE_FILE -f $OVERRIDE_FILE pull

# Deploy
docker compose -f $COMPOSE_FILE -f $OVERRIDE_FILE up -d --remove-orphans

# Wait for services
wait_for_health "web"

# Run migrations
docker compose exec -T web npm run migrate

# Cleanup
docker image prune -f
docker volume prune -f

echo "Deployment successful"
```

## Makefile for Deployments

```makefile
# Makefile

.PHONY: deploy deploy-staging deploy-production rollback

REGISTRY ?= ghcr.io/myorg
VERSION ?= $(shell git rev-parse --short HEAD)

# Build and push
build:
	docker build -t $(REGISTRY)/myapp:$(VERSION) .
	docker push $(REGISTRY)/myapp:$(VERSION)

# Deploy to staging
deploy-staging: build
	docker --context staging compose \
		-f docker-compose.yml \
		-f docker-compose.staging.yml \
		up -d

# Deploy to production
deploy-production: build
	docker --context production compose \
		-f docker-compose.yml \
		-f docker-compose.prod.yml \
		up -d

# Rollback
rollback:
	docker --context $(ENV) compose \
		-f docker-compose.yml \
		-f docker-compose.$(ENV).yml \
		up -d

# View logs
logs:
	docker --context $(ENV) compose logs -f

# Status
status:
	docker --context $(ENV) compose ps
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts

      - name: Create Docker context
        run: |
          docker context create remote \
            --docker "host=ssh://deploy@${{ secrets.DEPLOY_HOST }}"

      - name: Deploy
        env:
          VERSION: ${{ github.sha }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: |
          docker --context remote compose up -d

      - name: Verify deployment
        run: |
          docker --context remote compose ps
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: docker:24
  services:
    - docker:dind
  before_script:
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan $DEPLOY_HOST >> ~/.ssh/known_hosts
    - docker context create remote --docker "host=ssh://deploy@$DEPLOY_HOST"
  script:
    - docker --context remote compose up -d
  environment:
    name: production
  only:
    - main
```

## Remote Compose with Swarm

```bash
# Initialize swarm on remote
docker --context production swarm init

# Deploy stack
docker --context production stack deploy \
  -c docker-compose.yml \
  -c docker-compose.prod.yml \
  myapp

# View stack
docker --context production stack ps myapp

# Update stack
docker --context production stack deploy \
  -c docker-compose.yml \
  -c docker-compose.prod.yml \
  myapp

# Remove stack
docker --context production stack rm myapp
```

## Complete Production Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt

  web:
    image: ${REGISTRY}/myapp:${VERSION}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}

volumes:
  pgdata:
  traefik_certs:
```

```bash
# deploy.sh
#!/bin/bash
set -e

# Load environment
source .env.production

# Set context
docker context use production

# Deploy
docker compose up -d

# Run migrations
docker compose exec -T web npm run migrate

# Verify
curl -f https://$DOMAIN/health || exit 1

echo "Deployment successful"
```

## Summary

| Method | Use Case |
|--------|----------|
| Docker Context | Persistent connection config |
| DOCKER_HOST | Temporary/scripted connections |
| SSH | Secure remote deployment |
| Swarm Stack | Production orchestration |

Docker contexts and SSH enable deploying compose stacks directly to remote hosts. Use contexts for multi-environment management and automate with CI/CD. For live development, see our post on [Docker Compose Watch](https://oneuptime.com/blog/post/2026-01-16-docker-compose-watch/view).

