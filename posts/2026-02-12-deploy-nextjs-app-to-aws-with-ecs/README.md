# How to Deploy a Next.js App to AWS with ECS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Next.js, ECS, Docker, Fargate

Description: A hands-on guide to containerizing and deploying Next.js applications on AWS ECS Fargate with load balancing, auto-scaling, and CI/CD pipelines.

---

While AWS Amplify is great for simple Next.js deployments, sometimes you need more control. Maybe you're running a complex application with specific networking requirements, or you need to co-locate your frontend with backend services in the same cluster. That's where ECS (Elastic Container Service) with Fargate comes in. It gives you container-based deployments without the overhead of managing EC2 instances.

Let's build out a full production deployment from scratch.

## Containerizing Your Next.js App

First, you need a Dockerfile. Next.js provides a recommended multi-stage build that keeps the final image lean.

This Dockerfile uses three stages - dependencies, build, and runtime - to create a minimal production image:

```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set the Next.js telemetry opt-out
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

For the standalone output to work, update your `next.config.js`:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
}

module.exports = nextConfig
```

Test your container locally before pushing to AWS:

```bash
# Build the image
docker build -t nextjs-app .

# Run it locally
docker run -p 3000:3000 nextjs-app
```

## Setting Up ECR

Push your image to Amazon ECR so ECS can pull it:

```bash
# Create a repository in ECR
aws ecr create-repository \
  --repository-name nextjs-app \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build, tag, and push
docker build -t nextjs-app .
docker tag nextjs-app:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nextjs-app:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nextjs-app:latest
```

## Creating the ECS Infrastructure

You need several AWS resources: a cluster, task definition, service, load balancer, and networking. Let's set them up.

### VPC and Networking

If you don't already have a VPC set up, create one with public and private subnets. For production workloads, your ECS tasks should run in private subnets with a NAT gateway for outbound access.

Here's a CloudFormation snippet for the networking layer:

```yaml
# network.yml (partial CloudFormation template)
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: nextjs-vpc

  PublicSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  PublicSubnetB:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
```

### Application Load Balancer

Create an ALB to distribute traffic across your containers:

```bash
# Create the load balancer
aws elbv2 create-load-balancer \
  --name nextjs-alb \
  --subnets subnet-PUBLIC-A subnet-PUBLIC-B \
  --security-groups sg-xxx \
  --scheme internet-facing \
  --type application

# Create a target group for the ECS service
aws elbv2 create-target-group \
  --name nextjs-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path "/api/health" \
  --health-check-interval-seconds 30

# Create a listener on port 443
aws elbv2 create-listener \
  --load-balancer-arn ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=ACM_CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=TARGET_GROUP_ARN
```

### ECS Task Definition

Define how your container should run. This task definition allocates 512 CPU units and 1GB memory, which works well for most Next.js apps:

```json
{
  "family": "nextjs-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "nextjs-app",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nextjs-app:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "NEXT_PUBLIC_API_URL", "value": "https://api.yourapp.com"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/nextjs/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nextjs-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q --spider http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Create the ECS Cluster and Service

```bash
# Create the cluster
aws ecs create-cluster --cluster-name nextjs-cluster

# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create the service
aws ecs create-service \
  --cluster nextjs-cluster \
  --service-name nextjs-service \
  --task-definition nextjs-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --load-balancers targetGroupArn=TARGET_GROUP_ARN,containerName=nextjs-app,containerPort=3000 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-PRIVATE-A,subnet-PRIVATE-B],securityGroups=[sg-xxx]}"
```

## Auto-Scaling

Configure your service to scale based on CPU or request count:

```bash
# Register the service as a scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/nextjs-cluster/nextjs-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create a scaling policy based on CPU utilization
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/nextjs-cluster/nextjs-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

## CI/CD Pipeline

Automate deployments with a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

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
          docker build -t $ECR_REGISTRY/nextjs-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/nextjs-app:$IMAGE_TAG

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster nextjs-cluster \
            --service nextjs-service \
            --force-new-deployment
```

## Monitoring

Set up CloudWatch alarms for key metrics:

```bash
# Alarm for high CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name "nextjs-high-cpu" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=nextjs-cluster Name=ServiceName,Value=nextjs-service \
  --evaluation-periods 2 \
  --alarm-actions SNS_TOPIC_ARN
```

For comprehensive monitoring that goes beyond CloudWatch, consider integrating with [OneUptime](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view) for end-to-end observability and incident management.

## Wrapping Up

Deploying Next.js on ECS gives you container-level control with Fargate's serverless convenience. The initial setup is more involved than Amplify, but you get fine-grained control over networking, scaling, and resource allocation. For teams running microservices or needing specific compliance configurations, ECS is the right choice. If you want the simpler path, check out our guide on [deploying Next.js with Amplify](https://oneuptime.com/blog/post/deploy-nextjs-app-to-aws-with-amplify/view) instead.
