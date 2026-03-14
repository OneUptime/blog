# How to Integrate Flux CD with GitLab CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitLab, CI/CD, GitOps, Container Registry, GitLab CI, Kubernetes, Webhook

Description: A step-by-step guide to integrating Flux CD with GitLab CI/CD pipelines, covering container registry integration, webhook triggers, and end-to-end deployment automation.

---

## Introduction

GitLab provides a complete DevOps platform with built-in CI/CD pipelines and a container registry. When combined with Flux CD, you get a powerful GitOps workflow where GitLab CI handles building and testing, and Flux CD manages continuous delivery to your Kubernetes clusters. This integration works with both GitLab.com and self-hosted GitLab instances.

This guide covers setting up GitLab CI pipelines for building container images, configuring Flux to work with GitLab repositories and the GitLab Container Registry, and setting up webhooks for immediate deployment triggers.

## Prerequisites

- A GitLab account (GitLab.com or self-hosted)
- A Kubernetes cluster with kubectl access
- Flux CLI installed locally
- A GitLab project for your application code
- A GitLab project for your Flux configuration

## Step 1: Bootstrap Flux with GitLab

Flux supports GitLab as a Git provider natively. Bootstrap Flux using your GitLab repository.

```bash
# Export GitLab credentials
export GITLAB_TOKEN=<your-gitlab-personal-access-token>

# Bootstrap Flux with GitLab
flux bootstrap gitlab \
  --owner=my-group \
  --repository=flux-config \
  --branch=main \
  --path=clusters/production \
  --token-auth \
  --personal
```

For self-hosted GitLab instances:

```bash
# Bootstrap with a custom GitLab hostname
flux bootstrap gitlab \
  --hostname=gitlab.example.com \
  --owner=my-group \
  --repository=flux-config \
  --branch=main \
  --path=clusters/production \
  --token-auth \
  --personal
```

Verify the bootstrap:

```bash
# Check Flux components
flux check

# List all Flux resources
kubectl get pods -n flux-system
```

## Step 2: Set Up the GitLab CI Pipeline

Create a CI pipeline in your application repository that builds, tests, and pushes container images to the GitLab Container Registry.

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - push-manifests
  - notify

variables:
  # GitLab Container Registry variables are predefined
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE
  # Use Docker-in-Docker for building images
  DOCKER_TLS_CERTDIR: "/certs"

# Run tests first
test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm test
    - npm run lint
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

# Build and push the container image
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    # Log in to the GitLab Container Registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Build with multiple tags
    - |
      docker build \
        --tag $DOCKER_IMAGE:$CI_COMMIT_SHA \
        --tag $DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA \
        --tag $DOCKER_IMAGE:latest \
        --label "org.opencontainers.image.source=$CI_PROJECT_URL" \
        --label "org.opencontainers.image.revision=$CI_COMMIT_SHA" \
        .
    # Push all tags
    - docker push $DOCKER_IMAGE:$CI_COMMIT_SHA
    - docker push $DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $DOCKER_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# Build with semantic version tags
build-release:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Extract version from tag (remove 'v' prefix)
    - VERSION=${CI_COMMIT_TAG#v}
    - MAJOR=$(echo $VERSION | cut -d. -f1)
    - MINOR=$(echo $VERSION | cut -d. -f1,2)
    # Build with semver tags
    - |
      docker build \
        --tag $DOCKER_IMAGE:$VERSION \
        --tag $DOCKER_IMAGE:$MINOR \
        --tag $DOCKER_IMAGE:$MAJOR \
        --tag $DOCKER_IMAGE:latest \
        .
    - docker push $DOCKER_IMAGE:$VERSION
    - docker push $DOCKER_IMAGE:$MINOR
    - docker push $DOCKER_IMAGE:$MAJOR
    - docker push $DOCKER_IMAGE:latest
  rules:
    # Only run on semver tags
    - if: $CI_COMMIT_TAG =~ /^v[0-9]+\.[0-9]+\.[0-9]+$/
```

## Step 3: Push OCI Manifests from GitLab CI

Add a stage to push Kubernetes manifests as OCI artifacts.

```yaml
# Add to .gitlab-ci.yml
push-manifests:
  stage: push-manifests
  image:
    name: ghcr.io/fluxcd/flux-cli:v2.2.0
    entrypoint: [""]
  script:
    # Push manifests as an OCI artifact to the GitLab Container Registry
    - |
      flux push artifact \
        oci://$CI_REGISTRY_IMAGE/manifests:$CI_COMMIT_SHORT_SHA \
        --path=./deploy \
        --source="$CI_PROJECT_URL" \
        --revision="$CI_COMMIT_BRANCH/$CI_COMMIT_SHA" \
        --creds "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD"
    # Tag as latest
    - |
      flux tag artifact \
        oci://$CI_REGISTRY_IMAGE/manifests:$CI_COMMIT_SHORT_SHA \
        --tag latest \
        --creds "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Step 4: Configure Flux to Use GitLab Container Registry

Create credentials for Flux to access the GitLab Container Registry.

```bash
# Create a GitLab deploy token or use a personal access token
# with read_registry and write_registry scopes

kubectl create secret docker-registry gitlab-registry-secret \
  --namespace flux-system \
  --docker-server=registry.gitlab.com \
  --docker-username=<deploy-token-username> \
  --docker-password=<deploy-token-password> \
  --docker-email=flux@example.com
```

Set up image scanning for the GitLab Container Registry:

```yaml
# clusters/production/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # GitLab Container Registry image path
  image: registry.gitlab.com/my-group/my-app
  interval: 5m
  secretRef:
    name: gitlab-registry-secret

---
# clusters/production/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

Configure an OCI source for manifests pushed from GitLab CI:

```yaml
# clusters/production/oci-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-manifests
  namespace: flux-system
spec:
  url: oci://registry.gitlab.com/my-group/my-app/manifests
  interval: 5m
  ref:
    tag: latest
  provider: generic
  secretRef:
    name: gitlab-registry-secret
```

## Step 5: Set Up Webhook Integration

Configure a webhook receiver in Flux to trigger immediate reconciliation when GitLab CI completes.

```yaml
# clusters/production/webhook-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "push"
    - "tag_push"
  secretRef:
    name: gitlab-webhook-secret
  resources:
    - kind: GitRepository
      name: flux-system
      apiVersion: source.toolkit.fluxcd.io/v1
    - kind: OCIRepository
      name: my-app-manifests
      apiVersion: source.toolkit.fluxcd.io/v1
```

Create the webhook secret:

```bash
# Generate a webhook secret token
WEBHOOK_TOKEN=$(openssl rand -hex 32)

# Create the Kubernetes secret
kubectl create secret generic gitlab-webhook-secret \
  --namespace flux-system \
  --from-literal=token=$WEBHOOK_TOKEN

# Get the receiver URL
flux get receivers
```

Configure the webhook in GitLab:

```bash
# Add the webhook to your GitLab project
# Go to: Settings > Webhooks
# URL: http://<flux-notification-controller>:80/hook/<receiver-hash>
# Secret Token: <the webhook token you generated>
# Trigger: Push events, Tag push events
```

Add a webhook trigger to your GitLab CI pipeline:

```yaml
# Add to .gitlab-ci.yml
notify-flux:
  stage: notify
  image: curlimages/curl:latest
  script:
    # Trigger Flux webhook to force immediate reconciliation
    - |
      curl -X POST \
        -H "X-Gitlab-Event: Push Hook" \
        -H "X-Gitlab-Token: $FLUX_WEBHOOK_TOKEN" \
        -d '{"ref":"refs/heads/main"}' \
        "$FLUX_WEBHOOK_URL"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  variables:
    FLUX_WEBHOOK_URL: $FLUX_WEBHOOK_URL
    FLUX_WEBHOOK_TOKEN: $FLUX_WEBHOOK_TOKEN
```

## Step 6: Set Up Multi-Environment Deployment

Configure GitLab CI to support staging and production environments:

```yaml
# .gitlab-ci.yml - environment-specific jobs
stages:
  - test
  - build
  - deploy-staging
  - integration-test
  - deploy-production

deploy-staging:
  stage: deploy-staging
  image:
    name: ghcr.io/fluxcd/flux-cli:v2.2.0
    entrypoint: [""]
  script:
    # Push manifests tagged for staging
    - |
      flux push artifact \
        oci://$CI_REGISTRY_IMAGE/manifests:staging-$CI_COMMIT_SHORT_SHA \
        --path=./deploy/staging \
        --source="$CI_PROJECT_URL" \
        --revision="$CI_COMMIT_BRANCH/$CI_COMMIT_SHA" \
        --creds "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD"
    - |
      flux tag artifact \
        oci://$CI_REGISTRY_IMAGE/manifests:staging-$CI_COMMIT_SHORT_SHA \
        --tag staging-latest \
        --creds "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD"
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

integration-test:
  stage: integration-test
  image: curlimages/curl:latest
  script:
    # Run integration tests against the staging environment
    - echo "Running integration tests..."
    - curl -f https://my-app.staging.example.com/health || exit 1
    - echo "Integration tests passed"
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  stage: deploy-production
  image:
    name: ghcr.io/fluxcd/flux-cli:v2.2.0
    entrypoint: [""]
  script:
    # Push manifests tagged for production
    - |
      flux push artifact \
        oci://$CI_REGISTRY_IMAGE/manifests:production-$CI_COMMIT_SHORT_SHA \
        --path=./deploy/production \
        --source="$CI_PROJECT_URL" \
        --revision="$CI_COMMIT_BRANCH/$CI_COMMIT_SHA" \
        --creds "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD"
    - |
      flux tag artifact \
        oci://$CI_REGISTRY_IMAGE/manifests:production-$CI_COMMIT_SHORT_SHA \
        --tag production-latest \
        --creds "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD"
  environment:
    name: production
  # Require manual approval for production deployment
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Step 7: Configure Flux Notifications to GitLab

Set up Flux to report deployment status back to GitLab:

```yaml
# clusters/production/gitlab-notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gitlab-commit-status
  namespace: flux-system
spec:
  type: gitlab
  # GitLab project URL
  address: https://gitlab.com/my-group/my-app
  secretRef:
    # GitLab token with api scope
    name: gitlab-token

---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gitlab-deployment-status
  namespace: flux-system
spec:
  providerRef:
    name: gitlab-commit-status
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Create the GitLab token secret:

```bash
kubectl create secret generic gitlab-token \
  --namespace flux-system \
  --from-literal=token=<gitlab-personal-access-token>
```

## Step 8: Deploy an Application

Create the application deployment that Flux will manage:

```yaml
# deploy/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
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
          # Image from GitLab Container Registry
          image: registry.gitlab.com/my-group/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      imagePullSecrets:
        - name: gitlab-pull-secret

---
# deploy/production/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

Create the Flux Kustomization to deploy from the OCI source:

```yaml
# clusters/production/app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  sourceRef:
    kind: OCIRepository
    name: my-app-manifests
  path: ./
  prune: true
  wait: true
  timeout: 5m
```

## Step 9: Verify the Integration

Test the complete GitLab CI/CD and Flux integration:

```bash
# Push a change to trigger the GitLab CI pipeline
git add .
git commit -m "feat: add new feature"
git push origin main

# Monitor the GitLab CI pipeline
# Go to: CI/CD > Pipelines in your GitLab project

# Check that Flux detected the new artifact
flux get sources oci my-app-manifests

# Verify the deployment was updated
kubectl get deployment my-app -n my-app -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check Flux events
flux events --for Kustomization/my-app
```

## Troubleshooting

### GitLab Registry Authentication Failures

```bash
# Test login to GitLab Container Registry
docker login registry.gitlab.com

# Verify the Kubernetes secret
kubectl get secret gitlab-registry-secret -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# For self-hosted GitLab, check the registry URL
kubectl describe secret gitlab-registry-secret -n flux-system
```

### Webhook Not Triggering Reconciliation

```bash
# Check the receiver status
flux get receivers

# View notification controller logs
kubectl logs -n flux-system deployment/notification-controller | grep gitlab

# Verify the webhook is configured in GitLab
# Check: Settings > Webhooks > Recent Deliveries
```

### GitLab CI Pipeline Failures

```bash
# Check the CI/CD pipeline logs in GitLab
# Go to: CI/CD > Pipelines > select the failed pipeline

# Verify CI/CD variables are set
# Go to: Settings > CI/CD > Variables
# Ensure FLUX_WEBHOOK_URL and FLUX_WEBHOOK_TOKEN are defined
```

## Conclusion

You now have a fully integrated Flux CD and GitLab CI/CD pipeline. GitLab CI builds and tests your application, pushes container images and OCI manifests to the GitLab Container Registry, and Flux CD automatically deploys changes to your Kubernetes cluster. Webhooks ensure near-instant deployments, and commit status notifications keep your team informed about deployment progress directly in GitLab.
