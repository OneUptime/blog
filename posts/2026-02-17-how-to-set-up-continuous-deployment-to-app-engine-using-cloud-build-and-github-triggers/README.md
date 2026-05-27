# How to Set Up Continuous Deployment to App Engine Using Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Cloud Build, CI/CD, GitHub

Description: Set up automated deployments to App Engine triggered by GitHub pushes using Cloud Build for a complete continuous deployment pipeline.

---

Manually running `gcloud app deploy` every time you want to ship a change gets old fast. Cloud Build integrates with GitHub to automatically deploy your application to App Engine whenever you push to a specific branch. This gives you a proper CI/CD pipeline - push to main, tests run, and if everything passes, your app deploys automatically.

In this guide, I will walk through connecting your GitHub repository to Cloud Build, writing the build configuration, and setting up triggers for automatic deployments.

## Prerequisites

Before starting:

- An App Engine application already deployed (at least once manually)
- Your code in a GitHub repository
- The Cloud Build API enabled on your project

```bash
# Enable Cloud Build API

gcloud services enable cloudbuild.googleapis.com --project=your-project-id
```

## Step 1: Connect GitHub to Cloud Build

Connect your GitHub repository to Cloud Build through the Cloud Console:

1. Go to Cloud Build in the Cloud Console
2. Click "Triggers" in the left sidebar
3. Click "Connect Repository"
4. Select "GitHub (Cloud Build GitHub App)"
5. Authenticate with GitHub and select your repository

You can also use the gcloud CLI after you create the deployment service account in the next step:

```bash
# Install the GitHub app (this will open a browser for GitHub auth)
gcloud builds triggers create github \
  --repo-name=your-repo \
  --repo-owner=your-github-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --service-account=projects/your-project-id/serviceAccounts/app-engine-deployer@your-project-id.iam.gserviceaccount.com \
  --project=your-project-id
```

## Step 2: Grant Cloud Build Permissions

Cloud Build needs permission to deploy to App Engine. Create a dedicated service account for the trigger and grant it the roles needed to deploy, write build logs, and use the App Engine service account:

```bash
# Create a service account for App Engine deployments
gcloud iam service-accounts create app-engine-deployer \
  --display-name="App Engine Cloud Build deployer" \
  --project=your-project-id

CLOUD_BUILD_SA="app-engine-deployer@your-project-id.iam.gserviceaccount.com"
APP_ENGINE_SA="your-project-id@appspot.gserviceaccount.com"

# Grant App Engine Admin role
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/appengine.appAdmin"

# Grant Service Account User role on the App Engine service account
gcloud iam service-accounts add-iam-policy-binding "${APP_ENGINE_SA}" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project=your-project-id

# Grant roles needed by the build itself
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"
```

If your app uses Cloud SQL, add that permission too:

```bash
# Grant Cloud SQL Client role if needed
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/cloudsql.client"
```

## Step 3: Create the Cloud Build Configuration

The `cloudbuild.yaml` file defines the build and deployment steps. Place it in the root of your repository.

Here is a configuration for a Python App Engine Standard application:

```yaml
# cloudbuild.yaml - Build and deploy to App Engine Standard
steps:
  # Step 1: Install dependencies and run tests
  - name: "python:3.12"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        pip install -r requirements.txt
        python -m pytest tests/ -v --tb=short
    env:
      - "APP_ENV=testing"

  # Step 2: Deploy to App Engine
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args:
      - "app"
      - "deploy"
      - "app.yaml"
      - "--project=$PROJECT_ID"
      - "--quiet"           # Skip confirmation prompt
      - "--no-promote"      # Deploy without routing traffic (optional)

# Build timeout (default is 10 minutes)
timeout: "1200s"
options:
  logging: CLOUD_LOGGING_ONLY
```

For a Node.js application:

```yaml
# cloudbuild.yaml - Build and deploy Node.js App Engine app
steps:
  # Step 1: Install dependencies
  - name: "node:20"
    entrypoint: "npm"
    args: ["ci"]

  # Step 2: Run linter
  - name: "node:20"
    entrypoint: "npm"
    args: ["run", "lint"]

  # Step 3: Run tests
  - name: "node:20"
    entrypoint: "npm"
    args: ["test"]
    env:
      - "NODE_ENV=test"

  # Step 4: Deploy to App Engine
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args:
      - "app"
      - "deploy"
      - "app.yaml"
      - "--project=$PROJECT_ID"
      - "--quiet"

timeout: "1200s"
options:
  logging: CLOUD_LOGGING_ONLY
```

## Step 4: Create Build Triggers

Create a trigger that fires on pushes to the main branch:

```bash
# Create a trigger for the main branch
gcloud builds triggers create github \
  --name="deploy-to-production" \
  --repo-name=your-repo \
  --repo-owner=your-github-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --service-account=projects/your-project-id/serviceAccounts/app-engine-deployer@your-project-id.iam.gserviceaccount.com \
  --project=your-project-id
```

Create a separate trigger for staging that deploys on pushes to the develop branch:

```bash
# Create a trigger for the staging environment
gcloud builds triggers create github \
  --name="deploy-to-staging" \
  --repo-name=your-repo \
  --repo-owner=your-github-org \
  --branch-pattern="^develop$" \
  --build-config=cloudbuild-staging.yaml \
  --service-account=projects/your-staging-project-id/serviceAccounts/app-engine-deployer@your-staging-project-id.iam.gserviceaccount.com \
  --project=your-staging-project-id
```

## Step 5: Environment-Specific Configurations

For different environments, use substitution variables in your Cloud Build config:

```yaml
# cloudbuild.yaml - Using substitution variables
steps:
  - name: "python:3.12"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        pip install -r requirements.txt
        python -m pytest tests/ -v

  # Deploy using environment-specific app.yaml
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args:
      - "app"
      - "deploy"
      - "${_APP_YAML}"
      - "--project=$PROJECT_ID"
      - "--quiet"
      - "--version=${_VERSION}"

substitutions:
  _APP_YAML: "app.yaml"
  _VERSION: "latest"

timeout: "1200s"
options:
  logging: CLOUD_LOGGING_ONLY
```

Override substitutions in the trigger:

```bash
# Production trigger with specific substitutions
gcloud builds triggers create github \
  --name="deploy-production" \
  --repo-name=your-repo \
  --repo-owner=your-github-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --substitutions="_APP_YAML=app-production.yaml,_VERSION=prod" \
  --service-account=projects/your-project-id/serviceAccounts/app-engine-deployer@your-project-id.iam.gserviceaccount.com \
  --project=your-project-id
```

## Canary Deployments

For safer production deployments, use a canary strategy that deploys without routing traffic, then gradually shifts traffic:

```yaml
# cloudbuild.yaml - Canary deployment strategy
steps:
  # Install dependencies and run tests
  - name: "python:3.12"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        pip install -r requirements.txt
        python -m pytest tests/ -v

  # Deploy new version without routing traffic
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args:
      - "app"
      - "deploy"
      - "app.yaml"
      - "--project=$PROJECT_ID"
      - "--quiet"
      - "--no-promote"
      - "--version=canary"

  # Send 10% of traffic to the canary
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args:
      - "app"
      - "services"
      - "set-traffic"
      - "default"
      - "--splits=stable-version=0.9,canary=0.1"
      - "--split-by=random"
      - "--project=$PROJECT_ID"
      - "--quiet"

timeout: "1800s"
options:
  logging: CLOUD_LOGGING_ONLY
```

Replace `stable-version` with the currently serving production version. After monitoring the canary, promote it to full traffic manually or with a second trigger.

## Handling Deployment Failures

Configure Cloud Build logging and build options:

```yaml
# cloudbuild.yaml - With failure handling
steps:
  - name: "python:3.12"
    entrypoint: "python"
    args: ["-m", "pytest", "tests/", "-v"]

  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args: ["app", "deploy", "app.yaml", "--project=$PROJECT_ID", "--quiet"]

# Configure build options
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: "E2_HIGHCPU_8"  # Faster builds
```

Set up notifications for build results:

```bash
# Create a Pub/Sub topic for build notifications
gcloud pubsub topics create cloud-builds --project=your-project-id

# Cloud Build automatically publishes to this topic
# Set up a subscription to forward to Slack, email, etc.
```

## Deploying Multiple Services

If your app has multiple App Engine services, deploy them in a single build:

```yaml
# cloudbuild.yaml - Deploy multiple services
steps:
  # Test frontend
  - name: "node:20"
    dir: "frontend"
    entrypoint: "npm"
    args: ["test"]

  # Test API
  - name: "python:3.12"
    dir: "api"
    entrypoint: "python"
    args: ["-m", "pytest"]

  # Deploy frontend service
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args: ["app", "deploy", "frontend/app.yaml", "--project=$PROJECT_ID", "--quiet"]

  # Deploy API service
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args: ["app", "deploy", "api/app.yaml", "--project=$PROJECT_ID", "--quiet"]

  # Deploy dispatch rules
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: "gcloud"
    args: ["app", "deploy", "dispatch.yaml", "--project=$PROJECT_ID", "--quiet"]

timeout: "1800s"
options:
  logging: CLOUD_LOGGING_ONLY
```

## Monitoring Build History

Track your deployment history:

```bash
# List recent builds
gcloud builds list --limit=10 --project=your-project-id

# View a specific build
gcloud builds describe BUILD_ID --project=your-project-id

# Stream build logs in real time
gcloud builds log BUILD_ID --stream --project=your-project-id
```

## Summary

Cloud Build with GitHub triggers gives you automatic deployments to App Engine on every push. The setup involves connecting your GitHub repo, granting the right IAM permissions to the trigger service account, writing a `cloudbuild.yaml` that tests and deploys your code, and creating triggers for your branches. For production, consider canary deployments with `--no-promote` to validate new versions before routing full traffic. The entire setup takes about 30 minutes and saves you from manual deployments forever.
