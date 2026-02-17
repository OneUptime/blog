# How to Use Custom Cloud Builders in Cloud Build for Specialized Build Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Custom Builders, Docker, CI/CD, Build Automation

Description: Learn how to create and use custom Cloud Builder images in Cloud Build to add specialized tools and capabilities to your CI/CD pipeline steps.

---

Cloud Build comes with a set of official builder images for common tasks like Docker builds, gcloud commands, and Git operations. But real projects need specialized tools - Terraform, Helm, custom CLI tools, language-specific toolchains, and more. Custom Cloud Builders let you package any tool into a Docker image and use it as a build step. In this post, I will show you how to create, build, and use custom builders in your Cloud Build pipelines.

## What Is a Cloud Builder?

A Cloud Builder is simply a Docker image that Cloud Build runs as a build step. When you write this in your cloudbuild.yaml:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '.']
```

Cloud Build pulls the `gcr.io/cloud-builders/docker` image and runs it with the provided args. The image's entrypoint receives the args as command-line arguments. There is nothing special about "official" builders - any Docker image can be a Cloud Builder.

## Using Existing Third-Party Builders

Before building your own, check if someone has already created what you need. There are several sources:

### Community Cloud Builders

Google maintains a repository of community builders at `gcr.io/cloud-builders/`. Some useful ones:

```yaml
# Some popular community and official builders
steps:
  # kubectl for Kubernetes operations
  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['apply', '-f', 'deployment.yaml']

  # gcloud SDK for any GCP operations
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args: ['gcloud', 'run', 'deploy', 'my-app']

  # Git for repository operations
  - name: 'gcr.io/cloud-builders/git'
    args: ['clone', 'https://github.com/my-org/my-repo.git']
```

### Public Docker Hub Images

Any public Docker image works as a builder:

```yaml
# Using standard Docker Hub images as builders
steps:
  # Node.js for running JavaScript builds and tests
  - name: 'node:20'
    args: ['npm', 'test']

  # Python for running scripts
  - name: 'python:3.12'
    args: ['python', 'setup.py', 'test']

  # Go for building Go applications
  - name: 'golang:1.22'
    args: ['go', 'build', '-o', '/workspace/app', '.']

  # Terraform for infrastructure deployment
  - name: 'hashicorp/terraform:1.7'
    args: ['apply', '-auto-approve']

  # Helm for Kubernetes package management
  - name: 'alpine/helm:3.14'
    args: ['upgrade', '--install', 'my-release', './chart']
```

## Creating Your Own Custom Builder

When no existing image has the tools you need, build your own.

### Example 1: A Builder with Multiple CLI Tools

Let's say your pipeline needs both the AWS CLI and the GCP SDK in the same step (for cross-cloud operations):

```dockerfile
# Dockerfile for a custom builder with both AWS and GCP CLIs
FROM gcr.io/google.com/cloudsdktool/cloud-sdk:slim

# Install AWS CLI
RUN apt-get update && apt-get install -y \
    python3-pip \
    unzip \
    && pip3 install awscli \
    && apt-get clean

# Install jq for JSON processing
RUN apt-get install -y jq

# Set gcloud as the default entrypoint
ENTRYPOINT ["bash"]
```

Build and push it to Artifact Registry:

```yaml
# cloudbuild.yaml for building the custom builder image
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'builders/multi-cloud/Dockerfile'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/multi-cloud:latest'
      - 'builders/multi-cloud'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/multi-cloud:latest'
```

Use it in your pipelines:

```yaml
# Using the custom multi-cloud builder
steps:
  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/multi-cloud:latest'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Copy data from AWS S3 to GCP Cloud Storage
        aws s3 cp s3://source-bucket/data.csv /tmp/data.csv
        gsutil cp /tmp/data.csv gs://destination-bucket/data.csv
```

### Example 2: A Database Migration Builder

For a team that needs to run database migrations in multiple pipelines:

```dockerfile
# Dockerfile for a database migration builder
FROM node:20-alpine

# Install database migration tools
RUN npm install -g prisma
RUN npm install -g knex

# Install database clients
RUN apk add --no-cache \
    postgresql-client \
    mysql-client

# Copy migration scripts
COPY scripts/ /scripts/

ENTRYPOINT ["bash"]
```

Use it in your deployment pipeline:

```yaml
# Run database migrations as a build step
steps:
  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/db-migration:latest'
    secretEnv: ['DB_URL']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run Prisma migrations against the target database
        export DATABASE_URL="$$DB_URL"
        npx prisma migrate deploy

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-url/versions/latest
      env: 'DB_URL'
```

### Example 3: A Notification Builder

A builder for sending deployment notifications to various channels:

```dockerfile
# Dockerfile for a notification builder
FROM python:3.12-slim

# Install notification libraries
RUN pip install \
    slack-sdk \
    requests \
    pagerduty-api

# Copy notification scripts
COPY notify.py /usr/local/bin/notify
RUN chmod +x /usr/local/bin/notify

ENTRYPOINT ["python", "/usr/local/bin/notify"]
```

The Python script handles multiple notification targets:

```python
# notify.py - Send notifications to various channels
import os
import sys
import json
from slack_sdk import WebClient

def send_slack(message, channel):
    """Send a notification to Slack"""
    client = WebClient(token=os.environ.get('SLACK_TOKEN'))
    client.chat_postMessage(channel=channel, text=message)

def send_webhook(message, url):
    """Send a notification to a generic webhook"""
    import requests
    requests.post(url, json={"text": message})

if __name__ == '__main__':
    target = sys.argv[1]  # slack, webhook, etc.
    message = sys.argv[2]

    if target == 'slack':
        send_slack(message, os.environ.get('SLACK_CHANNEL', '#deployments'))
    elif target == 'webhook':
        send_webhook(message, os.environ.get('WEBHOOK_URL'))
```

Use it as a notification step:

```yaml
# Send deployment notification using the custom builder
steps:
  # ... build and deploy steps ...

  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/notify:latest'
    secretEnv: ['SLACK_TOKEN']
    env:
      - 'SLACK_CHANNEL=#deployments'
    args:
      - 'slack'
      - 'Deployed $SHORT_SHA to production successfully'
```

## Managing Custom Builder Images

### Versioning

Tag your builder images with version numbers so pipelines reference a specific version:

```yaml
# Build the custom builder with both latest and version tags
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/my-builder:1.0.0'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/my-builder:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/my-builder:1.0.0'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/my-builder:latest'
```

In production pipelines, reference the version tag:

```yaml
# Use a specific version for reproducible builds
steps:
  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/my-builder:1.0.0'
    args: ['run-my-tool']
```

### Automating Builder Builds

Create a Cloud Build trigger for your builders repository so that builder images are automatically rebuilt when their Dockerfiles change:

```bash
# Trigger that rebuilds the custom builder on changes
gcloud builds triggers create github \
  --name="rebuild-custom-builders" \
  --repo-name="cloud-builders" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --included-files="builders/**"
```

## Overriding the Entrypoint

Sometimes you want to use a builder image but with a different command than its default entrypoint. Use the `entrypoint` field:

```yaml
# Override the entrypoint of a builder image
steps:
  # Run bash instead of the default node entrypoint
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        node --version
        npm --version
        npm ci && npm test

  # Run a specific binary from the Go image
  - name: 'golang:1.22'
    entrypoint: 'go'
    args: ['test', './...']
```

## Best Practices for Custom Builders

Keep builder images small. Every build step needs to pull the builder image if it is not cached. A 2 GB builder image adds pull time to every build. Use Alpine-based images and multi-stage builds to minimize size.

```dockerfile
# Use multi-stage build to keep the final image small
FROM golang:1.22 AS build
WORKDIR /src
COPY . .
RUN go build -o /tool ./cmd/tool

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /tool /usr/local/bin/tool
ENTRYPOINT ["tool"]
```

Pin dependency versions in your Dockerfiles. An `apt-get install curl` today might install a different version than next month. Pin versions where possible, or at least test your builder regularly.

Use a dedicated Artifact Registry repository for builders. This keeps them organized and lets you set different IAM policies (wider read access since many pipelines need to pull them).

Document what each builder contains and how to use it. A builder image without documentation becomes a black box that nobody wants to touch.

Test your builders. Include a simple smoke test in the builder's own build pipeline:

```yaml
# Build the custom builder and test it
steps:
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', 'my-builder:test', '.']

  # Smoke test the builder
  - name: 'my-builder:test'
    id: 'test'
    args: ['--version']

  # Push only if the test passes
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/builders/my-builder:latest']
```

## Wrapping Up

Custom Cloud Builders extend Cloud Build to handle any workflow you can containerize. The key insight is that a builder is just a Docker image with the tools your pipeline needs. Start by using standard Docker Hub images for common tools, build custom images when you need combinations of tools or custom scripts, and maintain them with the same CI/CD rigor you apply to your application code. A well-maintained library of custom builders becomes a shared asset that accelerates CI/CD across your entire organization.
