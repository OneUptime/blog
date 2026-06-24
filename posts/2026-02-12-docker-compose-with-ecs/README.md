# How to Use Docker Compose with ECS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Docker Compose, Container

Description: Learn how to deploy Docker Compose applications to Amazon ECS using the Docker ECS integration and the ecs-cli, with practical examples and migration tips.

---

If you've been running your application locally with Docker Compose, the idea of deploying that same configuration to ECS sounds appealing. Instead of rewriting everything as ECS task definitions and services, you'd just point your compose file at ECS and let it figure out the rest.

There have been a couple of ways to do this, and each has tradeoffs. Docker's ECS integration for Compose has been retired, so treat it as a legacy workflow for older environments and migrations rather than a current recommendation. Let's go through the options, see what worked well, and discuss when you might want to take a different approach.

## The Docker ECS Context

Older Docker Desktop and Compose CLI releases included a built-in ECS integration through Docker Contexts. In those releases, you could switch your Docker CLI to target ECS instead of your local Docker daemon, and then use `docker compose up` to deploy directly to ECS. Current Docker documentation lists the ECS cloud integration as retired, so the commands in this section only apply if you are maintaining an older installation that still includes it.

In that legacy setup, create an ECS context:

```bash
# Create a new Docker context for ECS

docker context create ecs myecscontext

# Switch to the ECS context
docker context use myecscontext

# Verify you're using the ECS context
docker context show
```

When you create the context, Docker can prompt you for your AWS credentials and default region or use configured AWS credentials. It uses these to provision resources in your account.

## A Sample Compose File for ECS

Here's a compose file for a typical web application with a backend API, a frontend, and a Redis cache:

```yaml
# docker-compose.yml
services:
  frontend:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/frontend:latest
    ports:
      - "80:3000"
    environment:
      - API_URL=http://backend:8080
    depends_on:
      - backend

  backend:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/backend:latest
    environment:
      - REDIS_URL=redis://cache:6379
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - cache
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 1024M
        reservations:
          cpus: "0.25"
          memory: 512M
      replicas: 2

  cache:
    image: redis:7-alpine

x-aws-vpc: "vpc-abc123"
x-aws-cluster: "production-cluster"
```

A few things to note about this file:

- Images must be in ECR or another registry that ECS can pull from. The Docker ECS integration does not build images in ECS during deployment.
- The `deploy` section maps to ECS deployment configuration. Resource values are translated into ECS task and container CPU and memory settings, and `replicas` sets the desired count.
- The `x-aws-vpc` and `x-aws-cluster` extensions let you target a specific VPC and ECS cluster.

## Deploying with Docker Compose

With the legacy ECS context active, deployment is straightforward:

```bash
# Deploy the application to ECS
docker compose up -d

# Check the status
docker compose ps

# View logs
docker compose logs backend

# Scale a service
docker compose up -d --scale backend=4

# Tear down the deployment
docker compose down
```

Behind the scenes, the retired Docker ECS integration translates your compose file into CloudFormation and deploys it. Depending on the Compose file and existing resources you reference, it creates or updates resources such as:
- An ECS cluster (if you didn't specify one)
- Task definitions for each service
- ECS services with the specified replica counts
- A load balancer for services with published ports
- Security groups for inter-service communication
- Cloud Map service discovery so services can find each other by name

## ECS Compose Extensions

The retired Docker ECS integration supported several custom extensions for ECS-specific configuration:

```yaml
services:
  backend:
    image: my-registry/backend:latest
    # ECS-specific extensions
    x-aws-autoscaling:
      min: 2
      max: 10
      cpu: 75
    x-aws-role:
      Statement:
        - Effect: Allow
          Action:
            - "s3:GetObject"
          Resource: "arn:aws:s3:::my-bucket/*"
    x-aws-logs_retention: 30
    x-aws-pull_credentials: "arn:aws:secretsmanager:us-east-1:123456789012:secret:dockerhub"
```

These extensions let you configure:
- **x-aws-autoscaling** - Auto scaling rules
- **x-aws-role** - IAM permissions for the task
- **x-aws-logs_retention** - CloudWatch log retention in days
- **x-aws-pull_credentials** - Secrets Manager ARN for private registry auth

## Using the ECS CLI (Legacy)

Before the Docker ECS integration, there was the `ecs-cli` tool. It is a legacy tool, and new ECS deployments should generally use native ECS APIs, AWS CloudFormation, AWS CDK, or another actively maintained deployment path:

```bash
# Install the ECS CLI
sudo curl -Lo /usr/local/bin/ecs-cli https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest
sudo chmod +x /usr/local/bin/ecs-cli

# Configure the ECS CLI
ecs-cli configure \
  --cluster production \
  --default-launch-type FARGATE \
  --region us-east-1 \
  --config-name production

# Deploy using docker-compose.yml
ecs-cli compose --project-name my-app service up \
  --create-log-groups \
  --cluster-config production
```

The ECS CLI has an additional file for ECS-specific parameters:

```yaml
# ecs-params.yml
version: 1
task_definition:
  task_execution_role: ecsTaskExecutionRole
  task_role_arn: arn:aws:iam::123456789012:role/ecsTaskRole
  ecs_network_mode: awsvpc
  task_size:
    mem_limit: 2048
    cpu_limit: 1024

run_params:
  network_configuration:
    awsvpc_configuration:
      subnets:
        - subnet-abc123
        - subnet-def456
      security_groups:
        - sg-abc123
      assign_public_ip: DISABLED
```

## Compose to ECS Translation

Understanding how compose concepts map to ECS helps you write better compose files for ECS deployment:

| Docker Compose | ECS Equivalent |
|---------------|----------------|
| `services` | Task definitions + ECS services |
| `ports` | Port mappings + load balancer listeners |
| `environment` | Container environment variables |
| `depends_on` | Startup ordering in Compose; not a substitute for ECS service readiness |
| `volumes` (named) | EFS volumes |
| `deploy.replicas` | Service desired count |
| `deploy.resources` | Task CPU/memory |
| `networks` | Security groups + Cloud Map |

Some compose features don't translate well:
- **Build context** - ECS can't build images from a Compose `build` context. You must build and push images to a registry first.
- **Host volumes and bind mounts** - On Fargate, you can't mount host paths. Use EFS for persistent storage.
- **Privileged mode** - Not supported on Fargate.
- **Network mode** - Always `awsvpc` on Fargate, regardless of what the compose file says.

## Practical Workflow

For legacy Docker ECS integration users, this workflow was common when transitioning from local Docker Compose to ECS:

```bash
# 1. Build and push images to ECR
docker compose build
docker compose push

# 2. Switch to the ECS context
docker context use myecscontext

# 3. Deploy to ECS
docker compose up -d

# 4. Monitor the deployment
docker compose ps
docker compose logs -f

# 5. Switch back to local for development
docker context use default
```

Keep separate compose files for local development and ECS deployment:

```bash
# Local development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# ECS deployment
docker compose -f docker-compose.yml -f docker-compose.ecs.yml up -d
```

The `docker-compose.dev.yml` file overrides images with build contexts, adds debug ports, and mounts local volumes. The `docker-compose.ecs.yml` file adds ECS-specific extensions and production settings.

## Limitations to Know About

The Docker Compose to ECS path has some notable limitations:

1. **No host-path persistence on Fargate.** Local bind mounts do not translate to Fargate host storage. For persistent storage, you need to use EFS, which requires additional setup.

2. **Limited networking control.** You can't define complex network topologies. Everything ends up in the same VPC with Cloud Map for discovery.

3. **CloudFormation overhead.** Each deployment creates or updates a CloudFormation stack, which can be slow for large applications.

4. **Retired integration.** New ECS features are not being added to Docker's retired ECS integration. Use native ECS definitions, CloudFormation, CDK, or another maintained tool for new work.

5. **Limited deployment controls.** ECS services can perform rolling deployments, but the Compose integration does not expose the full ECS deployment feature set, such as blue/green deployments, circuit breakers, or detailed deployment configuration.

For teams that outgrow these limitations, the natural next step is to move to native ECS task definitions managed through CloudFormation or CDK. See our guide on [migrating from Docker Compose to ECS task definitions](https://oneuptime.com/blog/post/2026-02-12-migrate-docker-compose-ecs-task-definitions/view).

## When to Use Compose vs Native ECS

Use the retired Docker Compose ECS integration only when:
- You're maintaining an existing deployment that already depends on it
- You're prototyping in an older environment where the integration is still installed
- Your deployment requirements are simple

Use native ECS task definitions when:
- You need fine-grained control over deployment configuration
- You require advanced autoscaling policies, circuit breakers, or blue/green deployments
- You're managing many services across multiple environments
- You want to leverage the full ECS feature set

## Wrapping Up

Docker Compose with ECS helped bridge the gap between local development and cloud deployment, especially for teams that were already invested in the Compose workflow. Because Docker's ECS integration is now retired, use it only with that limitation in mind, and plan to migrate to native ECS configurations as your application grows in complexity and scale.
