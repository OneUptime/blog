# How to Create Dev Containers for Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dev Containers, Docker, VS Code, Development Environment, DevEx

Description: Learn how to create Dev Containers for consistent development environments, including configuration, features, and IDE integration.

---

> "Works on my machine" is no longer an excuse. Dev Containers ensure every team member runs the same environment, from dependencies to extensions.

Dev Containers define your development environment as code. Instead of writing setup documentation that becomes outdated, you ship a container configuration that works everywhere - VS Code, GitHub Codespaces, or any compatible IDE.

## What Are Dev Containers

Dev Containers are Docker containers configured specifically for development. They include your language runtime, tools, extensions, and settings. The open specification means they work across editors and cloud platforms.

Key benefits:
- **Consistency** - Everyone gets the same environment
- **Isolation** - Project dependencies don't conflict
- **Onboarding** - New developers start coding in minutes
- **Reproducibility** - Environment is version controlled

## Project Structure

Dev Container configuration lives in the `.devcontainer` folder at your project root.

```
your-project/
  .devcontainer/
    devcontainer.json     # Main configuration file
    Dockerfile            # Optional custom image
    docker-compose.yml    # Optional multi-container setup
  src/
  package.json
```

## Basic devcontainer.json Configuration

Start with a minimal configuration using a pre-built image.

```json
{
  // Name shown in VS Code
  "name": "Node.js Development",

  // Use a pre-built image from Microsoft
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",

  // Features add common tools without custom Dockerfiles
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  // VS Code extensions to install automatically
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  },

  // Command to run after container is created
  "postCreateCommand": "npm install",

  // Ports to forward from container to host
  "forwardPorts": [3000],

  // Run as non-root user for security
  "remoteUser": "node"
}
```

## Using Custom Dockerfiles

For more control, define your own Dockerfile.

```json
{
  "name": "Python API Development",

  // Build from local Dockerfile
  "build": {
    "dockerfile": "Dockerfile",
    "context": "..",
    "args": {
      "PYTHON_VERSION": "3.12"
    }
  },

  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance"
      ]
    }
  },

  "postCreateCommand": "pip install -r requirements.txt"
}
```

Create the corresponding Dockerfile.

```dockerfile
# .devcontainer/Dockerfile

# Accept build argument for Python version
ARG PYTHON_VERSION=3.12

# Start from Microsoft's Python dev container base
FROM mcr.microsoft.com/devcontainers/python:${PYTHON_VERSION}

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install global Python tools
RUN pip install --no-cache-dir \
    black \
    mypy \
    pytest

# Set working directory
WORKDIR /workspace

# Copy requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Default command keeps container running
CMD ["sleep", "infinity"]
```

## Features for Common Tools

Features are pre-packaged tools you can add without modifying Dockerfiles.

```json
{
  "name": "Full Stack Development",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",

  "features": {
    // Node.js with specific version
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    },

    // Python with pip
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.12"
    },

    // Docker for building images
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},

    // Kubernetes tools
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {},

    // AWS CLI
    "ghcr.io/devcontainers/features/aws-cli:1": {},

    // Terraform
    "ghcr.io/devcontainers/features/terraform:1": {}
  }
}
```

Find more features at [containers.dev/features](https://containers.dev/features).

## VS Code Extensions and Settings

Configure extensions and settings per project.

```json
{
  "name": "React Development",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",

  "customizations": {
    "vscode": {
      // Extensions installed automatically
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "formulahendry.auto-rename-tag",
        "christian-kohler.path-intellisense"
      ],

      // Workspace settings
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        },
        "typescript.tsdk": "node_modules/typescript/lib",
        "files.associations": {
          "*.css": "tailwindcss"
        }
      }
    }
  }
}
```

## Port Forwarding

Expose container ports to your host machine.

```json
{
  "name": "Web Application",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",

  // Simple port list
  "forwardPorts": [3000, 5432, 6379],

  // Detailed port configuration
  "portsAttributes": {
    "3000": {
      "label": "Application",
      "onAutoForward": "notify"
    },
    "5432": {
      "label": "PostgreSQL",
      "onAutoForward": "silent"
    },
    "6379": {
      "label": "Redis",
      "onAutoForward": "ignore"
    }
  },

  // Default behavior for unlisted ports
  "otherPortsAttributes": {
    "onAutoForward": "silent"
  }
}
```

## Environment Variables

Set environment variables for development.

```json
{
  "name": "API Development",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",

  // Container environment variables
  "containerEnv": {
    "DATABASE_URL": "postgresql://postgres:postgres@db:5432/devdb",
    "REDIS_URL": "redis://redis:6379",
    "DEBUG": "true",
    "LOG_LEVEL": "debug"
  },

  // Pass host environment variables
  "remoteEnv": {
    "AWS_ACCESS_KEY_ID": "${localEnv:AWS_ACCESS_KEY_ID}",
    "AWS_SECRET_ACCESS_KEY": "${localEnv:AWS_SECRET_ACCESS_KEY}",
    "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}"
  }
}
```

For secrets, use a `.env` file (add to `.gitignore`).

```json
{
  "name": "API Development",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",

  // Load from .env file
  "runArgs": ["--env-file", ".devcontainer/.env"]
}
```

## Lifecycle Scripts

Run commands at different stages of container lifecycle.

```json
{
  "name": "Full Stack App",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",

  // Run when container is first created
  "postCreateCommand": "npm install && npm run db:migrate",

  // Run every time container starts
  "postStartCommand": "npm run dev:services",

  // Run after VS Code attaches to container
  "postAttachCommand": "echo 'Ready to code!'",

  // Run before container is created (rarely needed)
  "initializeCommand": "echo 'Preparing environment...'"
}
```

For complex setup, use a script file.

```json
{
  "postCreateCommand": "bash .devcontainer/setup.sh"
}
```

```bash
#!/bin/bash
# .devcontainer/setup.sh

set -e

echo "Installing dependencies..."
npm install

echo "Setting up database..."
npm run db:migrate
npm run db:seed

echo "Generating types..."
npm run codegen

echo "Setup complete!"
```

## Multi-Container Setup with Docker Compose

For applications needing databases or other services, use Docker Compose.

```json
{
  "name": "Full Stack with Services",

  // Use docker-compose instead of single image
  "dockerComposeFile": "docker-compose.yml",

  // Service to use for development
  "service": "app",

  // Workspace folder inside container
  "workspaceFolder": "/workspace",

  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "cweijan.vscode-postgresql-client2"
      ]
    }
  },

  "forwardPorts": [8000, 5432, 6379],

  "postCreateCommand": "pip install -r requirements.txt && alembic upgrade head"
}
```

```yaml
# .devcontainer/docker-compose.yml

version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      # Mount source code
      - ..:/workspace:cached
      # Persist extensions and VS Code server
      - vscode-extensions:/home/vscode/.vscode-server/extensions
    # Keep container running
    command: sleep infinity
    # Connect to other services
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/devdb
      REDIS_URL: redis://redis:6379

  db:
    image: postgres:16
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  postgres-data:
  redis-data:
  vscode-extensions:
```

## Best Practices for Team Environments

### 1. Version Pin Everything

```json
{
  // Pin base image version
  "image": "mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm",

  // Pin feature versions
  "features": {
    "ghcr.io/devcontainers/features/git:1.2.0": {},
    "ghcr.io/devcontainers/features/node:1.5.0": {
      "version": "20.10.0"
    }
  }
}
```

### 2. Use Non-Root Users

```json
{
  "remoteUser": "vscode",
  "containerUser": "vscode"
}
```

### 3. Optimize for Rebuild Speed

```dockerfile
# Order layers from least to most frequently changed

# System packages (rarely change)
RUN apt-get update && apt-get install -y ...

# Global tools (occasionally change)
RUN npm install -g typescript eslint

# Project dependencies (change with package.json)
COPY package*.json ./
RUN npm install

# Source code (changes constantly) - mounted, not copied
```

### 4. Document Environment Requirements

```json
{
  "name": "Project Name - Dev Environment",

  // Minimum resources needed
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb",
    "storage": "32gb"
  }
}
```

### 5. Include Essential Quality Tools

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        // Linting and formatting
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",

        // Testing
        "hbenl.vscode-test-explorer",

        // Git
        "eamodio.gitlens",

        // Documentation
        "yzhang.markdown-all-in-one"
      ]
    }
  }
}
```

### 6. Handle Platform Differences

```json
{
  // Different settings per platform
  "runArgs": [
    "--init"
  ],

  // Platform-specific mounts
  "mounts": [
    // SSH keys for git
    "source=${localEnv:HOME}/.ssh,target=/home/vscode/.ssh,type=bind,readonly",
    // Git config
    "source=${localEnv:HOME}/.gitconfig,target=/home/vscode/.gitconfig,type=bind,readonly"
  ]
}
```

## Quick Reference

| Configuration | Purpose |
|--------------|---------|
| `image` | Pre-built container image |
| `build.dockerfile` | Custom Dockerfile path |
| `features` | Add tools without Dockerfile changes |
| `customizations.vscode.extensions` | Auto-install VS Code extensions |
| `customizations.vscode.settings` | Workspace settings |
| `forwardPorts` | Expose container ports |
| `containerEnv` | Set environment variables |
| `postCreateCommand` | Run after container creation |
| `postStartCommand` | Run on every container start |
| `remoteUser` | User to run as inside container |
| `mounts` | Additional volume mounts |
| `runArgs` | Extra Docker run arguments |

---

Dev Containers turn "works on my machine" into "works on every machine." Start simple with a base image and features, then add complexity as needed. Your team will spend time coding instead of debugging environment issues.

For monitoring your development and production environments, check out [OneUptime](https://oneuptime.com) - open-source observability for your entire stack.
