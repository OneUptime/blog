# How to Deploy Multi-Service Applications as Stacks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Docker Compose, Stack, DevOps

Description: Learn how to deploy multi-service applications as stacks in Portainer using Docker Compose definitions.

## Introduction

Portainer Stacks provide a powerful way to manage multi-service applications using Docker Compose syntax. Instead of managing each container individually, stacks let you define, deploy, and manage entire application environments as a single unit. This guide walks you through deploying a multi-service application as a stack in Portainer.

## Prerequisites

- Portainer CE or BE installed and running
- Docker Engine 20.10+ or Docker Swarm cluster
- Basic familiarity with Docker Compose syntax

## Understanding Portainer Stacks

A Portainer Stack is essentially a Docker Compose file managed through the Portainer UI. In Portainer, stacks can be deployed on:

- **Standalone Docker** - uses Docker Compose v2
- **Docker Swarm** - uses `docker stack deploy` under the hood

For Kubernetes environments, Portainer uses **Applications** deployed from manifests or Helm charts rather than Docker stacks.

## Step 1: Navigate to Stacks

1. Log in to your Portainer instance
2. Select your Docker environment from the Home screen
3. Click **Stacks** in the left sidebar
4. Click **+ Add stack**

## Step 2: Define Your Stack

Choose one of the deployment methods:

- **Web editor** - write the Compose file directly in the browser
- **Upload** - upload a `docker-compose.yml` file
- **Repository** - pull from a Git repository
- **Custom template** - use a saved template

## Step 3: Write Your Docker Compose File

Here is an example multi-service application stack with a web app, API, database, and cache service:

```yaml
services:
  # Frontend web application
  frontend:
    image: nginx:alpine
    ports:
      - "80:80"

  # Backend API service
  api:
    image: node:20-alpine
    command:
      - node
      - -e
      - |
        require('http')
          .createServer((req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          })
          .listen(3000, '0.0.0.0');
    ports:
      - "3000:3000"

  # PostgreSQL database
  database:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data

  # Redis cache
  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - cache-data:/data

volumes:
  db-data:
  cache-data:
```

## Step 4: Configure Stack Settings

Before deploying, configure additional settings:

- **Stack name** - give your stack a meaningful name (e.g., `my-webapp`)
- **Environment variables** - define them in Portainer or load them from a `.env` file
- **Access control** - restrict stack management to specific teams (BE only)

## Step 5: Deploy the Stack

1. Click **Deploy the stack**
2. Portainer pulls the images and creates all services
3. Monitor the deployment output in the logs panel

## Step 6: Verify the Deployment

After deployment:

1. Click on the stack name to view all services
2. Check that each container shows a **Running** status
3. Click on individual containers to view logs
4. Use the **Console** feature to exec into containers if needed

## Managing the Stack

From the stack detail page you can:

- **Update** the stack by modifying the Compose file
- **Stop/Start** all services at once
- **Remove** the entire stack and optionally remove volumes
- **Duplicate** the stack to another environment

## Environment Variables in Stacks

Use the **Environment variables** section in Portainer to inject configuration values without hardcoding them:

```yaml
services:
  api:
    image: myapi:latest
    environment:
      - DB_PASSWORD=${DB_PASSWORD}   # Injected from Portainer env vars
      - API_KEY=${API_KEY}
```

In the Portainer UI, add `DB_PASSWORD` and `API_KEY` as environment variable entries before deploying. For highly sensitive values, prefer Docker secrets where your deployment target supports them.

## Troubleshooting

- **Image pull errors** - verify registry credentials are configured in Portainer
- **Port conflicts** - check that host ports are not already in use
- **Volume mount errors** - ensure the host path exists or use named volumes
- **Network errors** - confirm network names are unique within the environment

## Conclusion

Portainer Stacks make it straightforward to deploy and manage complex multi-service applications. By combining Docker Compose syntax with Portainer's visual interface, you get the best of both worlds: infrastructure-as-code for repeatability and a GUI for easy day-to-day management. Start with a simple Compose file and progressively add services as your application grows.
