# How to Use Container Images with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Container Image, Kubernetes, Docker, PaaS

Description: Deploy pre-built container images directly to Kubernetes using Epinio without the buildpack pipeline.

## Introduction

How to Use Container Images with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on their application while the platform handles deployment, routing, and TLS automatically. When you already have a pre-built image, you can deploy it directly without running the buildpack pipeline.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- A container image accessible from your Kubernetes cluster

## Step 1: Prepare Your Application

```bash
# Use a pre-built container image that is accessible to your cluster
IMAGE_URL=splatform/sample-app
```

## Step 2: Create the Application

For this example, we'll deploy a pre-built web application image:

```bash
# Set the application name
APP_NAME=my-app
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Verify namespace is active
epinio namespace show my-apps
```

## Step 4: Deploy the Application

```bash
# Deploy the container image directly
epinio push \
  --name "${APP_NAME}" \
  --container-image-url "${IMAGE_URL}"

# Or specify options explicitly
# Replace the route with a hostname that resolves to your cluster ingress
epinio push \
  --name "${APP_NAME}" \
  --container-image-url "${IMAGE_URL}" \
  --instances 2 \
  --route my-app.epinio.example.com
```

During push, Epinio will:
1. Register the application in Epinio
2. Deploy the referenced container image to Kubernetes
3. Configure routing and TLS
4. Scale the workload to the requested number of instances

## Step 5: Verify the Deployment

```bash
# Check application status
epinio app show "${APP_NAME}"

# List all applications in namespace
epinio app list

# View the application route in the Routes section
epinio app show "${APP_NAME}"
```

## Step 6: Test the Application

```bash
# Get the application URL
APP_URL=$(epinio app show "${APP_NAME}" | grep -Eo 'https://[^[:space:]]+' | head -n 1)

# Test with curl
curl -k "${APP_URL}"

# Print the URL so you can open it in a browser
echo "${APP_URL}"
```

## Step 7: View Application Logs

```bash
# View recent logs
epinio app logs "${APP_NAME}"

# Follow live logs
epinio app logs --follow "${APP_NAME}"
```

## Step 8: Update the Application

```bash
# Publish a new image tag, update IMAGE_URL, and re-push
# Replace this with the updated image tag you published
IMAGE_URL=registry.example.com/my-app:v2
epinio push \
  --name "${APP_NAME}" \
  --container-image-url "${IMAGE_URL}"

# Epinio updates the running application
epinio app show "${APP_NAME}"
```

## Step 9: Configure Environment Variables

```bash
# Set environment variables
epinio app env set "${APP_NAME}" DATABASE_URL "postgres://user:pass@host:5432/db"
epinio app env set "${APP_NAME}" LOG_LEVEL "info"

# List environment variables
epinio app env list "${APP_NAME}"
```

## Step 10: Scale the Application

```bash
# Scale to more instances
epinio app update "${APP_NAME}" --instances 3

# Verify scaling
epinio app show "${APP_NAME}"
```

## Cleanup

```bash
# Delete the application
epinio app delete "${APP_NAME}"
```

## Conclusion

How to Use Container Images with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy a pre-built container image to Kubernetes without writing YAML or understanding container orchestration. With `--container-image-url`, Epinio skips buildpack staging while still handling routing, TLS, logs, scaling, and environment management.
