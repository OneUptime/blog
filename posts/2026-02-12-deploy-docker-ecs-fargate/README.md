# How to Deploy a Docker Container on ECS with Fargate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Fargate, Docker, Containers

Description: A complete walkthrough of deploying a Docker container on ECS with Fargate, from building the image to running it in production with networking and logging configured.

---

Fargate is the simplest way to run containers on AWS. You don't manage servers, you don't patch operating systems, and you don't worry about bin-packing containers onto instances. You define your container, specify the resources it needs, and Fargate handles everything else.

This guide walks through the entire process end to end: building a Docker image, pushing it to ECR, and deploying it on ECS with Fargate.

## The Application

Let's deploy a simple Node.js API. Here's the application code.

```javascript
// app.js - a simple Express API
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/greeting', (req, res) => {
  const name = req.query.name || 'World';
  res.json({ message: `Hello, ${name}!`, version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

And the Dockerfile.

```dockerfile
# Dockerfile - multi-stage build for small production image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
# Copy only production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY app.js .
EXPOSE 8080
# Run as non-root user for security
USER node
CMD ["node", "app.js"]
```

## Step 1: Create an ECR Repository

Amazon Elastic Container Registry stores your Docker images.

```bash
# Create a private ECR repository
aws ecr create-repository \
  --repository-name my-api \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

## Step 2: Build and Push the Image

```bash
# Get the ECR login token and authenticate Docker
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -t my-api:1.0.0 .

# Tag it for ECR
docker tag my-api:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:1.0.0
docker tag my-api:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest
```

## Step 3: Create the ECS Cluster

```bash
# Create a Fargate cluster
aws ecs create-cluster \
  --cluster-name api-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --setting name=containerInsights,value=enabled
```

## Step 4: Create the CloudWatch Log Group

```bash
# Create a log group for container logs
aws logs create-log-group --log-group-name /ecs/my-api
aws logs put-retention-policy --log-group-name /ecs/my-api --retention-in-days 14
```

## Step 5: Create the Task Definition

Save this as `task-definition.json`.

```json
{
  "family": "my-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:1.0.0",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "8080"}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q -O /dev/null http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

Register it.

```bash
# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

## Step 6: Set Up Networking

Create a security group that allows inbound traffic on port 8080.

```bash
# Create a security group for the Fargate tasks
aws ec2 create-security-group \
  --group-name ecs-api-sg \
  --description "Security group for ECS API tasks" \
  --vpc-id vpc-12345678

# Allow inbound traffic on port 8080
aws ec2 authorize-security-group-ingress \
  --group-id sg-newgroup123 \
  --protocol tcp \
  --port 8080 \
  --cidr 10.0.0.0/16
```

## Step 7: Create an ALB

For production, put an Application Load Balancer in front of your tasks.

```bash
# Create an ALB
aws elbv2 create-load-balancer \
  --name my-api-alb \
  --subnets subnet-abc123 subnet-def456 \
  --security-groups sg-alb-group \
  --scheme internet-facing \
  --type application

# Create a target group (IP type for Fargate)
aws elbv2 create-target-group \
  --name my-api-targets \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-12345678 \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create a listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789:loadbalancer/app/my-api-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-api-targets/def456
```

## Step 8: Create the Service

Now bring it all together with an ECS service.

```bash
# Create the service with ALB integration
aws ecs create-service \
  --cluster api-cluster \
  --service-name my-api-service \
  --task-definition my-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123", "subnet-def456"],
      "securityGroups": ["sg-newgroup123"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --load-balancers '[
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-api-targets/def456",
      "containerName": "api",
      "containerPort": 8080
    }
  ]' \
  --health-check-grace-period-seconds 30 \
  --deployment-configuration '{
    "maximumPercent": 200,
    "minimumHealthyPercent": 100,
    "deploymentCircuitBreaker": {
      "enable": true,
      "rollback": true
    }
  }'
```

## Step 9: Verify the Deployment

Check that everything is running.

```bash
# Verify service status
aws ecs describe-services \
  --cluster api-cluster \
  --services my-api-service \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments[*].{Status:status,Running:runningCount}}'

# Get the ALB DNS name
aws elbv2 describe-load-balancers \
  --names my-api-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

Test the API.

```bash
# Hit the health endpoint through the ALB
curl http://my-api-alb-xxxxx.us-east-1.elb.amazonaws.com/health

# Test the API endpoint
curl "http://my-api-alb-xxxxx.us-east-1.elb.amazonaws.com/api/greeting?name=ECS"
```

## Deploying Updates

When you have a new version, the workflow is:

```bash
# Build and push the new image
docker build -t my-api:1.1.0 .
docker tag my-api:1.1.0 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:1.1.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:1.1.0

# Update the task definition with the new image tag
# (edit task-definition.json to reference my-api:1.1.0)
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Update the service to use the new revision
aws ecs update-service \
  --cluster api-cluster \
  --service my-api-service \
  --task-definition my-api:2

# Watch the rolling deployment
aws ecs wait services-stable --cluster api-cluster --services my-api-service
echo "Deployment complete!"
```

## Cost Estimate

For a service running 2 Fargate tasks with 0.25 vCPU and 512 MB memory:

- Per task per hour: roughly $0.012
- Per month (2 tasks, 24/7): roughly $17-18
- Plus ALB: roughly $16/month base + data processing charges

That's a production-ready API with load balancing, health checks, and auto-restart for under $35/month. Compare that with running and managing EC2 instances yourself. For a detailed comparison, see our post on [choosing between Fargate and EC2](https://oneuptime.com/blog/post/2026-02-12-choose-ecs-fargate-ec2/view).

## Wrapping Up

Deploying containers on Fargate is the fastest path to production on AWS. No servers to manage, no capacity planning, no patching. The trade-off is slightly higher per-unit cost compared to well-optimized EC2 instances, but for most teams the operational simplicity more than compensates. Start here, and optimize later if costs become a concern at scale.
