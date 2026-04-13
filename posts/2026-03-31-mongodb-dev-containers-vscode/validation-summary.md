# Validation Summary: How to Use Dev Containers with MongoDB for VS Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- VS Code Dev Containers (devcontainer.json specification)
- Docker Compose
- MongoDB 7.0 (official Docker image)
- mongosh (MongoDB Shell)
- mongo-express 1.0 (web-based MongoDB admin UI)
- MongoDB VS Code Extension (mongodb.mongodb-vscode)
- Node.js 20 (Debian Bookworm base image)

## Sources Consulted
- Dev Container specification (https://containers.dev/implementors/json_reference/)
- Official MongoDB Docker image documentation (https://hub.docker.com/_/mongo)
- Official mongo-express Docker image documentation (https://hub.docker.com/_/mongo-express)
- MongoDB apt repository setup for Debian (https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-debian/)
- MongoDB VS Code Extension documentation (https://www.mongodb.com/docs/mongodb-vscode/)
- Docker Compose specification (https://docs.docker.com/compose/compose-file/)

## Issues Found

### 1. `mdb.connections` is not an official VS Code setting
**What was wrong:** The post showed a `.vscode/settings.json` snippet with a `mdb.connections` array to pre-configure a MongoDB connection. The MongoDB VS Code extension does not read connection definitions from VS Code settings.json — it stores connections internally using its own state management. This configuration would not actually create a connection.

**What was changed:** Replaced the `.vscode/settings.json` code block with step-by-step instructions for connecting through the extension's UI (sidebar > Add Connection > paste connection string). The `mdb.connectionSaving.defaultConnectionSavingLocation` setting in devcontainer.json is correct and ensures the connection is saved to the workspace.

### 2. Wrong hostname in VS Code extension connection string
**What was wrong:** The connection string in the VS Code settings used `localhost:27017`. Since the MongoDB VS Code extension runs inside the dev container (not on the host), it should use the Docker Compose service hostname `mongo` to reach the MongoDB container. `localhost` inside the app container does not route to the mongo service.

**What was changed:** Updated the connection string to use `mongo:27017` instead of `localhost:27017`.

## Review Notes
- The `version: "3.8"` field in docker-compose.yml is obsolete in Docker Compose V2 (the Go rewrite) — the version field is ignored entirely. It still works without errors but may produce a deprecation warning. Not changed since it is functional and widely seen in existing tutorials.
- Port 8081 in `forwardPorts` is technically redundant since mongo-express already maps it via `ports: ["8081:8081"]` in docker-compose.yml. The redundancy is harmless and arguably improves clarity, so it was left as-is.
- The `depends_on` with `condition: service_healthy` syntax was removed in Compose file format 3.x but was re-added in Docker Compose V2. Since Compose V2 ignores the version field, this works correctly in practice.
- All Dockerfile steps for installing mongosh on Debian Bookworm are correct and follow current MongoDB documentation.
