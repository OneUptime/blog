# How to Deploy Cloud Functions Using Cloud Build CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Cloud Functions, CI/CD, Serverless, Deployment

Description: Learn how to set up Cloud Build CI/CD pipelines that automatically test and deploy Cloud Functions when you push code to your repository.

---

Cloud Functions is Google's serverless compute platform for event-driven functions. While you can deploy functions manually with `gcloud functions deploy`, a proper CI/CD pipeline automates this process and adds testing, validation, and environment management. In this post, I will show you how to use Cloud Build to automatically test and deploy Cloud Functions on every code push.

## Why Use Cloud Build for Cloud Functions?

You might wonder why you need a CI/CD pipeline for a "simple" function. Here are the reasons:

- **Consistency** - Every deployment follows the same process, reducing human error
- **Testing** - Run unit tests and integration tests before deployment
- **Multi-environment** - Deploy to dev, staging, and production with the same pipeline
- **Audit trail** - Every deployment is recorded in Cloud Build history
- **Rollback** - You can redeploy any previous version by re-running a build

## Prerequisites

Make sure you have the following set up:

```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudfunctions.googleapis.com

# Grant Cloud Build permission to deploy Cloud Functions
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/cloudfunctions.developer"

# Cloud Build needs to act as the function's runtime service account
gcloud iam service-accounts add-iam-policy-binding \
  "${PROJECT_ID}@appspot.gserviceaccount.com" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"
```

## Project Structure

A typical Cloud Functions project looks like this:

```
my-function/
  index.js          # Function code
  package.json      # Dependencies and scripts
  test/
    index.test.js   # Unit tests
  cloudbuild.yaml   # Build configuration
  .gcloudignore     # Files to exclude from deployment
```

Here is a simple HTTP function:

```javascript
// index.js - A simple HTTP Cloud Function
const functions = require('@google-cloud/functions-framework');

functions.http('helloWorld', (req, res) => {
  const name = req.query.name || req.body.name || 'World';
  res.send(`Hello, ${name}!`);
});
```

And the package.json:

```json
{
  "name": "my-function",
  "version": "1.0.0",
  "scripts": {
    "test": "mocha test/*.test.js",
    "lint": "eslint ."
  },
  "dependencies": {
    "@google-cloud/functions-framework": "^3.0.0"
  },
  "devDependencies": {
    "mocha": "^10.0.0",
    "supertest": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

## Basic Cloud Build Pipeline for Cloud Functions

The simplest pipeline that tests and deploys a Cloud Function:

```yaml
# cloudbuild.yaml - Test and deploy a Cloud Function
steps:
  # Step 1: Install dependencies
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  # Step 2: Run linting
  - name: 'node:20'
    id: 'lint'
    args: ['npm', 'run', 'lint']

  # Step 3: Run tests
  - name: 'node:20'
    id: 'test'
    args: ['npm', 'test']

  # Step 4: Deploy the function
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'hello-world'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'helloWorld'
      - '--trigger-http'
      - '--allow-unauthenticated'

timeout: 600s
```

## Deploying Cloud Functions (2nd Gen)

Cloud Functions 2nd generation is built on Cloud Run and offers more features. The deployment command is slightly different:

```yaml
# Deploy a 2nd gen Cloud Function with full configuration
steps:
  - name: 'node:20'
    args: ['npm', 'ci']

  - name: 'node:20'
    args: ['npm', 'test']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'process-orders'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'processOrders'
      - '--trigger-http'
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--timeout'
      - '120'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '50'
      - '--set-env-vars'
      - 'NODE_ENV=production,LOG_LEVEL=info'
```

## Deploying Event-Triggered Functions

For functions triggered by Pub/Sub, Cloud Storage, or Firestore events:

### Pub/Sub Triggered Function

```yaml
# Deploy a Pub/Sub triggered function
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'process-messages'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'processMessage'
      - '--trigger-topic'
      - 'my-topic'
      - '--retry'
```

### Cloud Storage Triggered Function

```yaml
# Deploy a function triggered by Cloud Storage events
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'process-uploads'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'processUpload'
      - '--trigger-event-filters'
      - 'type=google.cloud.storage.object.v1.finalized'
      - '--trigger-event-filters'
      - 'bucket=my-upload-bucket'
```

## Multi-Function Deployment

If your repository contains multiple functions, deploy them all in one pipeline:

```yaml
# Deploy multiple functions from a single repository
steps:
  # Install and test everything
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'test'
    args: ['npm', 'test']

  # Deploy the API function
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-api'
    waitFor: ['test']
    dir: 'functions/api'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'api'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'api'
      - '--trigger-http'

  # Deploy the worker function (in parallel with API)
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-worker'
    waitFor: ['test']
    dir: 'functions/worker'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'worker'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'processJob'
      - '--trigger-topic'
      - 'job-queue'

  # Deploy the webhook handler (in parallel)
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-webhook'
    waitFor: ['test']
    dir: 'functions/webhook'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'webhook'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'handleWebhook'
      - '--trigger-http'
```

The three deploy steps run in parallel since they all depend only on the test step.

## Multi-Environment Deployment

Use substitution variables for environment-specific configuration:

```yaml
# Environment-aware function deployment
steps:
  - name: 'node:20'
    args: ['npm', 'ci']

  - name: 'node:20'
    args: ['npm', 'test']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'my-function-$_ENV'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - '$_REGION'
      - '--source'
      - '.'
      - '--entry-point'
      - 'main'
      - '--trigger-http'
      - '--min-instances'
      - '$_MIN_INSTANCES'
      - '--max-instances'
      - '$_MAX_INSTANCES'
      - '--set-env-vars'
      - 'NODE_ENV=$_ENV,LOG_LEVEL=$_LOG_LEVEL'

substitutions:
  _ENV: 'development'
  _REGION: 'us-central1'
  _MIN_INSTANCES: '0'
  _MAX_INSTANCES: '10'
  _LOG_LEVEL: 'debug'
```

Create environment-specific triggers:

```bash
# Dev trigger
gcloud builds triggers create github \
  --name="deploy-function-dev" \
  --repo-name="my-functions" \
  --repo-owner="my-org" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_ENV=dev,_MIN_INSTANCES=0,_MAX_INSTANCES=5,_LOG_LEVEL=debug"

# Production trigger
gcloud builds triggers create github \
  --name="deploy-function-prod" \
  --repo-name="my-functions" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_ENV=prod,_MIN_INSTANCES=1,_MAX_INSTANCES=100,_LOG_LEVEL=info" \
  --require-approval
```

## Using Secrets in Cloud Functions

If your function needs secrets, reference them from Secret Manager in the deploy command:

```yaml
# Deploy with secrets from Secret Manager
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'functions'
      - 'deploy'
      - 'my-function'
      - '--gen2'
      - '--runtime'
      - 'nodejs20'
      - '--region'
      - 'us-central1'
      - '--source'
      - '.'
      - '--entry-point'
      - 'main'
      - '--trigger-http'
      - '--set-secrets'
      - 'DB_PASSWORD=db-password:latest,API_KEY=api-key:latest'
```

This mounts the secrets as environment variables in the function's runtime environment, not in the build environment.

## Post-Deployment Verification

Add a verification step to confirm the function deployed correctly:

```yaml
  # Verify the function is responding
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'verify'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get the function URL
        URL=$(gcloud functions describe my-function --gen2 --region=us-central1 --format='value(serviceConfig.uri)')
        echo "Function URL: $$URL"

        # Test the function
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$$URL")
        if [ "$$RESPONSE" = "200" ]; then
          echo "Function is healthy"
        else
          echo "Function returned status $$RESPONSE"
          exit 1
        fi
```

## Wrapping Up

Deploying Cloud Functions through Cloud Build gives you the same CI/CD rigor that you would apply to any other application. The pipeline is straightforward - install dependencies, run tests, deploy. The real value comes from the consistency and automation: every deployment is tested, every change is tracked, and you can deploy to multiple environments with a single configuration file. Start with a simple test-and-deploy pipeline, add environment management as you grow, and you will have a production-grade serverless deployment workflow in no time.
