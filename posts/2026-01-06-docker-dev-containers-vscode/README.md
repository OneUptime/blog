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

```bash
# Verify Docker is running
docker version

# Install extension from command line
code --install-extension ms-vscode-remote.remote-containers
```

---

## Basic Dev Container Setup

### Minimal Configuration

Create `.devcontainer/devcontainer.json` in your project root:

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

```dockerfile
# .devcontainer/Dockerfile
FROM node:22-bookworm

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g typescript ts-node nodemon

# Create non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME

USER $USERNAME
```

### Using Docker Compose

For projects with databases or multiple services:

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

```yaml
# .devcontainer/docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/dev

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dev
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## VS Code Extensions

### Installing Extensions in Container

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

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        // These install automatically
        "dbaeumer.vscode-eslint",
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

```bash
#!/bin/bash
# install.sh
cd ~/dotfiles

# Symlink dotfiles
ln -sf ~/dotfiles/.bashrc ~/.bashrc
ln -sf ~/dotfiles/.zshrc ~/.zshrc
ln -sf ~/dotfiles/.gitconfig ~/.gitconfig
ln -sf ~/dotfiles/.vimrc ~/.vimrc

# Install starship prompt
mkdir -p ~/.config
ln -sf ~/dotfiles/.config/starship.toml ~/.config/starship.toml
```

---

## Complete Configuration Examples

### Node.js/TypeScript Project

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

```yaml
# .devcontainer/docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ..:/workspace:cached
      - node_modules:/workspace/node_modules
    command: sleep infinity
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dev
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

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

```json
{
  "features": {
    // GitHub CLI
    "ghcr.io/devcontainers/features/github-cli:1": {},

    // Docker-in-Docker
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},

    // AWS CLI
    "ghcr.io/devcontainers/features/aws-cli:1": {},

    // Kubectl + Helm
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {
      "minikube": "none"
    },

    // Common utilities
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

```json
{
  // Run once when container is created
  "postCreateCommand": "npm install && npx prisma generate",

  // Run every time container starts
  "postStartCommand": "git fetch --all",

  // Run every time VS Code attaches
  "postAttachCommand": "npm run dev",

  // Initialize command (runs before postCreateCommand)
  "initializeCommand": "echo 'Building dev container...'"
}
```

### Multi-Command Scripts

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

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ..:/workspace:cached
      - node_modules:/workspace/node_modules  # Named volume for deps

volumes:
  node_modules:
```

### 2. Use Non-Root User

```json
{
  "remoteUser": "node",  // or "vscode" for base images
  "containerUser": "node"
}
```

### 3. Git Configuration

```json
{
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}"
}
```

### 4. Environment Variables

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

```json
{
  "mounts": [
    "source=${localEnv:HOME}/.ssh,target=/home/node/.ssh,type=bind,readonly"
  ]
}
```

---

## Quick Reference

```bash
# Rebuild container
# Command Palette (Cmd/Ctrl+Shift+P) > "Dev Containers: Rebuild Container"

# Rebuild without cache
# Command Palette > "Dev Containers: Rebuild Container Without Cache"

# Open folder in container
# Command Palette > "Dev Containers: Open Folder in Container"

# Clone repository in container
# Command Palette > "Dev Containers: Clone Repository in Container Volume"

# View container logs
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
