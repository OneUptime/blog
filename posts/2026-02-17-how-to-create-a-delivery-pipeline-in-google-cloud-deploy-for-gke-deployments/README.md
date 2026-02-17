# How to Create a Delivery Pipeline in Google Cloud Deploy for GKE Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, GKE, Kubernetes, CI/CD, Delivery Pipeline, DevOps

Description: Set up a delivery pipeline in Google Cloud Deploy to manage progressive rollouts across dev, staging, and production GKE clusters with approval gates.

---

Cloud Deploy is GCP's managed continuous delivery service. While Cloud Build handles the CI part (building and testing), Cloud Deploy handles the CD part (getting your application safely through dev, staging, and production environments). It gives you a structured pipeline with approval gates, rollback capabilities, and audit trails.

If you have been manually promoting deployments between environments or hacking together scripts to manage multi-environment rollouts, Cloud Deploy is worth looking at. Let me show you how to set it up.

## Understanding Cloud Deploy Concepts

Before diving into configuration, here are the key concepts:

- **Delivery Pipeline**: Defines the sequence of environments (targets) an application moves through
- **Target**: Represents a deployment destination (like a GKE cluster or Cloud Run service)
- **Release**: A specific version of your application that moves through the pipeline
- **Rollout**: The act of deploying a release to a specific target
- **Skaffold**: Cloud Deploy uses Skaffold manifests to define how to render and deploy your application

## Prerequisites

```bash
# Enable the Cloud Deploy API
gcloud services enable \
  clouddeploy.googleapis.com \
  container.googleapis.com \
  --project=my-project
```

You also need GKE clusters for each environment. For this walkthrough, assume you have three clusters:

- `dev-cluster` in `us-central1-a`
- `staging-cluster` in `us-central1-a`
- `prod-cluster` in `us-central1-a`

## Step 1: Define the Delivery Pipeline

Create a YAML file that defines your pipeline and targets:

```yaml
# clouddeploy.yaml - Delivery pipeline and target definitions
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
description: Delivery pipeline for my-app across dev, staging, and production
serialPipeline:
  stages:
    - targetId: dev
      profiles: [dev]
    - targetId: staging
      profiles: [staging]
    - targetId: production
      profiles: [production]
      strategy:
        standard:
          verify: true  # Run verification after deploying to production
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: dev
description: Development GKE cluster
gke:
  cluster: projects/my-project/locations/us-central1-a/clusters/dev-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: staging
description: Staging GKE cluster
gke:
  cluster: projects/my-project/locations/us-central1-a/clusters/staging-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: production
description: Production GKE cluster
requireApproval: true  # Require manual approval before deploying to production
gke:
  cluster: projects/my-project/locations/us-central1-a/clusters/prod-cluster
```

Notice `requireApproval: true` on the production target. This means someone has to manually approve before the release is deployed to production.

## Step 2: Apply the Pipeline Configuration

```bash
# Create the delivery pipeline and targets
gcloud deploy apply \
  --file=clouddeploy.yaml \
  --region=us-central1 \
  --project=my-project
```

Verify the pipeline was created:

```bash
# List delivery pipelines
gcloud deploy delivery-pipelines list \
  --region=us-central1 \
  --project=my-project

# Describe the pipeline
gcloud deploy delivery-pipelines describe my-app-pipeline \
  --region=us-central1 \
  --project=my-project
```

## Step 3: Create the Skaffold Configuration

Cloud Deploy uses Skaffold to render Kubernetes manifests. Create a `skaffold.yaml` in your project:

```yaml
# skaffold.yaml - Defines how to build and deploy the application
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-app

profiles:
  # Dev profile - fewer replicas, debug settings
  - name: dev
    manifests:
      rawYaml:
        - k8s/base/*.yaml
        - k8s/overlays/dev/*.yaml

  # Staging profile - production-like but with staging config
  - name: staging
    manifests:
      rawYaml:
        - k8s/base/*.yaml
        - k8s/overlays/staging/*.yaml

  # Production profile - full production settings
  - name: production
    manifests:
      rawYaml:
        - k8s/base/*.yaml
        - k8s/overlays/production/*.yaml

deploy:
  kubectl: {}
```

## Step 4: Create Kubernetes Manifests

Set up the manifest structure:

```yaml
# k8s/base/deployment.yaml - Base deployment manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: us-central1-docker.pkg.dev/my-project/app-images/my-app
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
```

```yaml
# k8s/base/service.yaml - Base service manifest
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

```yaml
# k8s/overlays/dev/deployment-patch.yaml - Dev overrides
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: my-app
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
```

```yaml
# k8s/overlays/production/deployment-patch.yaml - Production overrides
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: my-app
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

## Step 5: Create a Release

A release represents a specific version of your application. Create one after building and pushing a new image:

```bash
# Create a new release
gcloud deploy releases create release-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --images=my-app=us-central1-docker.pkg.dev/my-project/app-images/my-app:v1.0.0 \
  --source=. \
  --project=my-project
```

This creates the release and automatically starts a rollout to the first target (dev).

## Step 6: Promote Through Environments

After the dev deployment succeeds, promote to staging:

```bash
# Promote the release to the next stage (staging)
gcloud deploy releases promote \
  --release=release-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --project=my-project
```

After staging, promote to production (this will wait for approval since we configured `requireApproval: true`):

```bash
# Promote to production (will need approval)
gcloud deploy releases promote \
  --release=release-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --project=my-project
```

## Step 7: Approve Production Deployments

The production rollout is pending approval. Someone with the approver role needs to approve it:

```bash
# List pending approvals
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=release-001 \
  --region=us-central1 \
  --project=my-project

# Approve the rollout
gcloud deploy rollouts approve release-001-to-production-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=release-001 \
  --region=us-central1 \
  --project=my-project
```

## Integrating with Cloud Build

Trigger a release automatically when Cloud Build completes:

```yaml
# cloudbuild.yaml - Build, push, and create a Cloud Deploy release
steps:
  # Build and push the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA']

  # Create a Cloud Deploy release
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'deploy'
      - 'releases'
      - 'create'
      - 'release-$SHORT_SHA'
      - '--delivery-pipeline=my-app-pipeline'
      - '--region=us-central1'
      - '--images=my-app=us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '--source=.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
```

## Rolling Back

If a deployment goes wrong, roll back to a previous release:

```bash
# Roll back the production target to the previous release
gcloud deploy targets rollback production \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --project=my-project
```

## Setting Up IAM for Approvals

Grant the approval role to the right people:

```bash
# Grant approval permission to the release managers
gcloud projects add-iam-policy-binding my-project \
  --member="group:release-managers@example.com" \
  --role="roles/clouddeploy.approver"

# Grant deploy operator role to the CI/CD service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:ci-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.operator"
```

## Canary Deployments

Cloud Deploy also supports canary deployments for gradual rollouts:

```yaml
# clouddeploy.yaml - Pipeline with canary strategy
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
serialPipeline:
  stages:
    - targetId: dev
      profiles: [dev]
    - targetId: staging
      profiles: [staging]
    - targetId: production
      profiles: [production]
      strategy:
        canary:
          runtimeConfig:
            kubernetes:
              serviceNetworking:
                service: my-app
                deployment: my-app
          canaryDeployment:
            percentages: [25, 50, 75]
            verify: true
```

This rolls out to production in stages: 25% of traffic first, then 50%, then 75%, and finally 100%.

## Monitoring Pipeline Status

Keep track of your delivery pipeline:

```bash
# View pipeline status
gcloud deploy delivery-pipelines describe my-app-pipeline \
  --region=us-central1 \
  --project=my-project

# List all releases
gcloud deploy releases list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --project=my-project

# View rollout details
gcloud deploy rollouts describe release-001-to-production-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=release-001 \
  --region=us-central1 \
  --project=my-project
```

## Wrapping Up

Google Cloud Deploy gives you a structured, auditable way to move your applications through environments. Define your pipeline and targets, create releases that flow through dev, staging, and production, and use approval gates to control production deployments. Combined with Cloud Build for the CI side, you get a complete managed CI/CD solution that handles the entire journey from code commit to production deployment.
