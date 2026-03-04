# How to Set Up a Lightsail Container Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, Containers, Docker

Description: Deploy containerized applications on Amazon Lightsail Container Service with step-by-step instructions for building, pushing, and managing Docker containers.

---

Lightsail Container Service lets you run Docker containers without managing servers, and without the complexity of ECS or EKS. You push your container image, define how it should run, and Lightsail handles load balancing, SSL, and scaling. It's the simplest way to run containers on AWS.

## How It Works

Lightsail Container Service gives you:
- A managed container runtime (no EC2 instances to maintain)
- Built-in HTTPS endpoint with a Lightsail-managed certificate
- Load balancing across multiple container nodes
- Container image registry (push images directly to Lightsail)
- Simple scaling by changing the number of nodes or their power

## Step 1: Create a Container Service

Choose the power level and number of nodes. Power levels determine CPU and RAM per node.

```bash
# Create a container service with the nano power level and 1 node
aws lightsail create-container-service \
  --service-name my-app-service \
  --power nano \
  --scale 1 \
  --tags key=Environment,value=production
```

Available power levels:

| Power  | vCPU | RAM    | Monthly Price (per node) |
|--------|------|--------|-------------------------|
| nano   | 0.25 | 512MB  | $7                      |
| micro  | 0.5  | 1GB    | $10                     |
| small  | 1    | 2GB    | $25                     |
| medium | 2    | 4GB    | $50                     |
| large  | 4    | 8GB    | $100                    |
| xlarge | 8    | 16GB   | $200                    |

Check the service status.

```bash
# Wait for the service to become ready
aws lightsail get-container-services \
  --service-name my-app-service \
  --query 'containerServices[0].{State: state, URL: url, Power: power, Scale: scale}'
```

## Step 2: Prepare Your Docker Image

Build a Docker image for your application. Here's a simple Node.js example.

Create the application file.

```javascript
// app.js - Simple Express web server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 80;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Lightsail Containers!',
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

And the Dockerfile.

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY app.js .

# Expose the port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser

CMD ["node", "app.js"]
```

Build the image.

```bash
# Build the Docker image
docker build -t my-app:latest .

# Test it locally
docker run -p 8080:80 my-app:latest
# Visit http://localhost:8080 to verify
```

## Step 3: Push the Image to Lightsail

Lightsail has its own container image registry. Push your image directly to it.

```bash
# Push the local Docker image to Lightsail
aws lightsail push-container-image \
  --service-name my-app-service \
  --label my-app \
  --image my-app:latest
```

The command outputs the image name you'll use in the deployment, something like `:my-app-service.my-app.1`.

## Step 4: Create a Deployment

A deployment tells Lightsail which container to run and how to expose it.

```bash
# Create a deployment configuration
aws lightsail create-container-service-deployment \
  --service-name my-app-service \
  --containers '{
    "my-app": {
      "image": ":my-app-service.my-app.1",
      "ports": {
        "80": "HTTP"
      },
      "environment": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }' \
  --public-endpoint '{
    "containerName": "my-app",
    "containerPort": 80,
    "healthCheck": {
      "path": "/health",
      "intervalSeconds": 30,
      "timeoutSeconds": 5,
      "healthyThreshold": 2,
      "unhealthyThreshold": 3
    }
  }'
```

The `public-endpoint` configuration sets up HTTPS automatically. Lightsail provisions a certificate and configures the load balancer.

## Step 5: Verify the Deployment

Check the deployment status and get the public URL.

```bash
# Check deployment status
aws lightsail get-container-service-deployments \
  --service-name my-app-service \
  --query 'deployments[0].{State: state, Version: version, CreatedAt: createdAt}'

# Get the public URL
aws lightsail get-container-services \
  --service-name my-app-service \
  --query 'containerServices[0].url' \
  --output text
```

The URL will be something like `https://my-app-service.abc123.us-east-1.cs.amazonlightsail.com`. Test it.

```bash
# Test the deployment
URL=$(aws lightsail get-container-services \
  --service-name my-app-service \
  --query 'containerServices[0].url' --output text)

curl -s "https://$URL" | python3 -m json.tool
```

## Step 6: Use a Custom Domain

To use your own domain instead of the Lightsail URL, you need to set up a custom domain and SSL certificate.

```bash
# Create an SSL certificate for your custom domain
aws lightsail create-certificate \
  --certificate-name my-app-cert \
  --domain-name app.example.com

# Get the validation records
aws lightsail get-certificates \
  --certificate-name my-app-cert \
  --query 'certificates[0].domainValidationRecords'
```

Add the CNAME validation records to your DNS, then attach the certificate.

```bash
# Update the container service with the custom domain
aws lightsail update-container-service \
  --service-name my-app-service \
  --public-domain-names '{
    "my-app-cert": ["app.example.com"]
  }'
```

Finally, create a CNAME record in your DNS pointing `app.example.com` to the Lightsail container service URL.

## Scaling Your Service

Scale up by increasing nodes or power level.

```bash
# Scale to 3 nodes for high availability
aws lightsail update-container-service \
  --service-name my-app-service \
  --scale 3

# Upgrade to a more powerful node type
aws lightsail update-container-service \
  --service-name my-app-service \
  --power small
```

## Multi-Container Deployments

You can run multiple containers in a single deployment. Here's an example with an app container and a Redis sidecar.

```bash
# Deploy with multiple containers
aws lightsail create-container-service-deployment \
  --service-name my-app-service \
  --containers '{
    "app": {
      "image": ":my-app-service.my-app.1",
      "ports": {"80": "HTTP"},
      "environment": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    },
    "redis": {
      "image": "redis:7-alpine",
      "ports": {"6379": "TCP"}
    }
  }' \
  --public-endpoint '{
    "containerName": "app",
    "containerPort": 80,
    "healthCheck": {"path": "/health"}
  }'
```

Containers in the same deployment can communicate via `localhost`.

## Viewing Logs

Access container logs for debugging.

```bash
# Get the latest logs from a container
aws lightsail get-container-log \
  --service-name my-app-service \
  --container-name my-app \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
```

## Updating Your Application

To deploy a new version, push the updated image and create a new deployment.

```bash
# Build and push the new version
docker build -t my-app:v2 .
aws lightsail push-container-image \
  --service-name my-app-service \
  --label my-app \
  --image my-app:v2

# Deploy the new version (use the image reference from the push output)
aws lightsail create-container-service-deployment \
  --service-name my-app-service \
  --containers '{
    "my-app": {
      "image": ":my-app-service.my-app.2",
      "ports": {"80": "HTTP"},
      "environment": {"NODE_ENV": "production"}
    }
  }' \
  --public-endpoint '{
    "containerName": "my-app",
    "containerPort": 80,
    "healthCheck": {"path": "/health"}
  }'
```

Lightsail performs a rolling deployment, so there's no downtime during updates.

## Troubleshooting Checklist

1. Deployment stuck? Check container logs for startup errors
2. Health check failing? Verify your /health endpoint works locally
3. Container crashing? Look at resource limits - you might need more memory
4. Image push failing? Make sure the Docker daemon is running locally
5. Custom domain not working? Verify the certificate is validated and DNS CNAME is correct

Lightsail Container Service is the sweet spot between running containers on a VM and dealing with the complexity of ECS. For adding a database to your container app, check out our guide on [setting up a Lightsail database](https://oneuptime.com/blog/post/2026-02-12-setup-lightsail-database/view).
