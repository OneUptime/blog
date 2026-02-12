# How to Deploy a Docker App with Elastic Beanstalk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Docker, Deployment, Containers

Description: Complete guide to deploying Docker containers on AWS Elastic Beanstalk, including single-container and multi-container setups with Docker Compose.

---

Docker and Elastic Beanstalk make a great combination. You get the consistency of containers - the same image runs in dev, staging, and production - with Elastic Beanstalk handling the infrastructure plumbing. No Kubernetes cluster to manage, no ECS task definitions to wrestle with. Just push a Docker image and go.

This guide covers both single-container and multi-container deployments, working with ECR, and the configuration details that matter in production.

## Single Container Deployment

The simplest approach is deploying a single Docker container. All you need is a `Dockerfile` in your project root.

Here's a typical Node.js application as an example.

```dockerfile
# Dockerfile - Multi-stage build for a Node.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
# EB expects the app to listen on the port specified by PORT env var
CMD ["node", "server.js"]
```

One critical detail: Elastic Beanstalk's Docker platform uses a reverse proxy (Nginx) that forwards traffic to your container. Your application needs to listen on the port specified by the `PORT` environment variable, which defaults to 8080.

```javascript
// server.js - Listen on the port EB assigns
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Deploying with the EB CLI

Initialize and create your environment with the Docker platform.

```bash
# Initialize with Docker platform
eb init -p docker my-docker-app --region us-east-1

# Create an environment
eb create production --instance-type t3.small

# Deploy updates
eb deploy
```

Elastic Beanstalk builds the Docker image on the EC2 instance during deployment. For faster deployments, you can pre-build and push to ECR instead.

## Using Amazon ECR

Pre-building images and storing them in ECR speeds up deployments and ensures consistency.

```bash
# Create an ECR repository
aws ecr create-repository --repository-name my-docker-app --region us-east-1

# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Build and push the image
docker build -t my-docker-app .
docker tag my-docker-app:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/my-docker-app:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-docker-app:latest
```

Then create a `Dockerrun.aws.json` that points to the ECR image instead of building from a Dockerfile.

```json
{
    "AWSEBDockerrunVersion": "1",
    "Image": {
        "Name": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-docker-app:latest",
        "Update": "true"
    },
    "Ports": [
        {
            "ContainerPort": 8080,
            "HostPort": 8080
        }
    ]
}
```

Make sure your EB instance profile has permissions to pull from ECR. Add the `AmazonEC2ContainerRegistryReadOnly` policy to the instance role.

## Multi-Container Deployment with Docker Compose

For applications that need multiple services - like a web app with a Redis cache or a worker process - use Docker Compose.

```yaml
# docker-compose.yml - Multi-container setup
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:8080"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: always

  worker:
    build: .
    command: node worker.js
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
    restart: always

volumes:
  redis-data:
```

Deploy this the same way. Elastic Beanstalk detects the `docker-compose.yml` and uses it automatically.

```bash
# Deploy multi-container setup
eb deploy
```

## Environment Configuration

Configure your Docker environment through `.ebextensions`.

```yaml
# .ebextensions/docker.config - Docker environment settings
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    LOG_LEVEL: info
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 6
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
```

## Handling Persistent Storage

Docker containers are ephemeral - any data written inside the container disappears when it's replaced. For persistent data, mount EBS volumes or use external services like S3 or RDS.

```yaml
# .ebextensions/storage.config - Mount an EBS volume for persistent data
commands:
  01_mkdir:
    command: "mkdir -p /data/app"

container_commands:
  01_permissions:
    command: "chmod 777 /data/app"
```

In your `docker-compose.yml`, bind mount the host directory.

```yaml
services:
  web:
    build: .
    volumes:
      - /data/app:/app/data
```

## Health Checks

Configure health checks that work with your Dockerized application.

```yaml
# .ebextensions/healthcheck.config
option_settings:
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health
    HealthCheckInterval: 15
    HealthCheckTimeout: 5
    UnhealthyThresholdCount: 5
    MatcherHTTPCode: 200
```

Your application should expose a health endpoint that checks critical dependencies.

```javascript
// Health check endpoint that verifies dependencies
app.get('/health', async (req, res) => {
    try {
        // Check Redis connection
        await redisClient.ping();
        // Check database connection
        await db.query('SELECT 1');
        res.json({ status: 'healthy' });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});
```

## Deploying Updates Safely

For production deployments, use rolling updates so your application stays available during deploys.

```yaml
# .ebextensions/deployment.config - Rolling deployment settings
option_settings:
  aws:elasticbeanstalk:command:
    DeploymentPolicy: Rolling
    BatchSizeType: Percentage
    BatchSize: 25
  aws:elasticbeanstalk:command:
    Timeout: 600
```

This deploys to 25% of instances at a time, keeping 75% serving traffic. For more details on deployment strategies, check out our guide on [rolling deployments in Elastic Beanstalk](https://oneuptime.com/blog/post/set-up-rolling-deployments-in-elastic-beanstalk/view).

## Debugging Docker Deployments

When things go wrong, SSH into the instance and inspect the containers.

```bash
# SSH into the EB instance
eb ssh

# On the instance, check running containers
sudo docker ps

# View container logs
sudo docker logs <container-id>

# Inspect the Docker Compose setup
sudo cat /var/app/current/docker-compose.yml
```

For persistent logging, configure Docker to send logs to CloudWatch.

```yaml
# .ebextensions/cloudwatch-logs.config
files:
  "/etc/awslogs/config/docker.conf":
    mode: "000644"
    content: |
      [docker]
      log_group_name=/aws/elasticbeanstalk/my-docker-app/docker
      log_stream_name={instance_id}
      file=/var/log/eb-docker/containers/eb-current-app/*-stdouterr.log
```

## Performance Considerations

Docker on Elastic Beanstalk adds a thin layer of overhead compared to running directly on the platform. In practice, it's negligible for most applications. However, there are a few things to keep in mind.

**Image size matters**: Smaller images mean faster deployments. Use Alpine-based images and multi-stage builds. A 50 MB image deploys much faster than a 500 MB one.

**Memory limits**: Set explicit memory limits in your Docker Compose file to prevent a single container from consuming all instance memory.

```yaml
services:
  web:
    build: .
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

**Build caching**: If you're building on the instance, Docker layer caching helps with subsequent deploys. Structure your Dockerfile so that frequently-changing layers (like COPY) come last.

## Wrapping Up

Docker on Elastic Beanstalk gives you container portability without the complexity of a full container orchestration platform. It's the right fit for teams that want Docker's consistency but don't need Kubernetes-level orchestration.

For simple applications, a single Dockerfile is all you need. For more complex setups, Docker Compose handles multi-service architectures well. And when you outgrow Elastic Beanstalk, your Docker images work on ECS, EKS, or anywhere else containers run.

If you're experiencing deployment issues, take a look at our guide on [troubleshooting Elastic Beanstalk deployment failures](https://oneuptime.com/blog/post/troubleshoot-elastic-beanstalk-deployment-failures/view).
