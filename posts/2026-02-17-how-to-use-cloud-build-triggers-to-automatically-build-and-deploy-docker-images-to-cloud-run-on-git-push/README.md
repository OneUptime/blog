# How to Use Cloud Build Triggers to Automatically Build and Deploy Docker Images to Cloud Run on Git Push

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Cloud Run, CI/CD, Docker, GitHub, Automation

Description: Learn how to set up Cloud Build triggers that automatically build Docker images and deploy them to Cloud Run whenever you push code to your Git repository.

---

Manual deployments are error-prone and slow. Every time you run `docker build`, `docker push`, and `gcloud run deploy` by hand, you are spending time on repetitive tasks and risking mistakes. Cloud Build triggers automate this entire pipeline. You push code to your Git repository, and within minutes, your application is built, tested, and deployed to Cloud Run.

This is the standard CI/CD workflow for Cloud Run, and it takes about 15 minutes to set up. Once configured, your deployments happen automatically on every push to your main branch.

## How Cloud Build Triggers Work

A Cloud Build trigger watches a Git repository for events - pushes to specific branches, tag creation, or pull request updates. When a matching event occurs, Cloud Build:

1. Clones your repository
2. Executes the steps defined in your `cloudbuild.yaml`
3. Reports the build status back to your Git provider

You define what happens in each step. For a Cloud Run deployment, the typical steps are: build the Docker image, push it to Artifact Registry, and deploy to Cloud Run.

## Prerequisites

You need:
- A GCP project with billing enabled
- A GitHub, GitLab, or Bitbucket repository
- Cloud Build and Cloud Run APIs enabled
- An Artifact Registry repository for Docker images

```bash
# Enable the required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create an Artifact Registry repository
gcloud artifacts repositories create my-repo \
    --repository-format=docker \
    --location=us-central1
```

## Setting Up the Cloud Build Configuration

Create a `cloudbuild.yaml` in the root of your repository.

```yaml
# cloudbuild.yaml - Build and deploy to Cloud Run on every push
steps:
  # Step 1: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:latest'
      - '.'

  # Step 2: Push the image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '$REPO_NAME'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=256Mi'
      - '--cpu=1'
      - '--port=8080'

# Push both tags to the registry
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:latest'

# Use a larger machine for faster builds
options:
  machineType: 'E2_HIGHCPU_8'
```

Cloud Build provides several built-in substitution variables:
- `$PROJECT_ID`: Your GCP project ID
- `$REPO_NAME`: The repository name
- `$SHORT_SHA`: The first 7 characters of the commit SHA
- `$COMMIT_SHA`: The full commit SHA
- `$BRANCH_NAME`: The branch name

## Granting Cloud Build Permissions

Cloud Build needs permission to deploy to Cloud Run.

```bash
# Get the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"

# Grant Service Account User role (needed to act as the Cloud Run service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

## Creating the Trigger

Connect your repository and create the trigger.

```bash
# For GitHub repositories
gcloud builds triggers create github \
    --name="deploy-to-cloud-run" \
    --repo-owner="my-github-org" \
    --repo-name="my-app" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --description="Build and deploy to Cloud Run on push to main"
```

For other Git providers:

```bash
# For Cloud Source Repositories
gcloud builds triggers create cloud-source-repositories \
    --name="deploy-to-cloud-run" \
    --repo="my-app" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

## A Complete Example Application

Here is a simple Node.js application to deploy.

```javascript
// index.js - Simple Express server
const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.json({
        message: 'Auto-deployed via Cloud Build triggers!',
        commit: process.env.COMMIT_SHA || 'unknown',
        deployedAt: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('ok');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
```

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
USER node
CMD ["node", "index.js"]
```

## Adding Tests to the Pipeline

A good CI/CD pipeline runs tests before deploying.

```yaml
# cloudbuild.yaml - With tests
steps:
  # Run tests first
  - name: 'node:20-alpine'
    id: 'test'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        npm ci
        npm test

  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
      - '.'

  # Push the image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '$REPO_NAME'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
```

If the tests fail, the build stops and the deployment never happens.

## Branch-Based Deployment Strategy

You can create different triggers for different branches.

```bash
# Trigger for main branch - deploys to production
gcloud builds triggers create github \
    --name="deploy-production" \
    --repo-owner="my-org" \
    --repo-name="my-app" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --substitutions="_ENVIRONMENT=production,_SERVICE_NAME=my-app"

# Trigger for develop branch - deploys to staging
gcloud builds triggers create github \
    --name="deploy-staging" \
    --repo-owner="my-org" \
    --repo-name="my-app" \
    --branch-pattern="^develop$" \
    --build-config="cloudbuild.yaml" \
    --substitutions="_ENVIRONMENT=staging,_SERVICE_NAME=my-app-staging"
```

Use the substitutions in your `cloudbuild.yaml`.

```yaml
# cloudbuild.yaml - With environment-specific deployment
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$_SERVICE_NAME:$SHORT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$_SERVICE_NAME:$SHORT_SHA']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '$_SERVICE_NAME'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$_SERVICE_NAME:$SHORT_SHA'
      - '--region=us-central1'
      - '--set-env-vars=ENVIRONMENT=$_ENVIRONMENT'

substitutions:
  _ENVIRONMENT: 'development'
  _SERVICE_NAME: 'my-app'
```

## Handling Secrets

Use Cloud Build's Secret Manager integration for sensitive values.

```yaml
# cloudbuild.yaml - With secrets
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NPM_TOKEN=$$NPM_TOKEN'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
      - '.'
    secretEnv:
      - 'NPM_TOKEN'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '$REPO_NAME'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$REPO_NAME:$SHORT_SHA'
      - '--region=us-central1'
      - '--set-env-vars=DATABASE_URL=$$DATABASE_URL'
    secretEnv:
      - 'DATABASE_URL'

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/npm-token/versions/latest
      env: 'NPM_TOKEN'
    - versionName: projects/$PROJECT_ID/secrets/database-url/versions/latest
      env: 'DATABASE_URL'
```

## Monitoring Build Status

Check build status from the command line.

```bash
# List recent builds
gcloud builds list --limit=5

# View a specific build
gcloud builds describe BUILD_ID

# Stream build logs
gcloud builds log BUILD_ID --stream
```

## Wrapping Up

Cloud Build triggers give you a fully automated deployment pipeline from Git push to Cloud Run deployment. The setup takes minutes, and once configured, every commit to your main branch is automatically built, tested, and deployed. With branch-based triggers, you can manage multiple environments, and Secret Manager integration keeps sensitive values out of your code. This is the foundation of a solid CI/CD practice on GCP.
