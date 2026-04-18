# How to Use Portainer with VS Code Dev Containers - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, VS Code, Dev Container, Development, Productivity

Description: Integrate VS Code Dev Containers with Portainer-managed Docker environments for a seamless containerized development workflow.

## Introduction

VS Code Dev Containers let you open any folder inside a Docker container and use VS Code's full feature set - extensions, debugging, terminals - all running inside the container. Combined with Portainer's management capabilities, you get both a great development experience and operational visibility. This guide shows how to set up and use Dev Containers alongside Portainer.

## Prerequisites

- VS Code with the Dev Containers extension installed
- Docker Desktop or Docker Engine running
- Portainer deployed locally
- Docker Compose

## Step 1: Create a Dev Container Configuration

```bash
# Create the .devcontainer directory

mkdir -p .devcontainer
```

### Simple devcontainer.json (Single Container)

```json
// .devcontainer/devcontainer.json
{
  "name": "My Application",

  // Use a prebuilt image
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",

  // Or build from a Dockerfile
  // "build": {
  //   "dockerfile": "Dockerfile",
  //   "context": ".."
  // },

  // Features - add tools to the container
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  // Port forwarding
  "forwardPorts": [3000, 9229, 5432],

  // VS Code extensions to install
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-azuretools.vscode-docker",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "typescript.updateImportsOnFileMove.enabled": "always"
      }
    }
  },

  // Run after container creation
  "postCreateCommand": "npm install",

  // Run after VS Code connects
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}",

  // Mount the workspace
  "workspaceFolder": "/workspace",
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspace,type=bind,consistency=cached",

  // Environment variables
  "containerEnv": {
    "NODE_ENV": "development"
  },

  // Run as this user
  "remoteUser": "node"
}
```

## Step 2: Dev Container with Docker Compose (Portainer-Compatible)

```json
// .devcontainer/devcontainer.json - Using Docker Compose
{
  "name": "Full Stack Dev",

  // Reference the docker-compose file
  "dockerComposeFile": [
    "../docker-compose.yml",
    "docker-compose.dev.yml"
  ],

  // Which service to open in VS Code
  "service": "app",

  // Keep these services running
  "runServices": ["app", "postgres", "redis"],

  "workspaceFolder": "/app",

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-azuretools.vscode-docker",
        "ms-vscode-remote.remote-containers"
      ]
    }
  },

  "forwardPorts": [8000, 5678, 5432, 6379],
  "postCreateCommand": "pip install -r requirements.txt"
}
```

```yaml
# .devcontainer/docker-compose.dev.yml - Dev overrides
version: "3.8"

services:
  app:
    volumes:
      # Override to mount as workspace
      - ../:/app:cached
      # Persist shell history
      - devcontainer_bashhistory:/root/commandhistory
    command: sleep infinity  # VS Code manages the process

volumes:
  devcontainer_bashhistory:
```

## Step 3: Language-Specific Dev Container Examples

### Python FastAPI

```json
// .devcontainer/devcontainer.json
{
  "name": "Python FastAPI",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {},
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.black-formatter",
        "ms-python.pylint",
        "ms-python.mypy-type-checker",
        "charliermarsh.ruff"
      ],
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "[python]": {
          "editor.defaultFormatter": "ms-python.black-formatter",
          "editor.codeActionsOnSave": {
            "source.organizeImports": true
          }
        }
      }
    }
  },
  "postCreateCommand": "pip install -e '.[dev]'",
  "forwardPorts": [8000, 5678]
}
```

### Go Application

```json
// .devcontainer/devcontainer.json
{
  "name": "Go Development",
  "image": "mcr.microsoft.com/devcontainers/go:1.22",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "golang.go"
      ],
      "settings": {
        "go.toolsManagement.autoUpdate": true,
        "go.useLanguageServer": true,
        "[go]": {
          "editor.defaultFormatter": "golang.go",
          "editor.formatOnSave": true,
          "editor.codeActionsOnSave": {
            "source.organizeImports": true
          }
        }
      }
    }
  },
  "postCreateCommand": "go mod download"
}
```

## Step 4: Portainer Integration

### View Dev Container Logs in Portainer

Dev Containers create Docker containers that appear in Portainer:

1. Open Portainer at `https://localhost:9443`
2. Navigate to **Containers**
3. Look for containers prefixed with `vsc-` (VS Code's naming convention)
4. Click on the container to view logs, stats, and resource usage

### Share Dev Container with Team via Portainer Stack

```yaml
# docker-compose.team-dev.yml - Shared dev environment
version: "3.8"

networks:
  team_dev:
    driver: bridge

services:
  # Shared development services (not individual IDEs)
  postgres:
    image: postgres:15-alpine
    container_name: team_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=dev
    networks:
      - team_dev

  redis:
    image: redis:7-alpine
    container_name: team_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - team_dev

  # Shared mock services
  mailhog:
    image: mailhog/mailhog:latest
    container_name: team_mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"
      - "8025:8025"
    networks:
      - team_dev
```

```bash
# Deploy shared services via Portainer
# Each developer runs VS Code Dev Containers locally
# All connect to the shared services deployed in Portainer
```

## Step 5: Mount Docker Socket for Container Management

```json
// devcontainer.json - Access to Docker from within the container
{
  "mounts": [
    "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind"
  ],
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {
      "version": "latest"
    }
  }
}
```

## Step 6: Rebuild Dev Container via Portainer

When you need to rebuild:

**Via VS Code:**
- Press `F1` > `Dev Containers: Rebuild Container`

**Via Portainer:**
```bash
# Portainer can't directly rebuild Dev Containers, but can:
# 1. Remove the vsc-* container
# 2. VS Code will recreate it on next connection

# Or use the Docker CLI
docker rm -f $(docker ps -a | grep "vsc-" | awk '{print $1}')
```

## Conclusion

VS Code Dev Containers and Portainer complement each other well: Dev Containers provide the IDE-integrated development experience with language servers, debugging, and extensions running inside Docker, while Portainer manages the supporting infrastructure services and gives operational visibility. Together, they create a reproducible, consistent development environment that works identically on every developer's machine.
