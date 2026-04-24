# How to Deploy Drone CI via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Drone CI, CI/CD, DevOps, Self-Hosted

Description: Deploy Drone CI via Portainer for a container-native CI/CD platform that integrates with GitHub, Gitea, or GitLab and runs each pipeline step in isolated containers.

## Introduction

Drone CI is a container-native CI/CD platform where every pipeline step runs in a dedicated Docker container. It integrates with GitHub, GitLab, Gitea, and Bitbucket. Deploying via Portainer gives you a lightweight CI/CD platform that scales from a Raspberry Pi to cloud VMs.

## Prerequisites

- Git provider (GitHub, Gitea, or GitLab) with OAuth application configured
- Portainer installed
- Domain name for Drone (or use IP)

## Step 1: Create OAuth Application

For Gitea:
1. Go to Gitea **User Settings > Applications**
2. Create an OAuth2 application
3. Authorization callback URL: `http://drone.example.com/login` (use the exact scheme and host configured for Drone)
4. Enable **Confidential Client**
5. Note the **Client ID** and **Client Secret**

## Deploy as a Stack

```yaml
version: "3.8"

services:
  # Drone Server
  drone-server:
    image: drone/drone:2
    container_name: drone-server
    environment:
      # Gitea integration
      - DRONE_GITEA_SERVER=https://gitea.example.com
      - DRONE_GITEA_CLIENT_ID=your_gitea_client_id
      - DRONE_GITEA_CLIENT_SECRET=your_gitea_client_secret
      
      # Server configuration
      - DRONE_SERVER_HOST=drone.example.com
      - DRONE_SERVER_PROTO=http
      
      # Shared secret for runner authentication
      - DRONE_RPC_SECRET=your_shared_secret_here
      
      # Admin user
      - DRONE_USER_CREATE=username:gitea_admin,admin:true
      
      # Logging
      - DRONE_LOGS_PRETTY=true
      - DRONE_LOGS_COLOR=true
    volumes:
      - drone_data:/data
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped

  # Drone Runner (Docker runner)
  drone-runner:
    image: drone/drone-runner-docker:1
    container_name: drone-runner
    environment:
      - DRONE_RPC_PROTO=http
      - DRONE_RPC_HOST=drone-server
      - DRONE_RPC_SECRET=your_shared_secret_here
      - DRONE_RUNNER_CAPACITY=2        # Parallel pipelines
      - DRONE_RUNNER_NAME=docker-runner
      - DRONE_LOGS_TRACE=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - drone-server
    restart: unless-stopped

volumes:
  drone_data:
```

## Generate RPC Secret

```bash
# Generate a secure random secret

openssl rand -hex 16
```

## Example Drone Pipeline

Create `.drone.yml` in your repository:

```yaml
---
kind: pipeline
type: docker
name: default

steps:
  # Run unit tests
  - name: test
    image: node:20-alpine
    commands:
      - npm ci
      - npm test

  # Build Docker image
  - name: build
    image: plugins/docker
    settings:
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
      repo: registry.example.com/myapp
      tags:
        - ${DRONE_COMMIT_SHA:0:8}
        - latest
    when:
      branch:
        - main

  # Deploy via Portainer webhook
  - name: deploy
    image: curlimages/curl
    commands:
      - |
        curl -X POST \
          ${PORTAINER_WEBHOOK_URL} \
          -H "Content-Type: application/json"
    environment:
      PORTAINER_WEBHOOK_URL:
        from_secret: portainer_webhook_url
    when:
      branch:
        - main
      event:
        - push
```

## Multiple Pipelines (Multiple Environments)

```yaml
---
kind: pipeline
type: docker
name: node-18

steps:
  - name: test
    image: node:18-alpine
    commands:
      - npm ci
      - npm test

---
kind: pipeline
type: docker
name: node-20

steps:
  - name: test
    image: node:20-alpine
    commands:
      - npm ci
      - npm test

---
kind: pipeline
type: docker
name: node-22

steps:
  - name: test
    image: node:22-alpine
    commands:
      - npm ci
      - npm test
```

## Adding Secrets

In Drone UI:
1. Navigate to your repository
2. Click **Settings > Secrets**
3. Add secrets: `docker_username`, `docker_password`, `portainer_webhook_url`

Or via Drone CLI:

```bash
drone secret add \
  --repository username/myapp \
  --name docker_password \
  --data "your_registry_password"
```

## Conclusion

Drone CI deployed via Portainer provides a clean, container-native CI/CD platform. Each pipeline step running in an isolated container means clean builds with no environmental contamination. The lightweight architecture makes it excellent for self-hosted environments, and the Gitea integration creates a complete self-hosted development platform alongside your Gitea instance.
