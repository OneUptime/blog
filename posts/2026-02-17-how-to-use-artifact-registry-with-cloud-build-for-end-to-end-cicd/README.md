# How to Use Artifact Registry with Cloud Build for End-to-End CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Cloud Build, CI/CD, Docker, DevOps

Description: Build a complete CI/CD pipeline using Google Cloud Build and Artifact Registry for building, storing, scanning, and deploying container images.

---

Cloud Build and Artifact Registry are natural partners for CI/CD on GCP. Cloud Build handles the build and test stages, Artifact Registry stores the resulting images with vulnerability scanning, and from there you can deploy to GKE, Cloud Run, or any other target. The integration between the two services is tight - you do not need to manage any credentials or configure complex auth flows.

Let me show you how to wire everything together for a production-grade pipeline.

## Setting Up the Foundation

Start with enabling the required APIs and creating the Artifact Registry repository:

```bash
# Enable the necessary APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  containeranalysis.googleapis.com \
  containerscanning.googleapis.com \
  --project=my-project

# Create the Docker repository
gcloud artifacts repositories create app-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Application container images" \
  --project=my-project
```

## Granting Cloud Build Access

Cloud Build needs permission to push images to Artifact Registry. The Cloud Build service account usually has this by default at the project level, but it is good practice to set it explicitly at the repository level:

```bash
# Get the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant write access to the repository
gcloud artifacts repositories add-iam-policy-binding app-images \
  --location=us-central1 \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

## Basic Build and Push Pipeline

Here is a simple pipeline that builds a Docker image and pushes it to Artifact Registry:

```yaml
# cloudbuild.yaml - Build and push to Artifact Registry
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
      - '.'

# Let Cloud Build handle the push via the images field
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
```

Using the `images` field at the bottom instead of an explicit push step has a nice benefit - Cloud Build automatically pushes the images after all steps complete, and the push is parallelized.

## Full CI/CD Pipeline

Here is a more complete pipeline that includes testing, scanning, and deployment:

```yaml
# cloudbuild.yaml - Complete CI/CD pipeline
options:
  machineType: 'E2_HIGHCPU_8'

steps:
  # Step 1: Install dependencies and run tests
  - id: 'test'
    name: 'node:18'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm ci
        npm test
        npm run lint

  # Step 2: Build the Docker image
  - id: 'build'
    name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
      - '.'
    waitFor: ['test']

  # Step 3: Push the image to Artifact Registry
  - id: 'push'
    name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
    waitFor: ['build']

  # Step 4: Run vulnerability scan
  - id: 'scan'
    name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Trigger on-demand scan
        SCAN_OUTPUT=$(gcloud artifacts docker images scan \
          us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA \
          --location=us-central1 \
          --format='value(response.scan)')

        # Check for critical vulnerabilities
        CRITICAL=$(gcloud artifacts docker images list-vulnerabilities \
          $SCAN_OUTPUT \
          --format='value(vulnerability.effectiveSeverity)' | \
          grep -c 'CRITICAL' || true)

        if [ "$CRITICAL" -gt 0 ]; then
          echo "Found $CRITICAL critical vulnerabilities. Blocking deployment."
          gcloud artifacts docker images list-vulnerabilities $SCAN_OUTPUT \
            --format='table(vulnerability.shortDescription, vulnerability.effectiveSeverity, vulnerability.packageIssue[0].affectedPackage)'
          exit 1
        fi
        echo "Scan passed. No critical vulnerabilities."
    waitFor: ['push']

  # Step 5: Deploy to GKE
  - id: 'deploy'
    name: 'gcr.io/cloud-builders/kubectl'
    args:
      - 'set'
      - 'image'
      - 'deployment/my-app'
      - 'my-app=us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=production-cluster'
    waitFor: ['scan']

# Also push the latest tag
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'

timeout: 1800s
```

## Docker Layer Caching

One of the best ways to speed up builds is to use Docker layer caching. Pull the previous image and use it as a cache source:

```yaml
# cloudbuild.yaml - Efficient build with caching
steps:
  # Pull the latest image for cache (ignore failure if it does not exist yet)
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker pull us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest || true

  # Build using the cached layers
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
```

## Multi-Service Pipeline

For projects with multiple services, build them in parallel:

```yaml
# cloudbuild.yaml - Build multiple services in parallel
steps:
  # Build all services in parallel
  - id: 'build-api'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/api:$SHORT_SHA', '-f', 'services/api/Dockerfile', '.']
    waitFor: ['-']  # Start immediately

  - id: 'build-web'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/web:$SHORT_SHA', '-f', 'services/web/Dockerfile', '.']
    waitFor: ['-']  # Start immediately

  - id: 'build-worker'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/worker:$SHORT_SHA', '-f', 'services/worker/Dockerfile', '.']
    waitFor: ['-']  # Start immediately

  # Push all images after building
  - id: 'push-all'
    name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker push us-central1-docker.pkg.dev/$PROJECT_ID/app-images/api:$SHORT_SHA
        docker push us-central1-docker.pkg.dev/$PROJECT_ID/app-images/web:$SHORT_SHA
        docker push us-central1-docker.pkg.dev/$PROJECT_ID/app-images/worker:$SHORT_SHA
    waitFor: ['build-api', 'build-web', 'build-worker']

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/api:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/web:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/app-images/worker:$SHORT_SHA'
```

## Setting Up the Build Trigger

Create a trigger to run the pipeline automatically:

```bash
# Create a trigger for the main branch
gcloud builds triggers create github \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Build, scan, and deploy to production" \
  --project=my-project
```

## Cleanup Policies

Keep storage costs down by cleaning up old images automatically:

```bash
# Apply cleanup policies
cat > cleanup.json << 'EOF'
[
  {
    "id": "keep-releases",
    "action": { "type": "Keep" },
    "condition": { "tagPrefixes": ["v"] }
  },
  {
    "id": "keep-recent",
    "action": { "type": "Keep" },
    "mostRecentVersions": { "keepCount": 20 }
  },
  {
    "id": "delete-old",
    "action": { "type": "Delete" },
    "condition": { "olderThan": "2592000s" }
  }
]
EOF

gcloud artifacts repositories set-cleanup-policies app-images \
  --location=us-central1 \
  --policy=cleanup.json \
  --project=my-project
```

## Wrapping Up

Cloud Build and Artifact Registry together give you a fully managed CI/CD pipeline for container-based applications. Build your images in Cloud Build, store them in Artifact Registry with automatic vulnerability scanning, and deploy them to your target environment. The two services integrate seamlessly without any credential management, and you can add scanning gates, caching, and cleanup policies to make the pipeline production-ready.
