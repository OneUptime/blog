# How to Migrate from Docker Compose to ECS Task Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Docker Compose, Migration

Description: A step-by-step guide to migrating your Docker Compose applications to native ECS task definitions for better control, scalability, and access to advanced ECS features.

---

You started with Docker Compose because it was easy. One `docker-compose up` and your whole application stack was running locally. Then you deployed it to ECS using the Compose integration, and it worked well enough. But now you need autoscaling, blue/green deployments, or more control over networking. That means moving to native ECS task definitions.

This migration doesn't have to happen all at once. You can convert services one at a time, testing each conversion before moving on. Let's walk through the process.

## Why Migrate?

The Docker Compose to ECS integration is convenient but limited. Native ECS task definitions give you:

- Full control over deployment configuration (circuit breakers, rollback)
- Target tracking and step autoscaling
- Blue/green deployments with CodeDeploy
- Service Connect for service mesh capabilities
- Fine-grained IAM roles per task
- Capacity provider strategies
- Placement constraints and strategies

If you need any of these, it's time to migrate.

## Mapping Compose to ECS Concepts

Here's a reference table for translating Compose constructs to their ECS equivalents:

| Docker Compose | ECS Task Definition |
|---------------|-------------------|
| `image` | `containerDefinitions[].image` |
| `ports` | `containerDefinitions[].portMappings` |
| `environment` | `containerDefinitions[].environment` |
| `env_file` | Use Secrets Manager or SSM Parameter Store |
| `volumes` (named) | `volumes` + `mountPoints` |
| `depends_on` | `containerDefinitions[].dependsOn` |
| `command` | `containerDefinitions[].command` |
| `entrypoint` | `containerDefinitions[].entryPoint` |
| `healthcheck` | `containerDefinitions[].healthCheck` |
| `deploy.resources` | Task-level `cpu`/`memory` and container `memory` |
| `logging` | `containerDefinitions[].logConfiguration` |
| `networks` | VPC networking via `networkMode: awsvpc` |

## Step-by-Step Migration

Let's convert a real Docker Compose file. Here's our starting point:

```yaml
# docker-compose.yml
version: "3.8"

services:
  web:
    image: my-registry/webapp:latest
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://cache:6379
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "1"
          memory: 2048M
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/webapp
        awslogs-region: us-east-1
        awslogs-stream-prefix: web

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 512M
```

### Step 1: Split Into Separate Task Definitions

In Compose, both services run together. In ECS, independently scalable services should have separate task definitions. The web service and cache have different scaling needs, so they get separate task definitions.

Here's the web service task definition:

```json
{
  "family": "webapp-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/webappTaskRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "my-registry/webapp:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "REDIS_URL", "value": "redis://cache.app.local:6379"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:webapp/database-url"
        }
      ],
      "healthCheck": {
        "command": ["CMD", "curl", "-f", "http://localhost:3000/health"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 40
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/webapp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      }
    }
  ]
}
```

And the cache task definition:

```json
{
  "family": "webapp-cache",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "cache",
      "image": "redis:7-alpine",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 6379,
          "protocol": "tcp"
        }
      ],
      "healthCheck": {
        "command": ["CMD", "redis-cli", "ping"],
        "interval": 10,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/webapp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "cache"
        }
      }
    }
  ]
}
```

### Step 2: Convert Environment Variables and Secrets

In Compose, you might have environment variables in a `.env` file or use `${VARIABLE}` syntax. For ECS:

- **Non-sensitive values** go in the `environment` array directly
- **Sensitive values** (passwords, API keys, connection strings) should go in AWS Secrets Manager and be referenced through the `secrets` array
- **Shared configuration** that changes between environments goes in SSM Parameter Store

```bash
# Store the database URL in Secrets Manager
aws secretsmanager create-secret \
  --name webapp/database-url \
  --secret-string "postgresql://user:pass@host:5432/dbname"
```

This is more secure than the Compose approach of using environment variables or `.env` files.

### Step 3: Set Up Service Discovery

In Compose, services can reach each other by name (e.g., `redis://cache:6379`). In ECS, you need Cloud Map for service discovery:

```bash
# Create a namespace for your application
aws servicediscovery create-private-dns-namespace \
  --name app.local \
  --vpc vpc-abc123

# Create a service discovery service for the cache
aws servicediscovery create-service \
  --name cache \
  --dns-config '{
    "NamespaceId": "ns-abc123",
    "DnsRecords": [{"Type": "A", "TTL": 10}]
  }' \
  --health-check-custom-config '{"FailureThreshold": 1}'
```

Then update your web service's environment to use the Cloud Map DNS name instead of the Compose service name:

```json
{"name": "REDIS_URL", "value": "redis://cache.app.local:6379"}
```

### Step 4: Create ECS Services

Register the task definitions and create services:

```bash
# Register the task definitions
aws ecs register-task-definition --cli-input-json file://webapp-web-taskdef.json
aws ecs register-task-definition --cli-input-json file://webapp-cache-taskdef.json

# Create the cache service first (since web depends on it)
aws ecs create-service \
  --cluster production \
  --service-name webapp-cache \
  --task-definition webapp-cache \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123", "subnet-def456"],
      "securityGroups": ["sg-cache"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --service-registries '[{"registryArn": "arn:aws:servicediscovery:us-east-1:123456789012:service/srv-cache123"}]'

# Create the web service with a load balancer
aws ecs create-service \
  --cluster production \
  --service-name webapp-web \
  --task-definition webapp-web \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123", "subnet-def456"],
      "securityGroups": ["sg-web"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --load-balancers '[{
    "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/webapp-tg/abc123",
    "containerName": "web",
    "containerPort": 3000
  }]' \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration '{
    "deploymentCircuitBreaker": {"enable": true, "rollback": true},
    "minimumHealthyPercent": 100,
    "maximumPercent": 200
  }'
```

### Step 5: Add Autoscaling

This is one of the biggest gains from migration - proper autoscaling:

```bash
# Register the web service for autoscaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/production/webapp-web \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 20

# Add CPU-based target tracking
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/production/webapp-web \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-tracking \
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

## Keeping Compose for Local Development

You don't have to abandon Docker Compose entirely. Keep it for local development while using native ECS for production:

```yaml
# docker-compose.local.yml - for local development only
version: "3.8"

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://cache:6379
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/webapp
    volumes:
      - ./web/src:/app/src
    depends_on:
      - cache
      - db

  cache:
    image: redis:7-alpine

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=webapp
```

This gives you the best of both worlds: fast local development with Compose and production-grade deployment with native ECS.

## Migration Checklist

Before cutting over, verify:

- [ ] All task definitions registered and tested
- [ ] Service discovery configured and DNS resolving correctly
- [ ] Secrets stored in Secrets Manager and accessible
- [ ] Security groups allow inter-service communication
- [ ] Load balancer health checks passing
- [ ] Autoscaling configured and tested
- [ ] Monitoring and alarms set up
- [ ] CI/CD pipeline updated to deploy task definitions
- [ ] Rollback plan documented

## Wrapping Up

Migrating from Docker Compose to native ECS task definitions is a worthwhile investment once you need features that Compose can't provide. The process is methodical - convert service by service, test each one, and keep Compose around for local development.

The end result is a production deployment that's more robust, more scalable, and gives you access to everything ECS has to offer. For managing your task definitions as infrastructure as code, check out our guides on [ECS with CloudFormation](https://oneuptime.com/blog/post/2026-02-12-ecs-with-cloudformation/view) and [ECS with AWS CDK](https://oneuptime.com/blog/post/2026-02-12-ecs-with-aws-cdk/view).
