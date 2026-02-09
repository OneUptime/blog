# How to Use AWS App Runner with Docker Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, AWS, App Runner, ECR, Cloud Deployment, Containers, Serverless

Description: Learn how to deploy Docker container images to AWS App Runner from ECR for automatic scaling and zero-config hosting.

---

AWS App Runner is a fully managed service that makes it simple to deploy containerized web applications. You push a Docker image to Amazon Elastic Container Registry (ECR), point App Runner at it, and the service handles provisioning, scaling, TLS, and load balancing. There is no cluster to manage, no Kubernetes to configure, and no infrastructure to babysit.

This guide covers the entire workflow, from building your Docker image to deploying it on App Runner, including automatic deployments when you push new images.

## Why App Runner?

If you have ever deployed containers on ECS or EKS, you know the overhead. Task definitions, target groups, listener rules, autoscaling policies, VPC configurations - the list goes on. App Runner strips all of that away. You get:

- Automatic scaling from zero to thousands of requests per second
- Built-in HTTPS with managed TLS certificates
- Health checks and automatic rollbacks
- Pay-per-use pricing with no idle charges when scaled to zero

The trade-off is less control. You cannot customize the load balancer, pick specific instance types, or run sidecar containers. For straightforward web services and APIs, though, App Runner hits a sweet spot between simplicity and power.

## Prerequisites

You will need:

- An AWS account with appropriate permissions
- AWS CLI v2 installed and configured
- Docker installed on your local machine
- A web application with a Dockerfile

## Step 1: Build Your Docker Image

Let us start with a simple Node.js application. App Runner expects your container to listen on a port defined by the `PORT` environment variable (defaulting to 8080).

Here is a minimal Express application:

```javascript
// app.js - Simple Express server that respects the PORT env var
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'app-runner-demo' });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

The Dockerfile keeps things lean with a multi-stage build:

```dockerfile
# Dockerfile - Multi-stage build for a Node.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
# Copy only production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# App Runner sets PORT automatically, but we define a default
EXPOSE 8080
CMD ["node", "app.js"]
```

Build the image locally to make sure it works:

```bash
# Build the Docker image and tag it
docker build -t app-runner-demo:latest .

# Test it locally on port 8080
docker run -p 8080:8080 app-runner-demo:latest
```

Visit `http://localhost:8080` to confirm the app responds.

## Step 2: Create an ECR Repository

App Runner pulls images from ECR (either public or private). Private ECR is more common for production workloads.

```bash
# Create a private ECR repository
aws ecr create-repository \
  --repository-name app-runner-demo \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

The `scanOnPush` flag automatically scans images for known vulnerabilities when they arrive. Take note of the repository URI in the output. It looks like `123456789012.dkr.ecr.us-east-1.amazonaws.com/app-runner-demo`.

## Step 3: Push Your Image to ECR

Authenticate Docker with your ECR registry, tag the image, and push it.

```bash
# Authenticate Docker to your ECR registry
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag the local image with the ECR repository URI
docker tag app-runner-demo:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/app-runner-demo:latest

# Push the image to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/app-runner-demo:latest
```

## Step 4: Create an IAM Role for App Runner

App Runner needs permission to pull images from your private ECR repository. Create an access role with the appropriate policy.

```bash
# Create the trust policy file for App Runner
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name AppRunnerECRAccess \
  --assume-role-policy-document file://trust-policy.json

# Attach the managed policy that grants ECR pull access
aws iam attach-role-policy \
  --role-name AppRunnerECRAccess \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

## Step 5: Deploy to App Runner

Now create the App Runner service. You can do this through the console or the CLI.

```bash
# Create the App Runner service from your ECR image
aws apprunner create-service \
  --service-name demo-api \
  --source-configuration '{
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::123456789012:role/AppRunnerECRAccess"
    },
    "AutoDeploymentsEnabled": true,
    "ImageRepository": {
      "ImageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/app-runner-demo:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production"
        }
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --region us-east-1
```

Key configuration points:

- **AutoDeploymentsEnabled**: When set to true, pushing a new image to ECR triggers an automatic redeployment.
- **Cpu and Memory**: Specified in millicores and MB. 1024 Cpu = 1 vCPU.
- **Health check**: App Runner uses this to verify your container is ready before routing traffic.

## Step 6: Check Deployment Status

Deployments take a couple of minutes. Monitor progress with:

```bash
# List your App Runner services and their status
aws apprunner list-services --region us-east-1

# Get detailed information about a specific service
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/demo-api/<service-id> \
  --region us-east-1
```

Once the status shows `RUNNING`, the output includes a `ServiceUrl` like `abc123.us-east-1.awsapprunner.com`. Open it in your browser - HTTPS works out of the box.

## Step 7: Configure Auto Scaling

App Runner scales automatically, but you can tune the behavior:

```bash
# Create a custom auto-scaling configuration
aws apprunner create-auto-scaling-configuration \
  --auto-scaling-configuration-name custom-scaling \
  --max-concurrency 100 \
  --min-size 1 \
  --max-size 10 \
  --region us-east-1
```

- **max-concurrency**: The number of concurrent requests per instance before scaling out. The default is 100.
- **min-size**: The minimum number of instances. Set to 1 to avoid cold starts, or 0 to save costs during idle periods.
- **max-size**: The ceiling for scale-out.

## Step 8: Set Up a Custom Domain

App Runner supports custom domains with automatic TLS certificate provisioning.

```bash
# Associate a custom domain with your App Runner service
aws apprunner associate-custom-domain \
  --service-arn arn:aws:apprunner:us-east-1:123456789012:service/demo-api/<service-id> \
  --domain-name api.yourdomain.com \
  --region us-east-1
```

The command returns CNAME records you need to add to your DNS. After DNS propagation, App Runner provisions and manages the TLS certificate.

## Automating Deployments with CI/CD

Since `AutoDeploymentsEnabled` triggers redeployments on image push, your CI/CD pipeline just needs to build and push the image. Here is a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml - Build and push to ECR on every push to main
name: Deploy to App Runner
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Build with both the commit SHA tag and latest
          docker build -t $ECR_REGISTRY/app-runner-demo:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/app-runner-demo:$IMAGE_TAG $ECR_REGISTRY/app-runner-demo:latest
          docker push $ECR_REGISTRY/app-runner-demo:$IMAGE_TAG
          docker push $ECR_REGISTRY/app-runner-demo:latest
```

Every push to `main` builds the image, pushes it to ECR, and App Runner automatically picks up the new version.

## Cost Considerations

App Runner pricing has two components:

- **Provisioned instances**: You pay for CPU and memory while your service is active, even at minimum scale.
- **Active instances**: Additional cost when instances are handling requests.

For low-traffic services, setting `min-size` to 0 lets the service scale to zero, but you will experience cold starts of a few seconds. For production APIs, keeping at least one instance warm avoids latency spikes.

## Conclusion

AWS App Runner removes the operational overhead of container deployment. You build a Docker image, push it to ECR, and App Runner handles the rest, from TLS certificates to auto-scaling. The automatic deployment trigger makes CI/CD pipelines straightforward: just push a new image and the service updates itself. For teams that want the portability of Docker containers without the complexity of ECS or Kubernetes, App Runner is a compelling option.
