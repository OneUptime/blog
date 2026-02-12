# How to Use AWS Copilot CLI to Deploy ECS Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Copilot CLI, Deployment, Containers

Description: Learn how to use the AWS Copilot CLI to deploy containerized applications to ECS without writing CloudFormation or Terraform from scratch.

---

Setting up ECS from scratch involves a lot of moving parts: clusters, task definitions, services, load balancers, VPCs, subnets, security groups, IAM roles, log groups, and more. AWS Copilot abstracts all of that away behind a simple CLI. You point it at your Dockerfile, answer a few questions, and it builds, pushes, and deploys your application to ECS.

Copilot isn't just a deployment tool - it's an opinionated framework for structuring your ECS applications. It creates environments (dev, staging, production), manages pipelines, handles secrets, and configures networking. If you're starting a new ECS project and don't want to write hundreds of lines of infrastructure code, Copilot is worth a serious look.

## Installing Copilot

Copilot is a standalone binary. Install it based on your platform.

```bash
# macOS (Homebrew)
brew install aws/tap/copilot-cli

# macOS/Linux (direct download)
curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux \
  && chmod +x copilot \
  && sudo mv copilot /usr/local/bin/copilot

# Verify installation
copilot --version
```

## Initializing an Application

Start by initializing a Copilot application in your project directory. This creates the scaffolding that Copilot uses to manage your deployments.

```bash
# Initialize a new application
copilot app init my-web-app
```

This creates a `copilot/` directory in your project with configuration files. The application is a top-level grouping - think of it as a project that contains multiple services and environments.

## Creating a Service

A service in Copilot maps directly to an ECS service. Copilot supports several service types:

- **Load Balanced Web Service** - A public-facing service behind an ALB
- **Backend Service** - An internal service accessible via service discovery
- **Worker Service** - A service that processes messages from an SQS queue
- **Request-Driven Web Service** - Runs on App Runner instead of ECS

Let's create a load-balanced web service.

```bash
# Create a service interactively
copilot svc init

# Or specify everything upfront
copilot svc init \
  --name api \
  --svc-type "Load Balanced Web Service" \
  --dockerfile ./Dockerfile \
  --port 8080
```

This generates a manifest file at `copilot/api/manifest.yml`. Here's what a typical manifest looks like.

```yaml
# copilot/api/manifest.yml
name: api
type: Load Balanced Web Service

image:
  build: Dockerfile
  port: 8080

http:
  path: '/'
  healthcheck:
    path: '/health'
    healthy_threshold: 2
    unhealthy_threshold: 3
    interval: 15s
    timeout: 5s

cpu: 512
memory: 1024
platform: linux/x86_64
count:
  range: 2-10
  cpu_percentage: 70
  memory_percentage: 80

exec: true  # Enable ECS Exec for debugging

variables:
  NODE_ENV: production
  LOG_LEVEL: info

secrets:
  DB_PASSWORD: /copilot/${COPILOT_APPLICATION_NAME}/${COPILOT_ENVIRONMENT_NAME}/secrets/db-password
```

## Creating an Environment

Environments are isolated deployments of your application - typically dev, staging, and production. Each environment gets its own VPC, ECS cluster, and ALB.

```bash
# Create a development environment
copilot env init \
  --name dev \
  --profile default \
  --default-config

# Create a production environment with custom VPC
copilot env init \
  --name production \
  --profile default
```

During initialization, you can choose to use an existing VPC or let Copilot create one. For production, you might want to use your existing VPC.

## Deploying

Deploy your service to an environment with a single command.

```bash
# Deploy to the dev environment
copilot svc deploy --name api --env dev

# Deploy to production
copilot svc deploy --name api --env production
```

Copilot handles everything: building the Docker image, pushing it to ECR, updating the task definition, and rolling out the new version. It even shows you the deployment progress in real-time.

```
Building your container image: docker build -t api .
Pushing to ECR...
Deploying api to dev environment...
- Creating ECR repository...
- Updating CloudFormation stack...
- Waiting for service to stabilize...
Deployed! URL: https://api.dev.my-web-app.us-east-1.aws
```

## Adding a Backend Service

For internal services that don't need a public endpoint, use a backend service. These are accessible via service discovery within the VPC.

```bash
copilot svc init \
  --name worker \
  --svc-type "Backend Service" \
  --dockerfile ./worker/Dockerfile
```

The manifest for a backend service looks slightly different.

```yaml
# copilot/worker/manifest.yml
name: worker
type: Backend Service

image:
  build: worker/Dockerfile
  port: 3000

cpu: 256
memory: 512
count: 3

variables:
  QUEUE_URL: !GetAtt EventsQueue.QueueUrl

# Service discovery endpoint
# Other services can reach this at: http://worker.dev.my-web-app.local:3000
```

Your frontend service can call the backend using the service discovery endpoint that Copilot sets up automatically.

## Managing Secrets

Copilot integrates with SSM Parameter Store for secrets management.

```bash
# Store a secret
copilot secret init \
  --name db-password \
  --values "dev=devpassword123,production=prodpassword456"

# The secret is available as an env var in your container
# Reference it in your manifest:
# secrets:
#   DB_PASSWORD: /copilot/${COPILOT_APPLICATION_NAME}/${COPILOT_ENVIRONMENT_NAME}/secrets/db-password
```

## Adding Storage

Copilot can provision storage resources like DynamoDB tables, S3 buckets, and RDS databases.

```bash
# Add a DynamoDB table
copilot storage init \
  --name users \
  --storage-type DynamoDB \
  --workload api \
  --partition-key userId:S \
  --sort-key createdAt:N

# Add an S3 bucket
copilot storage init \
  --name uploads \
  --storage-type S3 \
  --workload api

# Add an RDS Aurora Serverless cluster
copilot storage init \
  --name mydb \
  --storage-type Aurora \
  --workload api \
  --engine PostgreSQL
```

## Setting Up a Pipeline

Copilot can create a CI/CD pipeline that automatically deploys when you push to your repository.

```bash
# Initialize a pipeline
copilot pipeline init \
  --name main-pipeline \
  --url https://github.com/myorg/my-app.git \
  --branch main \
  --environments "dev,production"

# Deploy the pipeline
copilot pipeline deploy
```

This creates a CodePipeline that:
1. Watches your GitHub/CodeCommit repo
2. Builds your Docker image
3. Deploys to dev
4. Waits for manual approval
5. Deploys to production

The pipeline configuration lives in `copilot/pipeline.yml`.

```yaml
# copilot/pipeline.yml
name: main-pipeline
version: 1

source:
  provider: GitHub
  properties:
    branch: main
    repository: https://github.com/myorg/my-app

stages:
  - name: dev
    test_commands:
      - echo "Running integration tests"
      - make test-integration
  - name: production
    requires_approval: true
```

## Useful Commands

Copilot has a bunch of helpful operational commands.

```bash
# View service status
copilot svc status --name api --env dev

# View logs
copilot svc logs --name api --env dev --follow

# Open a shell in a running container
copilot svc exec --name api --env dev

# Show the service URL
copilot svc show --name api

# List all services
copilot svc ls

# View environment info
copilot env show --name dev

# Delete a service
copilot svc delete --name api

# Delete an entire application
copilot app delete
```

## When to Use Copilot vs. Terraform

Copilot is great when:
- You're starting a new project and want to move fast
- You don't have a dedicated platform team
- You want best-practice ECS architecture without deep AWS knowledge
- You need a CI/CD pipeline quickly

Terraform/CDK is better when:
- You need fine-grained control over every resource
- You have existing infrastructure to integrate with
- Your team already has Terraform expertise
- You need to manage non-ECS resources in the same codebase

Many teams start with Copilot and migrate to Terraform later if they outgrow it. The CloudFormation stacks Copilot creates are well-organized and can be a useful reference for your Terraform migration.

For monitoring the applications you deploy with Copilot, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) to set up proper observability alongside your deployment pipeline.
