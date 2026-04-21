# How to Set Up a Staging Environment with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Staging, CI/CD, DevOps, Environment

Description: Configure a dedicated staging environment in Portainer that mirrors production, enabling safe pre-release testing.

## Introduction

A staging environment is a close replica of production where you test changes before they go live. Portainer's multi-environment support makes this straightforward - you can manage separate Docker endpoints (staging vs production) from a single Portainer instance. This guide covers setting up a proper staging environment.

## Step 1: Add Staging Environment to Portainer

On your staging server:
```bash
# Install Portainer Agent on the staging server

docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

In Portainer (on your main server):
1. Go to **Environments** > **Add environment**
2. Select **Docker Standalone**
3. Under **More options**, select **Agent**
4. Enter your staging server address: `staging-server:9001`
5. Name it "Staging"

## Step 2: Staging Stack Configuration

```yaml
# docker-compose.staging.yml - Staging environment
networks:
  staging_network:
    driver: bridge

volumes:
  staging_db:
  staging_redis:

services:
  # API service (staging version)
  api:
    image: registry.yourdomain.com/myapp/api:${IMAGE_TAG:-latest}
    container_name: staging_api
    restart: unless-stopped
    environment:
      - ENVIRONMENT=staging
      - DEBUG=true
      # Staging database (separate from production)
      - DATABASE_URL=postgresql://staging:staging_pass@staging_db:5432/staging_myapp
      - REDIS_URL=redis://staging_redis:6379/0
      # Feature flags - enable experimental features in staging
      - FEATURE_NEW_UI=true
      - FEATURE_BETA_API=true
      # Allow more verbose logging
      - LOG_LEVEL=debug
      # Staging-specific webhook/callback URLs
      - WEBHOOK_URL=https://staging.yourdomain.com/webhooks
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.staging-api.rule=Host(`api.staging.yourdomain.com`)"
      - "traefik.http.routers.staging-api.entrypoints=websecure"
      - "traefik.http.routers.staging-api.tls=true"
      - "traefik.http.services.staging-api.loadbalancer.server.port=8000"
    networks:
      - staging_network

  # Staging database (isolated from production)
  staging_db:
    image: postgres:15-alpine
    container_name: staging_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=staging_myapp
      - POSTGRES_USER=staging
      - POSTGRES_PASSWORD=staging_pass
    volumes:
      - staging_db:/var/lib/postgresql/data
      # Load test data automatically on first database initialization
      - ./seed/staging-seed.sql:/docker-entrypoint-initdb.d/seed.sql
    networks:
      - staging_network

  # Staging Redis
  staging_redis:
    image: redis:7-alpine
    container_name: staging_redis
    volumes:
      - staging_redis:/data
    networks:
      - staging_network

  # Mailhog - capture emails in staging (don't send real emails)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: staging_mailhog
    restart: unless-stopped
    ports:
      - "8025:8025"    # Web UI
    networks:
      - staging_network

  # Mock external services for staging
  mock_payments:
    image: mockoon/cli:latest
    container_name: mock_payments
    restart: unless-stopped
    volumes:
      - ./mocks/payment-api.json:/data/mock.json
    command: ["--data", "/data/mock.json", "--port", "3001"]
    networks:
      - staging_network
```

## Step 3: Seed Staging Database

```sql
-- seed/staging-seed.sql - Test data for staging

-- Create test users
INSERT INTO users (id, email, name, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@test.com', 'Test Admin', 'admin'),
    ('22222222-2222-2222-2222-222222222222', 'user@test.com', 'Test User', 'user'),
    ('33333333-3333-3333-3333-333333333333', 'editor@test.com', 'Test Editor', 'editor');

-- Create test products
INSERT INTO products (id, name, price, stock) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Product 1', 9.99, 100),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'Test Product 2', 19.99, 50),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'Premium Product', 99.99, 10);
```

## Step 4: Staging vs Production Comparison

Use Portainer's multi-environment view, or compare from the CLI with Docker SSH access:

```bash
# Compare running image versions
# Requires Docker CLI SSH access to each host
STAGING_VERSIONS=$(docker -H ssh://staging-server ps --format '{{.Image}}' | sort)

PROD_VERSIONS=$(docker -H ssh://production-server ps --format '{{.Image}}' | sort)

# Show differences
diff <(echo "$STAGING_VERSIONS") <(echo "$PROD_VERSIONS")
```

## Step 5: Automatic Staging Deployment Script

```bash
#!/bin/bash
# deploy-to-staging.sh - Deploy to staging after tests pass

set -euo pipefail

IMAGE_TAG="$1"
STACK_FILE="docker-compose.staging.yml"

# Update the staging stack. This example is for a file-based Portainer stack.
curl -f -X PUT \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/stacks/$STAGING_STACK_ID?endpointId=$STAGING_ENDPOINT_ID" \
  --data "$(jq -n \
    --arg image_tag "$IMAGE_TAG" \
    --rawfile stack_file "$STACK_FILE" \
    '{
      Env: [
        {"name": "IMAGE_TAG", "value": $image_tag}
      ],
      StackFileContent: $stack_file,
      RepullImageAndRedeploy: true
    }')"

echo "Deployed $IMAGE_TAG to staging"

# Wait and run smoke tests
sleep 30

# Run smoke tests
curl -f https://api.staging.yourdomain.com/health || {
    echo "Staging smoke test FAILED!"
    exit 1
}

echo "Staging deployment verified!"
```

## Step 6: Environment Comparison Dashboard

```text
# No Compose file is required for this dashboard view.
# Each environment is a separate Portainer endpoint.
# Staging: api.staging.yourdomain.com (IMAGE_TAG = develop-abc123)
# Production: api.yourdomain.com (IMAGE_TAG = main-def456)
```

In Portainer's top navigation, switch between environments with the environment selector. You'll see each environment's containers, stacks, and resource usage independently.

## Conclusion

A proper staging environment mirrors production closely enough to catch issues before they reach users. Portainer's multi-environment support makes it easy to manage both from a single dashboard, compare container versions, and deploy to staging before promoting to production. Mailhog prevents staging from sending real emails, mock services prevent external API calls, and seeded test data ensures reproducible test scenarios.
