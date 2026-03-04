# How to Deploy a Docker Container to Azure App Service on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Docker, Containers, Linux, DevOps, Cloud Computing

Description: Complete walkthrough for deploying a Docker container to Azure App Service on Linux including image configuration, registry setup, and CI/CD.

---

Azure App Service on Linux supports running custom Docker containers, which gives you full control over your runtime environment. Instead of relying on the built-in runtime stacks, you package your application into a Docker image and deploy it. This is useful when you need specific system dependencies, a custom runtime version, or you just want consistency between your local development environment and production.

This post walks through the entire process: building your Docker image, pushing it to a registry, and deploying it to Azure App Service.

## Prerequisites

You need:

- Docker installed locally for building images
- An Azure subscription
- Azure CLI installed and logged in
- A container registry (we will use Azure Container Registry, but Docker Hub works too)

## Building Your Docker Image

Let us start with a simple Node.js application as an example. Here is a Dockerfile that packages it up:

```dockerfile
# Dockerfile - Multi-stage build for a Node.js application
# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Stage 2: Create the production image
FROM node:20-alpine

WORKDIR /app

# Copy only what we need from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ ./

# Azure App Service expects the container to listen on port 8080 by default
# You can change this with the WEBSITES_PORT app setting
EXPOSE 8080

# Set environment variable for the port
ENV PORT=8080

# Start the application
CMD ["node", "server.js"]
```

Build and test the image locally:

```bash
# Build the Docker image with a tag
docker build -t my-app:latest .

# Test it locally to make sure it works
docker run -p 8080:8080 my-app:latest

# Visit http://localhost:8080 to verify
```

## Setting Up Azure Container Registry

Azure Container Registry (ACR) is the most convenient registry to use with Azure App Service. Here is how to set it up:

```bash
# Create a resource group if you do not have one
az group create \
    --name my-resource-group \
    --location eastus

# Create an Azure Container Registry
# The name must be globally unique and alphanumeric only
az acr create \
    --resource-group my-resource-group \
    --name myappregistry \
    --sku Basic

# Enable the admin user (needed for App Service to pull images)
az acr update \
    --name myappregistry \
    --admin-enabled true

# Log in to the registry
az acr login --name myappregistry
```

Now push your image to ACR:

```bash
# Tag the image for your registry
docker tag my-app:latest myappregistry.azurecr.io/my-app:latest

# Push the image
docker push myappregistry.azurecr.io/my-app:latest

# Verify it is there
az acr repository list --name myappregistry --output table
```

## Creating the App Service

Now create an App Service that runs your container:

```bash
# Create an App Service plan (Linux)
# B1 is the minimum tier that supports containers well
az appservice plan create \
    --name my-app-plan \
    --resource-group my-resource-group \
    --is-linux \
    --sku B1

# Create the web app with your container image
az webapp create \
    --resource-group my-resource-group \
    --plan my-app-plan \
    --name my-container-app \
    --deployment-container-image-name myappregistry.azurecr.io/my-app:latest
```

## Configuring Registry Credentials

App Service needs credentials to pull your image from ACR. There are two approaches:

### Using Admin Credentials

```bash
# Get the ACR credentials
ACR_USERNAME=$(az acr credential show --name myappregistry --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name myappregistry --query "passwords[0].value" -o tsv)

# Configure the web app to use these credentials
az webapp config container set \
    --name my-container-app \
    --resource-group my-resource-group \
    --container-image-name myappregistry.azurecr.io/my-app:latest \
    --container-registry-url https://myappregistry.azurecr.io \
    --container-registry-user $ACR_USERNAME \
    --container-registry-password $ACR_PASSWORD
```

### Using Managed Identity (Recommended)

A more secure approach is to use a managed identity, which avoids storing credentials:

```bash
# Enable system-assigned managed identity on the web app
az webapp identity assign \
    --name my-container-app \
    --resource-group my-resource-group

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show --name my-container-app --resource-group my-resource-group --query principalId -o tsv)

# Get the ACR resource ID
ACR_ID=$(az acr show --name myappregistry --query id -o tsv)

# Grant the web app's identity AcrPull access to the registry
az role assignment create \
    --assignee $PRINCIPAL_ID \
    --scope $ACR_ID \
    --role AcrPull

# Configure the web app to use managed identity for ACR
az webapp config set \
    --name my-container-app \
    --resource-group my-resource-group \
    --generic-configurations '{"acrUseManagedIdentityCreds": true}'
```

## Configuring the Container

There are several App Service settings specific to container deployments.

### Port Configuration

By default, Azure App Service expects your container to listen on port 8080. If your app uses a different port, set the `WEBSITES_PORT` setting:

```bash
# Tell App Service your container listens on port 3000
az webapp config appsettings set \
    --name my-container-app \
    --resource-group my-resource-group \
    --settings WEBSITES_PORT=3000
```

### Startup Command

If you need to override the CMD from your Dockerfile:

```bash
# Set a custom startup command
az webapp config set \
    --name my-container-app \
    --resource-group my-resource-group \
    --startup-file "node server.js --production"
```

### Environment Variables

Pass environment variables to your container through App Settings:

```bash
# Set environment variables for your container
az webapp config appsettings set \
    --name my-container-app \
    --resource-group my-resource-group \
    --settings \
        NODE_ENV=production \
        DATABASE_URL="Server=mydb.database.windows.net;Database=mydb" \
        REDIS_HOST=myredis.redis.cache.windows.net
```

## Setting Up Continuous Deployment

You can configure App Service to automatically pull and deploy new images when they are pushed to the registry.

### Using ACR Webhooks

```bash
# Enable continuous deployment on the web app
az webapp deployment container config \
    --name my-container-app \
    --resource-group my-resource-group \
    --enable-cd true

# This returns a webhook URL - save it
# Then create an ACR webhook that posts to that URL
az acr webhook create \
    --name deploywebhook \
    --registry myappregistry \
    --uri "<webhook-url-from-above>" \
    --actions push \
    --scope my-app:latest
```

Now whenever you push a new `my-app:latest` image to ACR, App Service automatically pulls it and restarts.

## Viewing Container Logs

Docker container logs are available through the standard App Service logging:

```bash
# Enable container logging
az webapp log config \
    --name my-container-app \
    --resource-group my-resource-group \
    --docker-container-logging filesystem

# Stream logs in real time
az webapp log tail \
    --name my-container-app \
    --resource-group my-resource-group
```

The logs show both the container's stdout/stderr output and the Docker pull/start events, which is helpful for debugging startup issues.

## Troubleshooting Common Issues

### Container Fails to Start

Azure App Service waits for the container to respond to HTTP requests within a timeout period (230 seconds by default). If your container takes longer to start, increase the timeout:

```bash
# Increase the container start timeout to 600 seconds
az webapp config appsettings set \
    --name my-container-app \
    --resource-group my-resource-group \
    --settings WEBSITES_CONTAINER_START_TIME_LIMIT=600
```

### Image Pull Failures

Check that your registry credentials are correct and the image name includes the full registry URL. Look at the container logs for specific error messages.

### Port Mismatch

If your app is running but returning errors, verify that `WEBSITES_PORT` matches the port your application listens on inside the container.

## Summary

Deploying Docker containers to Azure App Service on Linux gives you the flexibility of custom containers with the convenience of a managed platform. You get automatic TLS, scaling, deployment slots, and all the other App Service features without managing the underlying infrastructure. Start with a simple Dockerfile, push to ACR, and let App Service handle the rest.
