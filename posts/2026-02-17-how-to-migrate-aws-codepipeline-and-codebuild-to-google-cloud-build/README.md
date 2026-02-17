# How to Migrate AWS CodePipeline and CodeBuild to Google Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Build, AWS CodePipeline, AWS CodeBuild, CI/CD, Cloud Migration

Description: A hands-on guide to migrating your CI/CD pipelines from AWS CodePipeline and CodeBuild to Google Cloud Build with practical configuration examples.

---

AWS CodePipeline handles orchestration while CodeBuild handles the actual build and test execution. Google Cloud Build combines both concerns into a single service. This simplification is actually one of the nicer things about migrating - you end up with one configuration file instead of managing two separate services.

This guide walks through converting your buildspec files and pipeline definitions into Cloud Build configurations.

## How the Services Map

Here is the conceptual mapping:

| AWS Concept | GCP Equivalent |
|------------|----------------|
| CodePipeline | Cloud Build triggers + build steps |
| CodeBuild project | Cloud Build configuration |
| buildspec.yml | cloudbuild.yaml |
| CodePipeline stages | Cloud Build steps (sequential or parallel) |
| CodePipeline artifacts | Cloud Build artifacts / GCS |
| CodeBuild environment | Cloud Build builder images |
| CodePipeline source stage | Cloud Build triggers (GitHub, Cloud Source Repos, etc.) |

## Step 1: Export Your Existing Configurations

Start by collecting your CodeBuild buildspec files and CodePipeline definitions.

```bash
# List all CodeBuild projects
aws codebuild list-projects --output table

# Export a CodeBuild project configuration
aws codebuild batch-get-projects \
  --names my-build-project \
  --query 'projects[0].{
    Name:name,
    Source:source,
    Environment:environment,
    BuildSpec:source.buildspec
  }'

# Export a CodePipeline definition
aws codepipeline get-pipeline \
  --name my-pipeline \
  --query 'pipeline' > pipeline-definition.json
```

## Step 2: Convert buildspec.yml to cloudbuild.yaml

A typical CodeBuild buildspec.yml looks like this:

```yaml
# AWS CodeBuild buildspec.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci
  pre_build:
    commands:
      - npm run lint
      - npm run test
  build:
    commands:
      - npm run build
      - docker build -t my-app:$CODEBUILD_RESOLVED_SOURCE_VERSION .
  post_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin 123456.dkr.ecr.us-east-1.amazonaws.com
      - docker push 123456.dkr.ecr.us-east-1.amazonaws.com/my-app:$CODEBUILD_RESOLVED_SOURCE_VERSION
artifacts:
  files:
    - build/**/*
```

The equivalent Cloud Build configuration:

```yaml
# Google Cloud Build cloudbuild.yaml
steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Run linting
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'lint']

  # Run tests
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'test']

  # Build the application
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA', '.']

  # Push Docker image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA']

# Store build artifacts in GCS
artifacts:
  objects:
    location: 'gs://${PROJECT_ID}_build_artifacts/'
    paths: ['build/**']

options:
  logging: CLOUD_LOGGING_ONLY
```

## Step 3: Map Environment Variables

CodeBuild provides built-in environment variables. Cloud Build has its own set:

| CodeBuild Variable | Cloud Build Variable |
|-------------------|---------------------|
| CODEBUILD_RESOLVED_SOURCE_VERSION | $COMMIT_SHA |
| CODEBUILD_BUILD_ID | $BUILD_ID |
| CODEBUILD_SOURCE_REPO_URL | $REPO_NAME |
| CODEBUILD_WEBHOOK_TRIGGER | $TRIGGER_NAME |
| CODEBUILD_SOURCE_VERSION | $BRANCH_NAME or $TAG_NAME |

For custom environment variables defined in your CodeBuild project, use substitutions in Cloud Build:

```yaml
# Using substitutions for custom variables
substitutions:
  _DEPLOY_ENV: 'staging'
  _API_URL: 'https://api.staging.example.com'

steps:
  - name: 'node:18'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Use substitution variables in build commands
        echo "Deploying to ${_DEPLOY_ENV}"
        DEPLOY_ENV=${_DEPLOY_ENV} API_URL=${_API_URL} npm run deploy
```

## Step 4: Convert Pipeline Stages

CodePipeline stages with multiple actions can be represented using Cloud Build steps with wait_for for parallelism.

```yaml
# Parallel steps in Cloud Build
# Equivalent to a CodePipeline stage with parallel actions
steps:
  # These two steps run in parallel (both wait for nothing specific)
  - name: 'node:18'
    id: 'unit-tests'
    entrypoint: 'npm'
    args: ['run', 'test:unit']
    waitFor: ['-']  # Start immediately, don't wait for previous steps

  - name: 'node:18'
    id: 'integration-tests'
    entrypoint: 'npm'
    args: ['run', 'test:integration']
    waitFor: ['-']  # Start immediately, run in parallel with unit tests

  # This step waits for both test steps to complete
  - name: 'node:18'
    id: 'build'
    entrypoint: 'npm'
    args: ['run', 'build']
    waitFor: ['unit-tests', 'integration-tests']
```

## Step 5: Handle Secrets

CodeBuild can pull secrets from AWS Secrets Manager. Cloud Build integrates with Google Secret Manager.

```yaml
# Access secrets in Cloud Build steps
steps:
  - name: 'node:18'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # The secret is mounted as a file, read it into an env var
        export DATABASE_URL=$$(cat /secrets/db-url)
        npm run migrate
    secretEnv: ['DATABASE_URL']

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/database-url/versions/latest
      env: 'DATABASE_URL'
```

## Step 6: Set Up Triggers

CodePipeline source stages watch for repository changes. Cloud Build triggers serve the same purpose.

```bash
# Create a trigger for GitHub pushes to main branch
gcloud builds triggers create github \
  --name=my-app-main \
  --repo-owner=my-org \
  --repo-name=my-app \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml

# Create a trigger for pull requests
gcloud builds triggers create github \
  --name=my-app-pr \
  --repo-owner=my-org \
  --repo-name=my-app \
  --pull-request-pattern="^main$" \
  --build-config=cloudbuild-pr.yaml \
  --comment-control=COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY

# Create a trigger for tags (release pipeline)
gcloud builds triggers create github \
  --name=my-app-release \
  --repo-owner=my-org \
  --repo-name=my-app \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config=cloudbuild-release.yaml
```

## Step 7: Convert Deployment Stages

If your CodePipeline includes CodeDeploy stages for deploying to EC2/ECS, convert those to Cloud Build steps that deploy to GKE or Cloud Run.

```yaml
# Deploy to Cloud Run (equivalent to ECS deployment stage)
steps:
  # Build and push the container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-app'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
```

For GKE deployments:

```yaml
# Deploy to GKE (equivalent to ECS/EKS deployment stage)
steps:
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$COMMIT_SHA'
      - '--location=us-central1'
      - '--cluster=my-cluster'
```

## Step 8: Handle Approval Gates

CodePipeline has manual approval actions. Cloud Build does not have a built-in approval step, but you can use Cloud Deploy for this:

```bash
# Set up Cloud Deploy for deployment pipelines with approvals
gcloud deploy delivery-pipelines create my-pipeline \
  --region=us-central1

# Cloud Deploy pipeline config supports approval requirements
# Define this in a delivery pipeline YAML
```

Alternatively, use a Pub/Sub-based approval workflow or integrate with your team's existing approval process through Cloud Build triggers that require manual invocation for production deployments.

## Comparing Build Times and Costs

Cloud Build offers machine type configuration that affects build speed:

```yaml
# Use a higher-spec machine for faster builds
options:
  machineType: 'E2_HIGHCPU_32'  # 32 vCPUs
  diskSizeGb: 200
```

Cloud Build gives you 120 free build-minutes per day on the default machine type. After that, pricing is per build-minute based on the machine type you select.

## Summary

Migrating from CodePipeline and CodeBuild to Cloud Build generally simplifies your CI/CD setup. You go from managing two services to one. The configuration format is different but the concepts translate directly - phases become steps, stages become parallel step groups, and source stages become triggers. The main gap is manual approval gates, which require Cloud Deploy or a custom solution. Start with your simplest pipeline, get it working in Cloud Build, then tackle the more involved ones.
