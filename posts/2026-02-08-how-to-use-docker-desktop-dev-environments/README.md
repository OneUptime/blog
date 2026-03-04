# How to Use Docker Desktop Dev Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Desktop, Dev Environments, Development, Containers, DevOps

Description: Learn how to use Docker Desktop Dev Environments to create reproducible, shareable development setups for your team.

---

Starting on a new project usually means spending half a day installing dependencies, configuring databases, and fighting with version mismatches. Docker Desktop Dev Environments change this by packaging your entire development setup into a container-based workspace that any team member can launch in minutes.

Dev Environments let you define your project's development dependencies in a configuration file, spin up a containerized workspace, and share it with teammates through a Git URL. Everyone gets the same tools, the same versions, and the same configuration. No more "works on my machine" problems.

## What Are Dev Environments?

Dev Environments are a Docker Desktop feature that creates containerized development workspaces. Instead of installing Node.js, Python, or Go directly on your host machine, you define your development requirements in a `compose-dev.yaml` file. Docker Desktop then builds a workspace container with everything pre-configured.

The workspace integrates with your local IDE (VS Code or JetBrains) so you edit files locally while running code inside the container. Volumes keep your source code synced between the host and container.

## Prerequisites

You need Docker Desktop 4.12 or later installed. Dev Environments also require Git to be available on your system. Open Docker Desktop and verify you can see the "Dev Environments" section in the left sidebar.

## Creating Your First Dev Environment

The quickest way to get started is from an existing Git repository.

Open Docker Desktop, navigate to Dev Environments, and click "Create." You can enter a Git repository URL or select a local directory. Docker Desktop clones the repository and looks for a `compose-dev.yaml` file to configure the workspace.

For a simple Node.js project, create this configuration file in your project root.

```yaml
# compose-dev.yaml - Development environment configuration
services:
  app:
    # Use a pre-built development image with Node.js
    image: node:20
    # Mount the project directory into the container
    volumes:
      - .:/workspace
    working_dir: /workspace
    # Keep the container running so you can connect your IDE
    command: sleep infinity
    # Expose the development server port
    ports:
      - "3000:3000"
```

This minimal configuration gives you a Node.js 20 workspace with your project files mounted at `/workspace`.

## Configuring Multi-Service Dev Environments

Real projects need more than just a runtime. You need databases, caches, message queues. Define all of them in your `compose-dev.yaml`.

```yaml
# compose-dev.yaml - Full-stack development environment
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/workspace
    working_dir: /workspace
    command: sleep infinity
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugger port
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/myapp
      REDIS_URL: redis://cache:6379
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: myapp
    volumes:
      # Persist database data between restarts
      - pgdata:/var/lib/postgresql/data
      # Run initialization scripts on first start
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

## Creating a Custom Dev Container Image

For a more tailored experience, build a custom development image with all your tools pre-installed.

```dockerfile
# Dockerfile.dev - Custom development environment image
FROM node:20

# Install common development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    vim \
    less \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install global Node.js development tools
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    eslint \
    prettier

# Create a non-root user for development
RUN useradd -m -s /bin/bash developer
USER developer

WORKDIR /workspace
```

Reference this Dockerfile in your `compose-dev.yaml`.

```yaml
# compose-dev.yaml - Using a custom dev image
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    user: developer
    volumes:
      - .:/workspace
    working_dir: /workspace
    command: sleep infinity
    ports:
      - "3000:3000"
```

## Connecting VS Code to Dev Environments

Docker Desktop integrates directly with VS Code through the Dev Containers extension.

```bash
# Install the Dev Containers extension in VS Code
code --install-extension ms-vscode-remote.remote-containers
```

After launching your Dev Environment from Docker Desktop, click "Open in VS Code" next to the running environment. VS Code connects to the container and opens the workspace. All your extensions, terminal sessions, and debugging tools run inside the container.

You can also configure VS Code settings for the dev container by adding a `.devcontainer` folder.

```json
// .devcontainer/devcontainer.json - VS Code container settings
{
  "name": "My Project Dev Environment",
  "dockerComposeFile": "../compose-dev.yaml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-next"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  },
  "forwardPorts": [3000, 5432],
  "postCreateCommand": "npm install"
}
```

## Sharing Dev Environments

One of the strongest features is sharing. Any team member can launch the same environment from a Git URL.

In Docker Desktop, go to Dev Environments, click "Create," and paste the repository URL. Docker Desktop clones the repo, reads the `compose-dev.yaml`, and builds the workspace. Everyone gets an identical setup.

For private repositories, make sure your Git credentials are configured in Docker Desktop under Settings > General > "Use Docker Compose V2."

## Running Services and Commands

Once your Dev Environment is running, interact with it through the Docker Desktop terminal or your connected IDE terminal.

```bash
# Open a shell in the running dev container
docker exec -it <container-name> bash

# Install project dependencies
npm install

# Start the development server with hot reload
npm run dev

# Run database migrations
npx prisma migrate dev

# Run tests
npm test
```

## Lifecycle Management

Manage your Dev Environments through Docker Desktop or the command line.

```bash
# List running Dev Environments
docker compose -f compose-dev.yaml ps

# Stop the environment (preserves state)
docker compose -f compose-dev.yaml stop

# Start a stopped environment
docker compose -f compose-dev.yaml start

# Destroy the environment and all its data
docker compose -f compose-dev.yaml down -v

# Rebuild after changing the Dockerfile
docker compose -f compose-dev.yaml up -d --build
```

## Environment Variables and Secrets

Handle sensitive configuration with `.env` files that are excluded from version control.

```bash
# .env.example - Template for required environment variables (committed to Git)
DATABASE_URL=postgres://dev:dev@db:5432/myapp
API_KEY=your-api-key-here
SECRET_TOKEN=your-secret-here
```

```yaml
# compose-dev.yaml - Loading environment from file
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    env_file:
      - .env
    volumes:
      - .:/workspace
    working_dir: /workspace
    command: sleep infinity
```

```bash
# Copy the template and fill in your values
cp .env.example .env
# Edit .env with your actual values (this file is gitignored)
```

## Troubleshooting Common Issues

If file syncing feels slow on macOS, switch to VirtioFS in Docker Desktop Settings under "General" > "Choose file sharing implementation." This significantly improves volume mount performance.

If ports conflict with services running on your host, change the host port mapping in `compose-dev.yaml`. For example, change `"5432:5432"` to `"5433:5432"` if you already have PostgreSQL running locally.

If the container runs out of memory during builds, increase Docker Desktop's memory allocation under Settings > Resources.

Docker Desktop Dev Environments remove the friction from onboarding and daily development. Define your setup once in `compose-dev.yaml`, commit it to your repository, and every developer on your team gets a working environment in minutes instead of hours.
