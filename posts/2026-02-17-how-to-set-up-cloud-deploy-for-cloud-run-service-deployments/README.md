# How to Set Up Cloud Deploy for Cloud Run Service Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Cloud Run, Serverless, DevOps

Description: Configure Google Cloud Deploy to manage Cloud Run service deployments with progressive delivery, approval gates, and automated promotions across environments.

---

Cloud Deploy is not just for GKE. It works with Cloud Run too, giving you the same managed delivery pipeline - promotions, approvals, verification, and canary deployments - for your serverless services. If you are running Cloud Run and want more control over how releases flow through environments, Cloud Deploy is the answer.

This guide shows you how to set up Cloud Deploy specifically for Cloud Run services.

## Why Use Cloud Deploy with Cloud Run

Without Cloud Deploy, deploying a Cloud Run service usually means running `gcloud run deploy` in your CI pipeline. That works fine for simple setups, but it falls apart when you need:

- Multiple environments (dev, staging, production) with a controlled progression
- Approval gates before production
- Traffic splitting for canary deployments
- An audit trail of what was deployed and when
- The ability to roll back to a previous version easily

Cloud Deploy adds all of this on top of Cloud Run.

## Prerequisites

Enable the required APIs.

```bash
# Enable Cloud Deploy and Cloud Run APIs
gcloud services enable \
  clouddeploy.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

You need a container image in Artifact Registry and Cloud Run services (or Cloud Deploy will create them).

## Defining Cloud Run Targets

For Cloud Run, targets specify a Cloud Run location instead of a GKE cluster.

```yaml
# targets.yaml - Cloud Run targets for each environment
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: dev
description: Development Cloud Run service
run:
  location: projects/my-project/locations/us-central1
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: staging
description: Staging Cloud Run service
run:
  location: projects/my-project/locations/us-central1
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
description: Production Cloud Run service
requireApproval: true
run:
  location: projects/my-project/locations/us-central1
```

Register the targets.

```bash
# Apply all targets
gcloud deploy apply --file=targets.yaml --region=us-central1
```

## Creating the Delivery Pipeline

The pipeline definition works the same as for GKE.

```yaml
# pipeline.yaml - Delivery pipeline for Cloud Run
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-cloudrun-pipeline
description: Cloud Run delivery pipeline
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

```bash
# Register the pipeline
gcloud deploy apply --file=pipeline.yaml --region=us-central1
```

## Writing the Cloud Run Service YAML

Instead of Kubernetes manifests, you provide a Cloud Run service YAML file.

```yaml
# cloudrun/service.yaml - Cloud Run service definition
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containerConcurrency: 80
      containers:
      - image: us-central1-docker.pkg.dev/my-project/my-repo/my-service
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: "1"
            memory: 512Mi
        env:
        - name: NODE_ENV
          value: production
```

## Setting Up Skaffold for Cloud Run

The Skaffold configuration for Cloud Run uses a different deploy section than GKE.

```yaml
# skaffold.yaml - Skaffold config for Cloud Run deployment
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-service
profiles:
- name: dev
  manifests:
    rawYaml:
    - cloudrun/service.yaml
    - cloudrun/overlays/dev.yaml
- name: staging
  manifests:
    rawYaml:
    - cloudrun/service.yaml
    - cloudrun/overlays/staging.yaml
- name: prod
  manifests:
    rawYaml:
    - cloudrun/service.yaml
    - cloudrun/overlays/prod.yaml
deploy:
  cloudrun: {}
```

Notice the `deploy.cloudrun: {}` section. This tells Skaffold to use the Cloud Run deployer instead of kubectl.

## Environment-Specific Overlays

Use overlay files to customize the service for each environment.

```yaml
# cloudrun/overlays/dev.yaml - Development-specific overrides
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "2"
    spec:
      containers:
      - image: us-central1-docker.pkg.dev/my-project/my-repo/my-service
        resources:
          limits:
            cpu: "0.5"
            memory: 256Mi
        env:
        - name: NODE_ENV
          value: development
        - name: LOG_LEVEL
          value: debug
```

```yaml
# cloudrun/overlays/prod.yaml - Production-specific overrides
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "100"
        autoscaling.knative.dev/minScale: "2"
    spec:
      containers:
      - image: us-central1-docker.pkg.dev/my-project/my-repo/my-service
        resources:
          limits:
            cpu: "2"
            memory: 1Gi
        env:
        - name: NODE_ENV
          value: production
        - name: LOG_LEVEL
          value: warn
```

## Creating a Release

Create a release using the standard gcloud command.

```bash
# Create a release for the Cloud Run service
gcloud deploy releases create rel-001 \
  --delivery-pipeline=my-cloudrun-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-service=us-central1-docker.pkg.dev/my-project/my-repo/my-service:v1.0.0
```

Cloud Deploy creates the release and starts a rollout to the dev target. The Cloud Run service is created or updated in the dev project/region.

## Setting Up Canary Deployments for Cloud Run

Cloud Run supports traffic splitting natively, making it a great fit for canary deployments. Cloud Deploy leverages this by splitting traffic between the current and new revisions.

```yaml
# pipeline-canary.yaml - Cloud Run pipeline with canary strategy
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-cloudrun-pipeline-canary
serialPipeline:
  stages:
  - targetId: prod
    profiles:
    - prod
    strategy:
      canary:
        runtimeConfig:
          cloudRun:
            automaticTrafficControl: true
        canaryDeployment:
          percentages:
          - 10
          - 50
          verify: true
```

With `automaticTrafficControl: true`, Cloud Deploy manages the traffic split between the stable revision and the canary revision. At 10%, 10% of requests go to the new revision. At 50%, half the traffic hits the new version.

## Verification for Cloud Run

Verification works the same way as with GKE - you define a container in your Skaffold config.

```yaml
# Add verification to your skaffold.yaml
verify:
- name: smoke-test
  container:
    name: smoke-test
    image: curlimages/curl:latest
    command: ["sh"]
    args:
    - "-c"
    - |
      # Test the Cloud Run service endpoint
      SERVICE_URL=$(gcloud run services describe my-service \
        --region=us-central1 --format='value(status.url)')
      echo "Testing $SERVICE_URL"
      HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$SERVICE_URL/health")
      if [ "$HTTP_CODE" != "200" ]; then
        echo "Health check failed with $HTTP_CODE"
        exit 1
      fi
      echo "Health check passed"
  timeout: 120s
```

## Configuring the Execution Service Account

The execution service account needs permission to deploy to Cloud Run.

```bash
# Create the execution service account
gcloud iam service-accounts create deploy-sa \
  --display-name="Cloud Deploy Execution SA"

# Grant Cloud Run developer role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/run.developer"

# Grant act-as permission for the Cloud Run runtime service account
gcloud iam service-accounts add-iam-policy-binding \
  PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --member="serviceAccount:deploy-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Cloud Deploy job runner role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.jobRunner"
```

## Promoting Through the Pipeline

Promotion works identically to GKE pipelines.

```bash
# Promote from dev to staging
gcloud deploy releases promote \
  --delivery-pipeline=my-cloudrun-pipeline \
  --release=rel-001 \
  --region=us-central1

# After staging succeeds, promote to production
gcloud deploy releases promote \
  --delivery-pipeline=my-cloudrun-pipeline \
  --release=rel-001 \
  --region=us-central1

# Approve the production rollout
gcloud deploy rollouts approve rel-001-to-prod-0001 \
  --delivery-pipeline=my-cloudrun-pipeline \
  --release=rel-001 \
  --region=us-central1
```

## Summary

Cloud Deploy with Cloud Run gives you enterprise-grade delivery management for serverless services. The setup is similar to GKE deployments but with Cloud Run-specific target configurations and Skaffold deployer settings. You get the full Cloud Deploy feature set - pipeline stages, approvals, verification, canary deployments with native traffic splitting, and complete audit trails. If you are already using Cloud Run and want to level up your deployment process, Cloud Deploy is the natural next step.
