# How to Set Environment Variables on a Container in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Configuration, DevOps

Description: Learn how to configure environment variables on Docker containers in Portainer using the web UI, including secrets management best practices.

## Introduction

Environment variables are the primary way to configure containerized applications without modifying the image. In Portainer, you can set environment variables directly in the container creation form or load them from a `.env` file. This guide covers both approaches and how to manage sensitive values securely.

## Prerequisites

- Portainer installed with a connected Docker environment
- A container image that accepts configuration via environment variables

## Step 1: Set Environment Variables During Container Creation

1. Log in to Portainer.
2. Navigate to **Containers > Add container**.
3. Set the container name and image.
4. Expand **Advanced container settings** and open the **Environment Variables** section.

You'll see a key-value editor where you can add environment variables.

## Step 2: Add Environment Variables

Click **+ add environment variable** for each variable:

```text
# Common application variables:

Name:   POSTGRES_DB
Value:  myapp

Name:   POSTGRES_USER
Value:  appuser

Name:   POSTGRES_PASSWORD
Value:  changeme123

Name:   TZ
Value:  America/New_York

Name:   LOG_LEVEL
Value:  info

Name:   MAX_CONNECTIONS
Value:  100
```

Each row has:
- **Name**: The environment variable key (case-sensitive)
- **Value**: The variable's value

## Step 3: Understand Environment Variable Precedence

Variables set in Portainer are passed directly to the container, equivalent to:

```bash
# Portainer passes these as -e flags to docker run:
docker run -d \
  --name myapp \
  -e POSTGRES_DB=myapp \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=changeme123 \
  -e TZ=America/New_York \
  myimage:latest
```

Variables set in the image's Dockerfile `ENV` instruction are defaults - container-level `-e` flags override them.

## Step 4: Verify Environment Variables

After creating the container:

1. Click the container name.
2. Review the listed environment variables on the container details page.
3. If you want the raw configuration, open **Inspect**.

Or in the container console/exec:

```bash
# Run env in the container to see all variables
env | sort

# Or check a specific variable
echo $POSTGRES_DB
```

## Best Practices for Sensitive Variables

Avoid putting sensitive values (passwords, API keys) directly in environment variables when possible:

### Option 1: Use Docker Secrets (Swarm Mode)

```yaml
# compose.yaml for a Swarm deployment using Docker secrets

services:
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=appuser
      # Reference a secret instead of a plain password
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

### Option 2: Use Portainer's Secrets Menu (Swarm)

In Portainer for a Docker Swarm environment:
1. Navigate to **Secrets**.
2. Create a secret with the sensitive value.
3. Reference it in the service or stack.

### Option 3: Restrict Variable Visibility

For teams, use Portainer's role-based access control to limit who can view container environment variables.

## Common Environment Variable Patterns

### Database Configuration

```text
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=production_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=<strong_password>
POSTGRES_SSL_MODE=require
```

### Application Behavior

```text
NODE_ENV=production
APP_PORT=3000
LOG_LEVEL=warn
ENABLE_METRICS=true
RATE_LIMIT_PER_MINUTE=60
```

### Cloud Integration

```text
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=my-app-bucket
```

### Timezone

```text
TZ=UTC
# Common values: UTC, America/New_York, Europe/London, Asia/Tokyo
```

## Updating Environment Variables

Docker doesn't support changing env vars on a running container without re-creating it:

1. Navigate to the container in Portainer.
2. Click **Duplicate/Edit**.
3. Modify the environment variables.
4. Click **Deploy the container** to create a new container with updated config.
5. Remove the old container.

For stacks, update the `.env` file or stack environment and re-deploy.

## Conclusion

Environment variables in Portainer provide a clean, image-agnostic way to configure containerized applications. By setting them through the web UI or loading them from a file, you can manage configuration without ever modifying a Docker image. For sensitive values, prefer Docker Swarm secrets in Swarm deployments instead of plain-text environment variables, and use Portainer access controls to limit visibility.
