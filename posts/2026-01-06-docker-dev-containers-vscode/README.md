# How to Use Docker Dev Containers in VS Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Development, VS Code

Description: Configure .devcontainer.json, sync extensions and dotfiles, and create team-wide reproducible development environments in VS Code.

"Works on my machine" is a symptom of environmental drift. Dev Containers solve this by defining your entire development environment as code. Every team member gets identical tooling, extensions, and runtime - no more setup documentation that's always out of date.

---

## What Are Dev Containers?

Dev Containers run your development environment inside a Docker container while VS Code connects to it remotely. Your source code is mounted into the container, and VS Code Server runs inside it.

Benefits:
- **Consistency** - Same environment on every machine
- **Isolation** - Project dependencies don't conflict
- **Reproducibility** - New team members are productive in minutes
- **Disposability** - Broken environment? Rebuild it

---

## Prerequisites

1. **Docker Desktop** (or Docker Engine on Linux)
2. **VS Code** with the **Dev Containers extension** (ms-vscode-remote.remote-containers)

These commands verify Docker is working and install the required VS Code extension:

```bash
# Verify Docker is running - should display client and server versions
docker version

# Install the Dev Containers extension from the command line
# Alternatively, install from the VS Code Extensions marketplace
code --install-extension ms-vscode-remote.remote-containers
```

---

## Basic Dev Container Setup

### Minimal Configuration

Create `.devcontainer/devcontainer.json` in your project root:

This minimal configuration uses a pre-built Microsoft dev container image with Node.js and TypeScript already installed:

```json
{
  "name": "My Project",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",
  "forwardPorts": [3000],
  "postCreateCommand": "npm install"
}
```

Open the project in VS Code and click "Reopen in Container" when prompted.

### Using a Dockerfile

For custom environments, use a Dockerfile to define exactly what tools and dependencies you need:

```json
// .devcontainer/devcontainer.json
{
  "name": "Custom Dev Container",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "forwardPorts": [3000, 5432],
  "postCreateCommand": "npm install"
}
```

This Dockerfile creates a custom development environment with additional tools beyond the base Node.js installation:

```dockerfile
# .devcontainer/Dockerfile
FROM node:22-bookworm

# Install additional tools needed for development
# Clean up apt cache to reduce image size
RUN apt-get update && apt-get install -y \
    git \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages for TypeScript development
RUN npm install -g typescript ts-node nodemon

# Create non-root user for better security
# Using build args allows customization without modifying Dockerfile
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
# Create group and user with specified IDs to match host permissions
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME

# Switch to non-root user for subsequent operations
USER $USERNAME
```

### Using Docker Compose

For projects with databases or multiple services:

This configuration connects your dev container to a full application stack including databases:

```json
// .devcontainer/devcontainer.json
{
  "name": "Full Stack Dev",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "forwardPorts": [3000, 5432],
  "postCreateCommand": "npm install"
}
```

The Docker Compose file defines all services your development environment needs:

```yaml
# .devcontainer/docker-compose.yml
services:
  # Main development container where VS Code connects
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      # Mount source code with caching for better performance on macOS/Windows
      - ..:/workspace:cached
    # Keep container running indefinitely for VS Code to connect
    command: sleep infinity
    environment:
      # Connection string for the database service
      - DATABASE_URL=postgres://postgres:password@db:5432/dev

  # PostgreSQL database for local development
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dev
    volumes:
      # Persist database data across container restarts
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## VS Code Extensions

### Installing Extensions in Container

This configuration automatically installs recommended extensions when the container opens:

```json
{
  "name": "Node.js Dev",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-azuretools.vscode-docker",
        "bradlc.vscode-tailwindcss",
        "prisma.prisma"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "typescript.preferences.importModuleSpecifier": "relative"
      }
    }
  }
}
```

### Required vs Recommended Extensions

Extensions listed in the customizations array install automatically when the container opens, ensuring everyone has the same development tools:

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        // These install automatically when container opens
        // ESLint for code linting
        "dbaeumer.vscode-eslint",
        // Prettier for code formatting
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

Extensions in this array install automatically when the container opens.

---

## Dotfiles Sync

Sync your personal dotfiles (shell config, git config, vim settings) into dev containers.

### Configure in VS Code Settings

Add these settings to your VS Code user settings to automatically clone and install your dotfiles in every dev container:

```json
// User settings.json
{
  "dotfiles.repository": "https://github.com/yourusername/dotfiles",
  "dotfiles.targetPath": "~/dotfiles",
  "dotfiles.installCommand": "~/dotfiles/install.sh"
}
```

### Dotfiles Repository Structure

```
dotfiles/
├── .bashrc
├── .zshrc
├── .gitconfig
├── .vimrc
├── install.sh
└── .config/
    └── starship.toml
```

This installation script creates symbolic links from your dotfiles repository to the home directory:

```bash
#!/bin/bash
# install.sh
# Navigate to dotfiles directory
cd ~/dotfiles

# Symlink dotfiles to home directory
# -sf forces overwrite of existing files
ln -sf ~/dotfiles/.bashrc ~/.bashrc
ln -sf ~/dotfiles/.zshrc ~/.zshrc
ln -sf ~/dotfiles/.gitconfig ~/.gitconfig
ln -sf ~/dotfiles/.vimrc ~/.vimrc

# Install starship prompt configuration
# Create .config directory if it doesn't exist
mkdir -p ~/.config
ln -sf ~/dotfiles/.config/starship.toml ~/.config/starship.toml
```

---

## Complete Configuration Examples

### Node.js/TypeScript Project

A comprehensive dev container configuration for Node.js/TypeScript projects with all common extensions and settings:

```json
// .devcontainer/devcontainer.json
{
  "name": "Node.js TypeScript",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",

  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },

  "forwardPorts": [3000],

  "postCreateCommand": "npm install",
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "Prisma.prisma",
        "mikestead.dotenv"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        },
        "typescript.preferences.importModuleSpecifier": "relative",
        "files.eol": "\n"
      }
    }
  },

  "remoteUser": "node"
}
```

### Python Project

A complete Python development environment with linting, formatting, and type checking configured:

```json
// .devcontainer/devcontainer.json
{
  "name": "Python Dev",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",

  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  "forwardPorts": [8000],

  "postCreateCommand": "pip install -r requirements.txt && pip install -r requirements-dev.txt",

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-python.black-formatter",
        "charliermarsh.ruff",
        "tamasfe.even-better-toml"
      ],
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "python.formatting.provider": "black",
        "editor.formatOnSave": true,
        "[python]": {
          "editor.defaultFormatter": "ms-python.black-formatter"
        }
      }
    }
  },

  "remoteUser": "vscode"
}
```

### Go Project

A Go development environment with gopls language server and golangci-lint configured:

```json
// .devcontainer/devcontainer.json
{
  "name": "Go Dev",
  "image": "mcr.microsoft.com/devcontainers/go:1.22",

  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },

  "forwardPorts": [8080],

  "postCreateCommand": "go mod download",

  "customizations": {
    "vscode": {
      "extensions": [
        "golang.go",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "go.useLanguageServer": true,
        "go.lintTool": "golangci-lint",
        "go.lintOnSave": "package",
        "editor.formatOnSave": true,
        "[go]": {
          "editor.defaultFormatter": "golang.go"
        }
      }
    }
  },

  "remoteUser": "vscode"
}
```

### Full-Stack with Docker Compose

A complete full-stack development environment with application, database, and caching services:

```json
// .devcontainer/devcontainer.json
{
  "name": "Full Stack App",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",

  "forwardPorts": [3000, 5432, 6379],

  "postCreateCommand": "npm install && npx prisma generate",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "Prisma.prisma",
        "ms-azuretools.vscode-docker",
        "cweijan.vscode-postgresql-client2"
      ]
    }
  },

  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },

  "remoteUser": "node"
}
```

The Docker Compose file for a full-stack development setup with database and Redis:

```yaml
# .devcontainer/docker-compose.yml
services:
  # Main development container
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      # Mount source code with caching for performance
      - ..:/workspace:cached
      # Named volume for node_modules prevents overwriting by the bind mount
      - node_modules:/workspace/node_modules
    # Keep container running for VS Code connection
    command: sleep infinity
    environment:
      # Database connection string using service name
      - DATABASE_URL=postgres://postgres:password@db:5432/dev
      # Redis connection string using service name
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # PostgreSQL database service
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dev
    volumes:
      # Persist database data
      - postgres-data:/var/lib/postgresql/data
    ports:
      # Expose for external database tools
      - "5432:5432"

  # Redis caching service
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres-data:
  node_modules:
```

---

## Dev Container Features

Features are reusable units of dev container configuration:

Dev Container Features are pre-packaged tools and configurations that can be easily added to any dev container:

```json
{
  "features": {
    // GitHub CLI for repository operations
    "ghcr.io/devcontainers/features/github-cli:1": {},

    // Docker-in-Docker for building and running containers
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},

    // AWS CLI for cloud operations
    "ghcr.io/devcontainers/features/aws-cli:1": {},

    // Kubectl and Helm for Kubernetes development
    // minikube set to "none" to skip installation
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {
      "minikube": "none"
    },

    // Common utilities including zsh and oh-my-zsh
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "installOhMyZsh": true
    }
  }
}
```

Browse features at: https://containers.dev/features

---

## Lifecycle Scripts

Lifecycle scripts run at different stages of the container lifecycle, allowing you to automate setup and configuration:

```json
{
  // Run once when container is created (after build)
  "postCreateCommand": "npm install && npx prisma generate",

  // Run every time container starts (including restarts)
  "postStartCommand": "git fetch --all",

  // Run every time VS Code attaches to the container
  "postAttachCommand": "npm run dev",

  // Initialize command (runs before postCreateCommand, on host machine)
  "initializeCommand": "echo 'Building dev container...'"
}
```

### Multi-Command Scripts

For complex initialization, you can define multiple named commands that run in parallel:

```json
{
  "postCreateCommand": {
    "install": "npm install",
    "db": "npx prisma migrate dev",
    "seed": "npx prisma db seed"
  }
}
```

---

## Tips and Best Practices

### 1. Cache Dependencies

Using named volumes for dependencies prevents them from being overwritten by the bind mount and improves performance:

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      # Source code mount with caching
      - ..:/workspace:cached
      # Named volume for deps - persists across rebuilds
      - node_modules:/workspace/node_modules

volumes:
  node_modules:
```

### 2. Use Non-Root User

Running as a non-root user improves security and avoids file permission issues:

```json
{
  "remoteUser": "node",
  "containerUser": "node"
}
```

### 3. Git Configuration

Adding the workspace to Git's safe directories prevents permission warnings:

```json
{
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}"
}
```

### 4. Environment Variables

You can set environment variables at both container and remote session levels:

```json
{
  "containerEnv": {
    "NODE_ENV": "development",
    "DEBUG": "*"
  },
  "remoteEnv": {
    "LOCAL_WORKSPACE_FOLDER": "${localWorkspaceFolder}"
  }
}
```

### 5. Mount SSH Keys

Mount your SSH keys to enable Git operations over SSH inside the container:

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.ssh,target=/home/node/.ssh,type=bind,readonly"
  ]
}
```

---

## Quick Reference

Common VS Code Dev Container commands:

```bash
# Rebuild container
# Command Palette (Cmd/Ctrl+Shift+P) > "Dev Containers: Rebuild Container"

# Rebuild without cache (useful when base image has updates)
# Command Palette > "Dev Containers: Rebuild Container Without Cache"

# Open folder in container
# Command Palette > "Dev Containers: Open Folder in Container"

# Clone repository in container (creates isolated volume)
# Command Palette > "Dev Containers: Clone Repository in Container Volume"

# View container logs (helpful for debugging)
# Command Palette > "Dev Containers: Show Container Log"
```

---

## Summary

- Dev Containers eliminate "works on my machine" by defining environments as code
- Use `.devcontainer/devcontainer.json` for configuration
- Docker Compose integrates databases and services
- Extensions and settings sync automatically to every developer
- Features provide reusable environment components
- Lifecycle scripts automate setup tasks
- Dotfiles sync maintains personal preferences

Invest time in your dev container configuration once, and every team member benefits forever.
