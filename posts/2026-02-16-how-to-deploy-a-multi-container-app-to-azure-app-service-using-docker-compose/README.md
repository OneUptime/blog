# How to Deploy a Multi-Container App to Azure App Service Using Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Docker Compose, Multi-Container, Containers, DevOps, Cloud Computing

Description: How to deploy multi-container applications to Azure App Service on Linux using Docker Compose files for orchestrating multiple services together.

---

Sometimes a single container is not enough. Your application might need a web server, a background worker, and a cache all running together. While Azure Kubernetes Service handles complex container orchestration, Azure App Service supports Docker Compose for simpler multi-container deployments. It is a good middle ground when you need more than one container but do not want the complexity of Kubernetes.

This post covers how to deploy a multi-container application to Azure App Service using Docker Compose, including the limitations you should know about upfront.

## What Azure App Service Supports

Azure App Service on Linux supports a subset of Docker Compose features. Before you start, know the limitations:

**Supported:**
- Multiple container definitions
- Environment variables
- Port mapping (only port 80 and 8080 for the primary container)
- Volume mounts (Azure Storage)
- Container dependencies (depends_on)
- Image pull from registries

**Not Supported:**
- Build directives (you must use pre-built images)
- Networks (all containers share the same network)
- Volume mounts to local paths (only Azure Storage)
- Docker Compose v3 deploy section
- Healthcheck directives in compose file

## Prerequisites

You need:
- Docker installed locally for testing
- An Azure Container Registry (or Docker Hub account)
- An Azure App Service on Linux (Standard tier or above)
- Azure CLI installed

## Example Application

Let us set up a typical web application with:
- A Node.js API server (primary container)
- A Redis cache (secondary container)

First, here is the project structure:

```
my-app/
  api/
    Dockerfile
    server.js
    package.json
  docker-compose.yml
```

The API server Dockerfile:

```dockerfile
# api/Dockerfile - Node.js API server
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# The API listens on port 8080
EXPOSE 8080

CMD ["node", "server.js"]
```

The API server code that connects to Redis:

```javascript
// api/server.js - Express API that uses Redis for caching
const express = require('express');
const redis = require('redis');

const app = express();
const port = process.env.PORT || 8080;

// Connect to Redis - in Docker Compose, use the service name as hostname
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => {
    console.log('Redis connection error:', err.message);
});

redisClient.connect().then(() => {
    console.log('Connected to Redis');
});

app.get('/', async (req, res) => {
    // Simple example: increment a visit counter in Redis
    const visits = await redisClient.incr('visits');
    res.json({ message: 'Hello from multi-container app', visits });
});

app.get('/health', async (req, res) => {
    try {
        await redisClient.ping();
        res.json({ status: 'healthy', redis: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', redis: err.message });
    }
});

app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
});
```

## Writing the Docker Compose File

The Docker Compose file for Azure App Service has some specific requirements. The primary container (the one that receives HTTP traffic) must expose port 80 or 8080.

```yaml
# docker-compose.yml - Multi-container configuration for Azure App Service
version: '3'

services:
  # Primary container - receives HTTP traffic from App Service
  api:
    image: myregistry.azurecr.io/my-api:latest
    ports:
      - "8080:8080"
    environment:
      # Use the Redis service name as the hostname
      - REDIS_HOST=redis
      - NODE_ENV=production
    depends_on:
      - redis

  # Secondary container - Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Test it locally:

```bash
# Build and run locally to verify everything works
docker compose up --build

# Test the API
curl http://localhost:8080/
curl http://localhost:8080/health
```

## Pushing Images to Azure Container Registry

Build and push your custom images to ACR:

```bash
# Log in to ACR
az acr login --name myregistry

# Build and tag the API image
docker build -t myregistry.azurecr.io/my-api:latest ./api

# Push to ACR
docker push myregistry.azurecr.io/my-api:latest
```

For the Redis image, you do not need to push it since App Service can pull it directly from Docker Hub.

## Creating the App Service

```bash
# Create an App Service plan (Linux, Standard tier or above)
az appservice plan create \
    --name my-multi-app-plan \
    --resource-group my-resource-group \
    --is-linux \
    --sku S1

# Create the web app with multi-container configuration
az webapp create \
    --resource-group my-resource-group \
    --plan my-multi-app-plan \
    --name my-multi-container-app \
    --multicontainer-config-type compose \
    --multicontainer-config-file docker-compose.yml
```

## Configuring Registry Credentials

If your images are in ACR, configure the registry credentials:

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name myregistry --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name myregistry --query "passwords[0].value" -o tsv)

# Set registry credentials on the App Service
az webapp config container set \
    --name my-multi-container-app \
    --resource-group my-resource-group \
    --container-registry-url https://myregistry.azurecr.io \
    --container-registry-user $ACR_USERNAME \
    --container-registry-password $ACR_PASSWORD \
    --multicontainer-config-type compose \
    --multicontainer-config-file docker-compose.yml
```

## Adding Persistent Storage

By default, container data is ephemeral. If Redis needs to persist data across restarts, you need to mount Azure Storage:

```bash
# Create a storage account
az storage account create \
    --name mystorageaccount \
    --resource-group my-resource-group \
    --sku Standard_LRS

# Create a file share for Redis data
az storage share create \
    --name redis-data \
    --account-name mystorageaccount

# Get the storage account key
STORAGE_KEY=$(az storage account keys list --account-name mystorageaccount --query "[0].value" -o tsv)

# Mount the storage in the App Service
az webapp config storage-account add \
    --name my-multi-container-app \
    --resource-group my-resource-group \
    --custom-id redisdata \
    --storage-type AzureFiles \
    --share-name redis-data \
    --account-name mystorageaccount \
    --access-key $STORAGE_KEY \
    --mount-path /data
```

Then update your Docker Compose file to use the mount:

```yaml
# Updated docker-compose.yml with persistent storage
version: '3'

services:
  api:
    image: myregistry.azurecr.io/my-api:latest
    ports:
      - "8080:8080"
    environment:
      - REDIS_HOST=redis
      - NODE_ENV=production
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    # Use the Azure Files mount for Redis persistence
    volumes:
      - ${WEBAPP_STORAGE_HOME}/redis-data:/data
    command: redis-server --appendonly yes
```

## Updating the Deployment

When you update your images or compose file, redeploy:

```bash
# Update the compose configuration
az webapp config container set \
    --name my-multi-container-app \
    --resource-group my-resource-group \
    --multicontainer-config-type compose \
    --multicontainer-config-file docker-compose.yml

# Restart the app to pull new images
az webapp restart \
    --name my-multi-container-app \
    --resource-group my-resource-group
```

## Viewing Logs

Check the container logs to debug issues:

```bash
# Enable container logging
az webapp log config \
    --name my-multi-container-app \
    --resource-group my-resource-group \
    --docker-container-logging filesystem

# Stream logs from all containers
az webapp log tail \
    --name my-multi-container-app \
    --resource-group my-resource-group
```

The logs show output from all containers, prefixed with the container name, so you can tell which container is producing which output.

## Common Issues

### Primary Container Detection

Azure App Service expects the primary container (the one that handles HTTP requests) to be the first service defined in the compose file, or the one that exposes port 80/8080. If Azure picks the wrong container as the primary, you will get errors.

### Inter-Container Communication

All containers in the compose file share the same network namespace. They can communicate using `localhost` or the service name as the hostname. If your containers cannot talk to each other, check that you are using the correct hostnames and ports.

### Image Pull Failures

If one image fails to pull, the entire deployment fails. Check that all image names and registry credentials are correct.

### Startup Order

The `depends_on` directive controls startup order but does not wait for the dependency to be ready. Your application code needs to handle the case where a dependency is not yet available (retry logic).

## When to Use This vs. Other Options

Multi-container App Service is good for:
- Simple applications with 2-3 containers
- Sidecar patterns (main app + log forwarder, main app + cache)
- Quick prototyping

Consider these alternatives for more complex scenarios:
- **Azure Container Apps** - Better multi-container support with more Compose features
- **Azure Kubernetes Service** - Full container orchestration for complex microservices
- **Azure Container Instances** - Multi-container groups for batch and background workloads

## Summary

Docker Compose on Azure App Service lets you run multiple containers together without the overhead of a full orchestration platform. It works well for straightforward multi-container applications, but be aware of the limitations. Test your compose file locally first, use Azure Storage for persistence, and monitor the container logs to catch issues early.
