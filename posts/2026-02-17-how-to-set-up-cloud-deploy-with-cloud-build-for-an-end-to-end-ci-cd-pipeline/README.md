# How to Set Up Cloud Deploy with Cloud Build for an End-to-End CI/CD Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Cloud Build, CI/CD, DevOps

Description: Build a complete CI/CD pipeline by integrating Google Cloud Build for continuous integration with Cloud Deploy for continuous delivery to GKE or Cloud Run.

---

Cloud Build handles the CI part - building, testing, and packaging your code. Cloud Deploy handles the CD part - deploying your application through multiple environments in a controlled, auditable way. Together they form a complete CI/CD pipeline that takes you from code commit to production deployment. In this guide, I will show you how to wire them together.

## The Overall Architecture

The flow looks like this:

1. Developer pushes code to a Git repository
2. Cloud Build trigger fires, building and testing the application
3. Cloud Build pushes the container image to Artifact Registry
4. Cloud Build creates a Cloud Deploy release
5. Cloud Deploy deploys to dev automatically
6. Releases are promoted through staging and production

Each piece handles what it is good at. Cloud Build focuses on building artifacts. Cloud Deploy focuses on deploying them safely.

## Prerequisites

You need the following APIs enabled in your project.

```bash
# Enable all required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  clouddeploy.googleapis.com \
  artifactregistry.googleapis.com \
  container.googleapis.com
```

You also need an Artifact Registry repository for your container images and GKE clusters (or Cloud Run services) as deployment targets.

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create my-app-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Application container images"
```

## Setting Up Cloud Deploy Resources

First, define your targets and pipeline. I will use a three-environment setup.

```yaml
# deploy/targets.yaml - Dev, staging, and production targets
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: dev
description: Development cluster
gke:
  cluster: projects/my-project/locations/us-central1/clusters/dev-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: staging
description: Staging cluster
gke:
  cluster: projects/my-project/locations/us-central1/clusters/staging-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
description: Production cluster
requireApproval: true
gke:
  cluster: projects/my-project/locations/us-central1/clusters/prod-cluster
```

```yaml
# deploy/pipeline.yaml - Delivery pipeline definition
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
description: CI/CD pipeline for my application
serialPipeline:
  stages:
  - targetId: dev
    profiles:
    - dev
  - targetId: staging
    profiles:
    - staging
    strategy:
      standard:
        verify: true
  - targetId: prod
    profiles:
    - prod
    strategy:
      standard:
        verify: true
```

Apply both configurations.

```bash
# Register targets and pipeline
gcloud deploy apply --file=deploy/targets.yaml --region=us-central1
gcloud deploy apply --file=deploy/pipeline.yaml --region=us-central1
```

## Creating the Skaffold Configuration

Cloud Deploy uses Skaffold to render and deploy your manifests. Create a Skaffold config with profiles for each environment.

```yaml
# skaffold.yaml - Skaffold config with environment profiles
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-app
profiles:
- name: dev
  manifests:
    rawYaml:
    - k8s/base/*.yaml
    - k8s/overlays/dev/*.yaml
- name: staging
  manifests:
    rawYaml:
    - k8s/base/*.yaml
    - k8s/overlays/staging/*.yaml
- name: prod
  manifests:
    rawYaml:
    - k8s/base/*.yaml
    - k8s/overlays/prod/*.yaml
deploy:
  kubectl: {}
verify:
- name: smoke-test
  container:
    name: smoke-test
    image: us-central1-docker.pkg.dev/my-project/my-app-repo/smoke-tests:latest
    command: ["sh", "-c", "/test.sh"]
  timeout: 300s
```

## Writing the Cloud Build Configuration

The Cloud Build configuration is where CI meets CD. It builds your image, runs tests, and then creates a Cloud Deploy release.

```yaml
# cloudbuild.yaml - Complete CI/CD pipeline configuration
steps:
# Step 1: Run unit tests
- name: 'node:18'
  id: 'unit-tests'
  entrypoint: 'npm'
  args: ['test']

# Step 2: Build the container image
- name: 'gcr.io/cloud-builders/docker'
  id: 'build-image'
  args:
  - 'build'
  - '-t'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app:$SHORT_SHA'
  - '-t'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app:latest'
  - '.'
  waitFor: ['unit-tests']

# Step 3: Push the image to Artifact Registry
- name: 'gcr.io/cloud-builders/docker'
  id: 'push-image'
  args:
  - 'push'
  - '--all-tags'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app'
  waitFor: ['build-image']

# Step 4: Run integration tests against the built image
- name: 'gcr.io/cloud-builders/docker'
  id: 'integration-tests'
  args:
  - 'run'
  - '--rm'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app:$SHORT_SHA'
  - 'npm'
  - 'run'
  - 'test:integration'
  waitFor: ['push-image']

# Step 5: Create a Cloud Deploy release
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'create-release'
  entrypoint: 'gcloud'
  args:
  - 'deploy'
  - 'releases'
  - 'create'
  - 'rel-$SHORT_SHA'
  - '--delivery-pipeline=my-app-pipeline'
  - '--region=us-central1'
  - '--source=.'
  - '--images=my-app=us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app:$SHORT_SHA'
  - '--annotations=commit-sha=$COMMIT_SHA,build-id=$BUILD_ID'
  waitFor: ['integration-tests']

# Store images in Artifact Registry
images:
- 'us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app:$SHORT_SHA'
- 'us-central1-docker.pkg.dev/$PROJECT_ID/my-app-repo/my-app:latest'

options:
  logging: CLOUD_LOGGING_ONLY
```

## Setting Up the Cloud Build Trigger

Create a trigger that runs this pipeline whenever code is pushed to the main branch.

```bash
# Create a Cloud Build trigger for the main branch
gcloud builds triggers create github \
  --name=my-app-ci-cd \
  --repo-owner=my-org \
  --repo-name=my-app \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --description="Build, test, and create Cloud Deploy release"
```

For pull requests, you might want a separate trigger that only builds and tests without creating a release.

```bash
# Create a trigger for pull requests (build and test only)
gcloud builds triggers create github \
  --name=my-app-pr-check \
  --repo-owner=my-org \
  --repo-name=my-app \
  --pull-request-pattern="^main$" \
  --build-config=cloudbuild-pr.yaml \
  --description="Build and test for pull requests"
```

## Configuring IAM Permissions

Cloud Build needs permission to create Cloud Deploy releases, and Cloud Deploy needs permission to deploy to your clusters.

```bash
# Get the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Deploy releaser role to Cloud Build SA
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:$CB_SA" \
  --role="roles/clouddeploy.releaser"

# Grant act-as permission for the execution service account
gcloud iam service-accounts add-iam-policy-binding \
  deploy-sa@my-project.iam.gserviceaccount.com \
  --member="serviceAccount:$CB_SA" \
  --role="roles/iam.serviceAccountUser"
```

## The Complete Workflow

Here is what happens end to end when a developer merges a pull request:

1. Code merge triggers Cloud Build
2. Cloud Build runs unit tests
3. Cloud Build builds and pushes the container image
4. Cloud Build runs integration tests against the image
5. Cloud Build creates a Cloud Deploy release
6. Cloud Deploy automatically deploys to dev
7. After dev succeeds, you promote to staging (manual or automatic)
8. Staging runs verification tests
9. You promote to production (manual approval required)
10. Production runs verification tests
11. The release is fully deployed

The entire process is tracked and auditable. You can see which commit triggered which build, which build created which release, and which release is deployed to which environment.

## Adding Automation for Seamless Flow

To reduce manual steps, add an automation rule that promotes from dev to staging automatically.

```yaml
# deploy/automation.yaml - Auto-promote from dev to staging
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: auto-promote-to-staging
selector:
- targets:
  - id: dev
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- promoteReleaseRule:
    name: dev-to-staging
    wait: 120s
    toTargetId: staging
```

With this in place, the only manual step is approving the production deployment. Everything else is automated.

## Troubleshooting Common Issues

The most frequent problem I see is permission errors. Cloud Build cannot create releases if it does not have the `clouddeploy.releaser` role. Cloud Deploy cannot deploy if the execution service account lacks cluster access.

Another common issue is mismatched image names. The image name in your `--images` flag must match the image name in your Kubernetes manifest. If your manifest references `my-app` but you pass `--images=my-application=...`, the rendering step will fail.

Check Cloud Build logs and Cloud Deploy rollout details to diagnose issues.

```bash
# View the latest Cloud Build log
gcloud builds list --limit=1 --format='value(id)' | xargs gcloud builds log

# Check rollout status for the latest release
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-abc123 \
  --region=us-central1
```

## Summary

Combining Cloud Build and Cloud Deploy gives you a fully managed CI/CD pipeline on Google Cloud. Cloud Build handles building, testing, and packaging. Cloud Deploy handles deploying through environments with approval gates and verification. The integration point is simple - a single gcloud command in your Cloud Build config that creates a release. From there, Cloud Deploy takes over and manages the deployment lifecycle.
