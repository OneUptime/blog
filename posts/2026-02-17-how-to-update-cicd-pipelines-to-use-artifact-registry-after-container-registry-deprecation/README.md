# How to Update CI/CD Pipelines to Use Artifact Registry After Container Registry Deprecation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, CI/CD, Docker, Cloud Build, GitHub Actions

Description: Practical guide to updating your CI/CD pipelines to push and pull Docker images from Artifact Registry instead of the deprecated Google Container Registry.

---

With Google Container Registry being deprecated, every CI/CD pipeline that pushes Docker images to gcr.io needs to be updated. The changes are not complicated, but they touch a lot of files - Dockerfiles, build configs, pipeline definitions, and deployment manifests all might have gcr.io references baked in. Missing even one can break your builds or deployments.

This post covers the specific changes you need to make for the most common CI/CD tools: Cloud Build, GitHub Actions, GitLab CI, and Jenkins.

## What Changes

The fundamental change is the image registry path. Here is the mapping:

| Old (GCR) | New (Artifact Registry) |
|---|---|
| `gcr.io/PROJECT/IMAGE` | `REGION-docker.pkg.dev/PROJECT/REPO/IMAGE` |
| `us.gcr.io/PROJECT/IMAGE` | `us-docker.pkg.dev/PROJECT/REPO/IMAGE` |
| `eu.gcr.io/PROJECT/IMAGE` | `europe-docker.pkg.dev/PROJECT/REPO/IMAGE` |
| `asia.gcr.io/PROJECT/IMAGE` | `asia-docker.pkg.dev/PROJECT/REPO/IMAGE` |

The big difference is that Artifact Registry requires an explicit repository name in the path. GCR had an implicit single repository; Artifact Registry lets you organize images into multiple repositories.

## Prerequisites

Before updating pipelines, make sure you have:

1. Created an Artifact Registry repository
2. Configured authentication
3. Set up IAM permissions

```bash
# Create the repository
gcloud artifacts repositories create docker-images \
  --repository-format=docker \
  --location=us-central1 \
  --project=my-project-id

# Grant push access to your CI/CD service account
gcloud artifacts repositories add-iam-policy-binding docker-images \
  --location=us-central1 \
  --member="serviceAccount:cicd@my-project-id.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project-id
```

## Updating Google Cloud Build

Cloud Build is the simplest to update because it already has built-in authentication with Artifact Registry.

Before (GCR):

```yaml
# cloudbuild-old.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA', '.']
images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
```

After (Artifact Registry):

```yaml
# cloudbuild.yaml
# Updated to push to Artifact Registry instead of GCR
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/docker-images/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/docker-images/my-app:latest'
      - '.'
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/docker-images/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/docker-images/my-app:latest'
```

The Cloud Build service account (`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`) needs `roles/artifactregistry.writer` on the repository.

```bash
# Grant Cloud Build access to push to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding docker-images \
  --location=us-central1 \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project-id
```

## Updating GitHub Actions

GitHub Actions needs a credentials setup to authenticate with Artifact Registry.

Before (GCR):

```yaml
# Old GitHub Actions workflow pushing to GCR
- name: Push to GCR
  run: |
    docker push gcr.io/${{ secrets.GCP_PROJECT }}/my-app:${{ github.sha }}
```

After (Artifact Registry):

```yaml
# .github/workflows/build.yaml
# Updated workflow using Workload Identity Federation for Artifact Registry
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      # Authenticate using Workload Identity Federation (recommended)
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
          service_account: 'cicd@my-project-id.iam.gserviceaccount.com'

      # Configure Docker to use gcloud credentials
      - name: Configure Docker
        run: gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

      # Build and push to Artifact Registry
      - name: Build and Push
        run: |
          IMAGE="us-central1-docker.pkg.dev/my-project-id/docker-images/my-app"
          docker build -t "$IMAGE:${{ github.sha }}" -t "$IMAGE:latest" .
          docker push "$IMAGE:${{ github.sha }}"
          docker push "$IMAGE:latest"
```

If you are using a service account key instead of Workload Identity Federation, the auth step changes.

```yaml
      # Alternative: authenticate with a service account key
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
```

## Updating GitLab CI

Before (GCR):

```yaml
# Old .gitlab-ci.yml
build:
  image: docker:24
  services:
    - docker:24-dind
  script:
    - echo $GCR_KEY | docker login -u _json_key --password-stdin https://gcr.io
    - docker build -t gcr.io/$GCP_PROJECT/my-app:$CI_COMMIT_SHA .
    - docker push gcr.io/$GCP_PROJECT/my-app:$CI_COMMIT_SHA
```

After (Artifact Registry):

```yaml
# .gitlab-ci.yml
# Updated to authenticate with and push to Artifact Registry
variables:
  REGISTRY: us-central1-docker.pkg.dev
  REPOSITORY: $GCP_PROJECT/docker-images
  IMAGE: $REGISTRY/$REPOSITORY/my-app

build:
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    # Authenticate with Artifact Registry using service account key
    - echo $AR_SA_KEY | docker login -u _json_key --password-stdin https://$REGISTRY
  script:
    - docker build -t "$IMAGE:$CI_COMMIT_SHA" -t "$IMAGE:latest" .
    - docker push "$IMAGE:$CI_COMMIT_SHA"
    - docker push "$IMAGE:latest"
```

## Updating Jenkins Pipelines

Before (GCR):

```groovy
// Old Jenkinsfile
pipeline {
    stages {
        stage('Push') {
            steps {
                sh 'docker push gcr.io/${PROJECT}/my-app:${BUILD_NUMBER}'
            }
        }
    }
}
```

After (Artifact Registry):

```groovy
// Jenkinsfile
// Updated pipeline pushing to Artifact Registry
pipeline {
    environment {
        REGISTRY = 'us-central1-docker.pkg.dev'
        REPO = "${PROJECT}/docker-images"
        IMAGE = "${REGISTRY}/${REPO}/my-app"
    }
    stages {
        stage('Auth') {
            steps {
                // Activate the service account and configure Docker
                sh '''
                    gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                    gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
                '''
            }
        }
        stage('Build') {
            steps {
                sh "docker build -t ${IMAGE}:${BUILD_NUMBER} -t ${IMAGE}:latest ."
            }
        }
        stage('Push') {
            steps {
                sh "docker push ${IMAGE}:${BUILD_NUMBER}"
                sh "docker push ${IMAGE}:latest"
            }
        }
    }
}
```

## Using Variables for Easy Switching

A good practice is to define the registry path as a variable so future changes are easy.

```yaml
# Define registry as a variable at the top of your pipeline config
# This makes it easy to change the registry without modifying every reference
env:
  DOCKER_REGISTRY: us-central1-docker.pkg.dev/my-project-id/docker-images
```

Then reference `$DOCKER_REGISTRY/my-app:tag` everywhere in your pipeline.

## Finding All GCR References

Before you consider the migration done, search your entire codebase for gcr.io references.

```bash
# Search for all gcr.io references in the repository
grep -rn "gcr\.io" --include="*.yaml" --include="*.yml" --include="*.json" \
  --include="*.tf" --include="*.sh" --include="Jenkinsfile" \
  --include="Dockerfile" --include="*.groovy" .
```

Common places where gcr.io references hide:

- Dockerfiles (base images)
- Kubernetes manifests
- Helm values files
- Terraform variables
- Shell scripts
- CI/CD config files
- Makefile targets
- Docker Compose files

## Testing the Migration

Before merging your pipeline changes, test the full flow.

```bash
# Build and push a test image
IMAGE="us-central1-docker.pkg.dev/my-project-id/docker-images/test-image"
docker build -t "$IMAGE:test" .
docker push "$IMAGE:test"

# Verify the image is accessible
docker pull "$IMAGE:test"

# Verify GKE can pull the image
kubectl run test-pull --image="$IMAGE:test" --restart=Never
kubectl get pod test-pull
kubectl delete pod test-pull
```

## Summary

Updating CI/CD pipelines for Artifact Registry is mostly a find-and-replace operation on image paths, plus authentication configuration updates. The key steps are: create your Artifact Registry repository, set up IAM permissions for your CI/CD service accounts, update the image paths in all your pipeline configurations, and search your entire codebase for any remaining gcr.io references. Use variables for registry paths to make future changes painless.
