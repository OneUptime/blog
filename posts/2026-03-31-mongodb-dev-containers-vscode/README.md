# How to Use Dev Containers with MongoDB for VS Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Dev Container, VSCode, Docker, Development

Description: Configure a VS Code Dev Container with MongoDB and the MongoDB VS Code extension for a fully reproducible, one-click development environment.

---

## Overview

Dev Containers let you define your entire development environment - including MongoDB - as code in a `.devcontainer` directory. Any developer with VS Code and Docker Desktop can open the project and get a working MongoDB environment without installing anything manually.

## Directory Structure

```text
.devcontainer/
  devcontainer.json
  docker-compose.yml
mongo-init/
  01-seed.js
src/
  ...
```

## devcontainer.json

```json
{
  "name": "MongoDB App",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "extensions": [
        "mongodb.mongodb-vscode",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "mdb.connectionSaving.defaultConnectionSavingLocation": "Workspace",
        "editor.formatOnSave": true
      }
    }
  },
  "forwardPorts": [3000, 27017, 8081],
  "postCreateCommand": "npm install",
  "remoteUser": "node"
}
```

## docker-compose.yml for Dev Container

```yaml
version: "3.8"
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
      - node_modules:/workspace/node_modules
    command: sleep infinity
    environment:
      MONGODB_URI: mongodb://admin:devpass@mongo:27017/myapp?authSource=admin
    depends_on:
      mongo:
        condition: service_healthy

  mongo:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: devpass
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongo_data:/data/db
      - ../mongo-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  mongo-express:
    image: mongo-express:1.0
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://admin:devpass@mongo:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: password
    ports:
      - "8081:8081"
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongo_data:
  node_modules:
```

## Dockerfile for App Container

```dockerfile
FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install mongosh for debugging
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor && \
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
    | tee /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt-get update && apt-get install -y mongodb-mongosh && \
    rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /workspace
```

## Using the MongoDB VS Code Extension

After the container starts, connect to MongoDB through the extension:

1. Open the MongoDB extension sidebar (click the MongoDB leaf icon).
2. Click **Add Connection** and enter the connection string:

```text
mongodb://admin:devpass@mongo:27017/?authSource=admin
```

3. The connection is saved to the workspace automatically because `mdb.connectionSaving.defaultConnectionSavingLocation` is set to `"Workspace"` in `devcontainer.json`.

## Summary

Dev Containers with MongoDB give every developer a reproducible environment where MongoDB, the application, and a web UI start together with a single "Reopen in Container" command. The MongoDB VS Code extension connects automatically, letting you browse collections and run queries directly from the editor alongside your code.
