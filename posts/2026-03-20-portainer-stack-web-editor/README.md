# How to Create a Stack from the Web Editor in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Docker Compose, DevOps

Description: Learn how to create and deploy Docker Compose stacks directly from Portainer's built-in web editor with environment variable support.

## Introduction

Portainer's web editor allows you to paste or type Docker Compose YAML directly in the browser and deploy it as a stack - no file uploads or Git repositories needed. This is the fastest way to get a multi-container application running in Portainer and is ideal for quick deployments, testing configurations, and learning Docker Compose. You can also define environment variables in Portainer and reference them from the Compose file during deployment.

## Prerequisites

- Portainer installed with a connected Docker environment
- Basic understanding of Docker Compose syntax

## What is a Portainer Stack

A Portainer stack is a Compose-based deployment managed through Portainer. It groups the services, containers, networks, and volumes defined in a stack file into a single named unit that can be started, stopped, updated, or removed together.

## Step 1: Navigate to Stacks

1. Log into Portainer.
2. Select your environment (local Docker or a remote endpoint).
3. Navigate to **Stacks** in the left menu.
4. Click **Add stack**.

## Step 2: Configure the Stack

1. Enter a **Name** for the stack: `my-web-app`
2. Select **Web editor** as the build method (should be selected by default).
3. The editor pane opens for you to enter your Compose YAML.

## Step 3: Enter a Docker Compose Configuration

Paste a complete Compose file in the editor:

```yaml
# PostgreSQL database with Adminer

version: "3.8"

services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql

  adminer:
    image: adminer:5
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: postgres

volumes:
  postgres_data:
```

## Step 4: Add Environment Variables

Below the editor, you'll find the **Environment variables** section:

1. Click **Add an environment variable** for each variable.
2. Enter the key and value:

```text
DB_NAME        myapp
DB_USER        myapp_user
DB_PASSWORD    supersecretpassword
```

Or use **Load variables from .env file** to upload a file like:

```text
DB_NAME=myapp
DB_USER=myapp_user
DB_PASSWORD=supersecretpassword
```

## Step 5: Deploy the Stack

1. Review the configuration.
2. Click **Deploy the stack**.
3. Portainer pulls images, creates the required network and volume resources, and starts the stack services.
4. You'll see the stack appear in the Stacks list with its status.

## Step 6: Verify the Deployment

After deployment, in Portainer:
1. Click the stack name to see the services or containers that belong to it.
2. Confirm the services are running.
3. Click a service or container to view its logs if there are issues.

Via CLI:
```bash
# List stack tasks:
docker stack ps my-web-app   # Swarm
# or for Docker Standalone:
docker ps --filter "name=my-web-app"

# View logs:
docker service logs my-web-app_adminer   # Swarm
# or for Docker Standalone:
docker logs <adminer-container-name-or-id>

# Test the deployed service:
curl http://localhost:8080
```

## Step 7: Update the Stack via Web Editor

To modify the stack:
1. Navigate to **Stacks** → click the stack name.
2. The editor shows the current Compose content.
3. Make changes directly in the editor.
4. Click **Update the stack**.

Portainer redeploys the stack with your updated configuration.

## Conclusion

The web editor is the quickest way to deploy multi-container applications in Portainer. Paste your Docker Compose YAML, set environment variables in the UI, and click Deploy. All services, networks, and volumes are created as a single managed unit. For production deployments that need version control and auditability, consider deploying from a Git repository instead - but the web editor is ideal for rapid iteration, testing, and learning Docker Compose without any external tooling.
