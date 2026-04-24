# How to Use Portainer with VS Code Dev Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, VS Code, Dev Container, Development Environment, Docker, Remote Development

Description: Learn how to use VS Code Dev Containers alongside Portainer for a seamless development experience where VS Code runs inside Docker containers managed by Portainer.

---

VS Code Dev Containers allow you to develop entirely inside a Docker container while using VS Code on your host. Portainer provides visibility and management for these containers alongside your other Docker workloads.

## How Dev Containers and Portainer Interact

VS Code Dev Containers use Docker in your development environment. When VS Code attaches to a dev container, that container appears in Portainer like any other container. You can:

- View dev container logs in Portainer
- Monitor resource usage
- Restart the container if it becomes unresponsive
- Inspect environment variables

## Setting Up a Dev Container

Create `.devcontainer/devcontainer.json` in your project:

```jsonc
{
  "name": "My Development Environment",
  "image": "mcr.microsoft.com/devcontainers/python:3.12-bookworm",

  // VS Code extensions to install in the container
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-python.black-formatter"
      ]
    }
  },

  // Port forwarding from container to host
  "forwardPorts": [8000, 5432],

  // Run after container creation
  "postCreateCommand": "pip install -r requirements.txt",

  // Run as non-root user
  "remoteUser": "vscode"
}
```

## Using Docker Compose with Dev Containers

Dev Containers support Compose for multi-container development:

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "Django Dev",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",

  // Shutdown action when VS Code closes
  "shutdownAction": "stopCompose"
}
```

```yaml
# .devcontainer/docker-compose.yml

services:
  app:
    image: mcr.microsoft.com/devcontainers/python:3.12
    volumes:
      - ..:/workspace:cached
    command: sleep infinity    # Keep container running

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpassword
```

## Viewing Dev Containers in Portainer

After VS Code attaches, the dev container appears in Portainer:

1. Go to **Containers** in Portainer.
2. Look for containers created for your project, often with names like `vsc-<project-name>-<hash>`.
3. View logs, exec commands, or inspect environment variables.

## Fixing Dev Container Issues via Portainer

If VS Code loses connection to the dev container:

```bash
# In Portainer: find the stuck dev container
# Go to Containers > vsc-myproject-xxxx > Restart

# Or via CLI:
docker restart vsc-myproject-xxxx
```

Then reconnect from VS Code: **Command Palette > Dev Containers: Reopen in Container**.
