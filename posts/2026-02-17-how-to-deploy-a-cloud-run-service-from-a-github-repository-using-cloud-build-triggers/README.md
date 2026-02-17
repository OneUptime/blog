# How to Deploy a Cloud Run Service from a GitHub Repository Using Cloud Build Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Cloud Build, GitHub, CI/CD, Google Cloud

Description: Learn how to set up Cloud Build triggers to automatically build and deploy your Cloud Run service whenever you push changes to your GitHub repository.

---

Manual deployments get old fast. Every time you push code, you have to build the image, push it to a registry, and update the Cloud Run service. Cloud Build triggers automate all of that. Push to your GitHub repo, and Cloud Build takes care of building the container and deploying it to Cloud Run.

This guide walks through the complete setup from connecting your GitHub repo to having a fully automated deployment pipeline.

## Prerequisites

You will need:

- A GCP project with billing enabled
- A GitHub repository with a Dockerfile
- The gcloud CLI installed and configured
- Owner or Editor role on the GCP project

Enable the required APIs:

```bash
# Enable Cloud Build, Cloud Run, and Artifact Registry APIs
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

## Step 1: Connect Your GitHub Repository

First, connect your GitHub account to Cloud Build. This creates a connection that allows Cloud Build to receive webhook events from GitHub.

```bash
# Create a Cloud Build connection to GitHub
gcloud builds connections create github my-github-connection \
  --region=us-central1
```

This command will output a URL. Open it in your browser to authorize Cloud Build to access your GitHub repositories. You will need to install the Google Cloud Build GitHub app and grant it access to the repositories you want to use.

After authorization, link the specific repository:

```bash
# Link your GitHub repository to the connection
gcloud builds repositories create my-repo-link \
  --remote-uri=https://github.com/YOUR_USERNAME/YOUR_REPO.git \
  --connection=my-github-connection \
  --region=us-central1
```

## Step 2: Create an Artifact Registry Repository

You need somewhere to store the built container images:

```bash
# Create a Docker repository in Artifact Registry
gcloud artifacts repositories create cloud-run-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Container images for Cloud Run services"
```

## Step 3: Set Up IAM Permissions

Cloud Build needs permission to deploy to Cloud Run. Grant the Cloud Build service account the necessary roles:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) \
  --format='value(projectNumber)')

# Grant Cloud Run Admin role to the Cloud Build service account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role so Cloud Build can act as the runtime service account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Step 4: Write the Cloud Build Configuration

Create a `cloudbuild.yaml` in the root of your repository. This file defines the build and deploy steps:

```yaml
# cloudbuild.yaml - Build container and deploy to Cloud Run
steps:
  # Step 1: Build the Docker image
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "build"
      - "-t"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/my-app:$COMMIT_SHA"
      - "-t"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/my-app:latest"
      - "."

  # Step 2: Push the image to Artifact Registry
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "push"
      - "--all-tags"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/my-app"

  # Step 3: Deploy to Cloud Run
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - "run"
      - "deploy"
      - "my-app"
      - "--image"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/my-app:$COMMIT_SHA"
      - "--region"
      - "us-central1"
      - "--platform"
      - "managed"
      - "--allow-unauthenticated"

# Store the built images in Artifact Registry
images:
  - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/my-app:$COMMIT_SHA"
  - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/my-app:latest"

# Build options
options:
  logging: CLOUD_LOGGING_ONLY
```

A few things to notice here. The `$COMMIT_SHA` substitution variable is automatically provided by Cloud Build and gives you a unique tag for each build. The `$PROJECT_ID` variable is also automatic. Tagging with both the commit SHA and `latest` means you always have a traceable image and a convenient latest pointer.

## Step 5: Create the Build Trigger

Now create the trigger that fires when you push to the main branch:

```bash
# Create a trigger that deploys on push to main
gcloud builds triggers create github \
  --name="deploy-to-cloud-run" \
  --repository="projects/$(gcloud config get-value project)/locations/us-central1/connections/my-github-connection/repositories/my-repo-link" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region=us-central1
```

This trigger watches the `main` branch. Every push to main fires the build. If you want to trigger on pull requests instead (for staging environments), change the pattern:

```bash
# Trigger on pull requests for a staging deployment
gcloud builds triggers create github \
  --name="deploy-staging" \
  --repository="projects/$(gcloud config get-value project)/locations/us-central1/connections/my-github-connection/repositories/my-repo-link" \
  --pull-request-pattern="^main$" \
  --build-config="cloudbuild-staging.yaml" \
  --region=us-central1
```

## Step 6: Test the Pipeline

Push a change to your repository and watch the build:

```bash
# Make a change and push
git add .
git commit -m "Test Cloud Build trigger"
git push origin main
```

Monitor the build progress:

```bash
# List recent builds
gcloud builds list --limit=5 --region=us-central1

# Stream logs from the latest build
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)' --region=us-central1) \
  --region=us-central1 \
  --stream
```

## Advanced: Using Substitution Variables

You can parameterize your builds with substitution variables. This is useful for deploying the same code to different environments:

```yaml
# cloudbuild.yaml with substitution variables
steps:
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "build"
      - "-t"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/${_SERVICE_NAME}:$COMMIT_SHA"
      - "."

  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - "run"
      - "deploy"
      - "${_SERVICE_NAME}"
      - "--image"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-images/${_SERVICE_NAME}:$COMMIT_SHA"
      - "--region"
      - "${_DEPLOY_REGION}"
      - "--platform"
      - "managed"

# Default values for substitution variables
substitutions:
  _SERVICE_NAME: my-app
  _DEPLOY_REGION: us-central1
```

Override the defaults in your trigger:

```bash
# Create trigger with custom substitution values
gcloud builds triggers create github \
  --name="deploy-production" \
  --repository="projects/$(gcloud config get-value project)/locations/us-central1/connections/my-github-connection/repositories/my-repo-link" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_SERVICE_NAME=my-app-prod,_DEPLOY_REGION=us-east1" \
  --region=us-central1
```

## Adding Build Notifications

Set up Pub/Sub notifications so you know when builds succeed or fail:

```bash
# Create a Pub/Sub topic for build notifications
gcloud pubsub topics create cloud-build-notifications

# Cloud Build automatically publishes to cloud-builds topic
# You can create a subscription to receive these events
gcloud pubsub subscriptions create build-alerts \
  --topic=cloud-builds
```

You can then connect this to Cloud Functions or a Slack webhook to get real-time notifications about your deployments.

## Handling Build Failures

When a build fails, Cloud Build will not deploy the broken image to Cloud Run. Your existing deployment stays running. To debug failures:

```bash
# View the build log for a specific build
gcloud builds describe BUILD_ID --region=us-central1

# View the full log output
gcloud builds log BUILD_ID --region=us-central1
```

Common failure reasons include:

- Dockerfile syntax errors or missing dependencies
- Tests failing in a build step
- Insufficient IAM permissions for deployment
- Artifact Registry quota limits

## Rollback Strategy

Since each deployment is tagged with the commit SHA, rolling back is straightforward:

```bash
# Deploy a previous version by specifying the commit SHA
gcloud run deploy my-app \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/cloud-run-images/my-app:PREVIOUS_COMMIT_SHA \
  --region=us-central1
```

You can also use Cloud Run's traffic management to gradually shift traffic between revisions, which is safer than a hard cutover.

## Summary

Cloud Build triggers give you a clean, automated path from GitHub push to Cloud Run deployment. The setup involves connecting your repo, writing a build config, creating a trigger, and setting up IAM permissions. Once it is running, every push to your target branch automatically builds, tests, and deploys your service. Combine this with substitution variables and multiple triggers to handle staging and production environments from the same repository.
