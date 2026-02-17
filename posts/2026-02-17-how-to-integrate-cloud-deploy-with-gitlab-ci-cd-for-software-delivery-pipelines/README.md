# How to Integrate Cloud Deploy with GitLab CI/CD for Software Delivery Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, GitLab, CI/CD, DevOps

Description: Integrate Google Cloud Deploy with GitLab CI/CD to create a software delivery pipeline that uses GitLab for building and testing and Cloud Deploy for deployments.

---

Not everyone uses Cloud Build. If your team is on GitLab, you still want to take advantage of Cloud Deploy's managed delivery pipeline, approval gates, and promotion workflow. The good news is that Cloud Deploy does not care how the release is created - it just needs a container image and a Skaffold configuration. This makes integrating with GitLab CI/CD straightforward.

In this guide, I will show you how to connect GitLab CI/CD with Cloud Deploy so that your builds happen in GitLab and your deployments are managed by Cloud Deploy.

## The Integration Architecture

The integration is simple at a high level:

1. GitLab CI/CD builds and tests your application
2. GitLab CI/CD pushes the container image to Artifact Registry (or any registry)
3. GitLab CI/CD calls `gcloud deploy releases create` to hand off to Cloud Deploy
4. Cloud Deploy takes over and manages the deployment through environments

GitLab handles CI. Cloud Deploy handles CD. The handoff happens through the gcloud CLI.

## Prerequisites

You need:

- A GitLab project with CI/CD enabled
- A GCP project with Cloud Deploy API enabled
- A service account key or Workload Identity Federation configured for GitLab
- Artifact Registry repository for container images
- Cloud Deploy targets and pipeline already configured

## Setting Up GCP Authentication for GitLab

The first step is letting GitLab authenticate with GCP. The recommended approach is Workload Identity Federation, but a service account key also works for getting started.

Using a service account key, create the service account and grant the necessary roles.

```bash
# Create a service account for GitLab CI/CD
gcloud iam service-accounts create gitlab-ci \
  --display-name="GitLab CI/CD Service Account"

# Grant permission to push container images
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gitlab-ci@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant permission to create Cloud Deploy releases
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gitlab-ci@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.releaser"

# Grant act-as permission for the deploy execution service account
gcloud iam service-accounts add-iam-policy-binding \
  deploy-sa@my-project.iam.gserviceaccount.com \
  --member="serviceAccount:gitlab-ci@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download a key file
gcloud iam service-accounts keys create gitlab-sa-key.json \
  --iam-account=gitlab-ci@my-project.iam.gserviceaccount.com
```

Add the service account key as a GitLab CI/CD variable named `GCP_SERVICE_ACCOUNT_KEY` (type: File, protected, masked).

## Configuring the GitLab CI/CD Pipeline

Here is a complete `.gitlab-ci.yml` that builds, tests, pushes the image, and creates a Cloud Deploy release.

```yaml
# .gitlab-ci.yml - GitLab pipeline that integrates with Cloud Deploy
variables:
  GCP_PROJECT: my-project
  GCP_REGION: us-central1
  ARTIFACT_REGISTRY: us-central1-docker.pkg.dev/my-project/my-app-repo
  APP_NAME: my-app
  PIPELINE_NAME: my-app-pipeline

stages:
  - test
  - build
  - deploy

# Run unit tests
unit-tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

# Build and push the container image
build-image:
  stage: build
  image: docker:24.0
  services:
    - docker:24.0-dind
  before_script:
    # Authenticate with GCP using the service account key
    - apk add --no-cache python3 py3-pip
    - pip3 install google-cloud-sdk --break-system-packages
    - gcloud auth activate-service-account --key-file=$GCP_SERVICE_ACCOUNT_KEY
    - gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev --quiet
  script:
    - docker build -t ${ARTIFACT_REGISTRY}/${APP_NAME}:${CI_COMMIT_SHORT_SHA} .
    - docker build -t ${ARTIFACT_REGISTRY}/${APP_NAME}:latest .
    - docker push ${ARTIFACT_REGISTRY}/${APP_NAME}:${CI_COMMIT_SHORT_SHA}
    - docker push ${ARTIFACT_REGISTRY}/${APP_NAME}:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Create a Cloud Deploy release
create-release:
  stage: deploy
  image: google/cloud-sdk:slim
  before_script:
    - gcloud auth activate-service-account --key-file=$GCP_SERVICE_ACCOUNT_KEY
    - gcloud config set project ${GCP_PROJECT}
  script:
    - |
      gcloud deploy releases create "rel-${CI_COMMIT_SHORT_SHA}" \
        --delivery-pipeline=${PIPELINE_NAME} \
        --region=${GCP_REGION} \
        --source=. \
        --images=${APP_NAME}=${ARTIFACT_REGISTRY}/${APP_NAME}:${CI_COMMIT_SHORT_SHA} \
        --annotations="gitlab-pipeline=${CI_PIPELINE_URL},commit=${CI_COMMIT_SHA}"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  needs:
    - build-image
```

## Using Workload Identity Federation Instead

For production setups, Workload Identity Federation is more secure than service account keys. It lets GitLab authenticate without storing long-lived credentials.

Set up the Workload Identity Pool and Provider.

```bash
# Create a Workload Identity Pool
gcloud iam workload-identity-pools create gitlab-pool \
  --location="global" \
  --display-name="GitLab Pool"

# Create a provider for GitLab
gcloud iam workload-identity-pools providers create-oidc gitlab-provider \
  --location="global" \
  --workload-identity-pool=gitlab-pool \
  --issuer-uri="https://gitlab.com" \
  --allowed-audiences="https://gitlab.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.project_path=assertion.project_path"

# Grant the service account access to the pool
gcloud iam service-accounts add-iam-policy-binding \
  gitlab-ci@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/attribute.project_path/my-org/my-app"
```

Then update your GitLab CI/CD to use the OIDC token.

```yaml
# Updated authentication using Workload Identity Federation
create-release:
  stage: deploy
  image: google/cloud-sdk:slim
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  before_script:
    - |
      gcloud iam workload-identity-pools create-cred-config \
        projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/providers/gitlab-provider \
        --service-account=gitlab-ci@my-project.iam.gserviceaccount.com \
        --output-file=/tmp/credentials.json \
        --credential-source-file=/tmp/oidc-token
    - echo "$GITLAB_OIDC_TOKEN" > /tmp/oidc-token
    - gcloud auth login --cred-file=/tmp/credentials.json
    - gcloud config set project my-project
  script:
    - |
      gcloud deploy releases create "rel-${CI_COMMIT_SHORT_SHA}" \
        --delivery-pipeline=my-app-pipeline \
        --region=us-central1 \
        --source=. \
        --images=my-app=${ARTIFACT_REGISTRY}/my-app:${CI_COMMIT_SHORT_SHA}
```

## Including Skaffold Configuration

Make sure your repository includes the Skaffold configuration and Kubernetes manifests that Cloud Deploy needs.

```yaml
# skaffold.yaml in your GitLab repository root
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-app
manifests:
  rawYaml:
  - k8s/*.yaml
deploy:
  kubectl: {}
```

The `--source=.` flag in the release creation command tells Cloud Deploy to look for skaffold.yaml in the current directory. Cloud Deploy uploads this source to create the release.

## Adding Deployment Status Back to GitLab

To close the feedback loop, you can query the Cloud Deploy rollout status and report it back to GitLab using the deployment API.

```yaml
# Additional job that checks deployment status
check-deployment:
  stage: deploy
  image: google/cloud-sdk:slim
  before_script:
    - gcloud auth activate-service-account --key-file=$GCP_SERVICE_ACCOUNT_KEY
    - gcloud config set project ${GCP_PROJECT}
  script:
    - |
      echo "Waiting for dev deployment to complete..."
      for i in $(seq 1 30); do
        STATUS=$(gcloud deploy rollouts list \
          --delivery-pipeline=${PIPELINE_NAME} \
          --release="rel-${CI_COMMIT_SHORT_SHA}" \
          --region=${GCP_REGION} \
          --filter="targetId:dev" \
          --format="value(state)" \
          --limit=1)
        echo "Rollout status: $STATUS"
        if [ "$STATUS" = "SUCCEEDED" ]; then
          echo "Deployment to dev succeeded"
          exit 0
        elif [ "$STATUS" = "FAILED" ]; then
          echo "Deployment to dev failed"
          exit 1
        fi
        sleep 10
      done
      echo "Timed out waiting for deployment"
      exit 1
  needs:
    - create-release
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Triggering Promotions from GitLab

You can also add manual GitLab jobs for promoting releases through the pipeline.

```yaml
# Manual promotion jobs
promote-to-staging:
  stage: deploy
  image: google/cloud-sdk:slim
  before_script:
    - gcloud auth activate-service-account --key-file=$GCP_SERVICE_ACCOUNT_KEY
    - gcloud config set project ${GCP_PROJECT}
  script:
    - |
      gcloud deploy releases promote \
        --delivery-pipeline=${PIPELINE_NAME} \
        --release="rel-${CI_COMMIT_SHORT_SHA}" \
        --region=${GCP_REGION} \
        --to-target=staging
  when: manual
  needs:
    - check-deployment
```

## Summary

Integrating GitLab CI/CD with Cloud Deploy is a matter of adding a gcloud command to your GitLab pipeline. GitLab handles what it does best - building and testing your code. Cloud Deploy takes over for what it does best - managing deployments through environments with approval gates and progressive rollout strategies. The handoff is a single CLI call, and from that point on, Cloud Deploy provides the audit trail, promotion workflow, and deployment management.
