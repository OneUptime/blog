# How to Create a Complete GitLab CI + ArgoCD Pipeline

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitLab CI, CI/CD

Description: Learn how to build a complete CI/CD pipeline using GitLab CI for building and testing with ArgoCD for GitOps-based Kubernetes deployment and environment management.

---

GitLab CI and ArgoCD are a natural pair. GitLab CI handles the build and test pipeline, while ArgoCD takes over at the deployment boundary. GitLab's built-in container registry, merge request workflows, and environment tracking integrate smoothly with ArgoCD's GitOps model.

This guide covers building a production pipeline from GitLab CI through ArgoCD to Kubernetes.

## Pipeline Architecture

GitLab CI builds and tests your code, pushes images to GitLab's container registry, then triggers ArgoCD by updating a deployment manifest:

```mermaid
graph LR
    A[Developer Push] --> B[GitLab CI Pipeline]
    B --> C[Build Stage]
    C --> D[Test Stage]
    D --> E[Push to GitLab Registry]
    E --> F[Update Deployment Repo]
    F --> G[ArgoCD Sync]
    G --> H[Kubernetes Cluster]
```

## GitLab CI Configuration

Here is the complete `.gitlab-ci.yml` for the application repository:

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  REGISTRY: registry.gitlab.com
  IMAGE_NAME: ${CI_PROJECT_PATH}
  DEPLOYMENT_REPO: myorg/k8s-deployments

# Cache dependencies between jobs
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

# ---- Test Stage ----
unit-tests:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm run test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      junit: test-results.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

lint:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint

security-scan:
  stage: test
  image: node:20-alpine
  script:
    - npm audit --audit-level=high
  allow_failure: true

# ---- Build Stage ----
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      docker build \
        --cache-from $REGISTRY/$IMAGE_NAME:latest \
        --tag $REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHORT_SHA \
        --tag $REGISTRY/$IMAGE_NAME:latest \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        .
    - docker push $REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHORT_SHA
    - docker push $REGISTRY/$IMAGE_NAME:latest
  only:
    - main

# ---- Deploy Stage ----
update-deployment:
  stage: deploy
  image: alpine:3.19
  before_script:
    - apk add --no-cache git openssh-client
    - eval $(ssh-agent -s)
    - echo "$DEPLOY_SSH_KEY" | ssh-add -
    - mkdir -p ~/.ssh
    - ssh-keyscan gitlab.com >> ~/.ssh/known_hosts
  script:
    - |
      # Clone the deployment repository
      git clone git@gitlab.com:${DEPLOYMENT_REPO}.git deployment-repo
      cd deployment-repo

      # Update the image tag
      sed -i "s|image: ${REGISTRY}/${IMAGE_NAME}:.*|image: ${REGISTRY}/${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}|" \
        apps/api-service/deployment.yaml

      # Commit and push
      git config user.name "GitLab CI"
      git config user.email "ci@gitlab.com"
      git add .
      git commit -m "Deploy api-service ${CI_COMMIT_SHORT_SHA}

      Pipeline: ${CI_PIPELINE_URL}
      Commit: ${CI_PROJECT_URL}/-/commit/${CI_COMMIT_SHA}"
      git push origin main
  only:
    - main
  environment:
    name: production
    url: https://api.example.com
```

## Deployment Repository Structure

```
k8s-deployments/
  apps/
    api-service/
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
    web-frontend/
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
  argocd/
    applications/
      api-service.yaml
      web-frontend.yaml
```

The Kustomize setup for the app:

```yaml
# apps/api-service/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
commonLabels:
  app.kubernetes.io/name: api-service
  app.kubernetes.io/managed-by: argocd
```

## ArgoCD Application

```yaml
# argocd/applications/api-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-service
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: applications
  source:
    repoURL: https://gitlab.com/myorg/k8s-deployments.git
    path: apps/api-service
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 5m
```

## Connecting ArgoCD to GitLab

ArgoCD needs read access to your GitLab repositories. Configure this with a deploy token:

```yaml
# argocd-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  url: https://gitlab.com/myorg/k8s-deployments.git
  username: gitlab-deploy-token
  password: <deploy-token-value>
  type: git
```

For GitLab's container registry, ArgoCD Image Updater needs credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-registry
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  url: registry.gitlab.com
  username: gitlab-deploy-token
  password: <deploy-token-value>
  type: helm
```

## Multi-Environment Pipeline

Extend the pipeline for multiple environments:

```yaml
# Additional deploy stages in .gitlab-ci.yml
deploy-staging:
  stage: deploy
  extends: .deploy-template
  variables:
    ENVIRONMENT: staging
    DEPLOY_PATH: apps/api-service/overlays/staging
  environment:
    name: staging
    url: https://staging-api.example.com
  only:
    - main

deploy-production:
  stage: deploy
  extends: .deploy-template
  variables:
    ENVIRONMENT: production
    DEPLOY_PATH: apps/api-service/overlays/production
  environment:
    name: production
    url: https://api.example.com
  when: manual  # Require manual approval for production
  only:
    - main

.deploy-template:
  image: alpine:3.19
  before_script:
    - apk add --no-cache git openssh-client
    - eval $(ssh-agent -s)
    - echo "$DEPLOY_SSH_KEY" | ssh-add -
    - mkdir -p ~/.ssh
    - ssh-keyscan gitlab.com >> ~/.ssh/known_hosts
  script:
    - |
      git clone git@gitlab.com:${DEPLOYMENT_REPO}.git deployment-repo
      cd deployment-repo

      # Update image in environment-specific overlay
      cd ${DEPLOY_PATH}
      kustomize edit set image \
        "registry.gitlab.com/${IMAGE_NAME}=registry.gitlab.com/${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}"

      cd /builds/deployment-repo
      git config user.name "GitLab CI"
      git config user.email "ci@gitlab.com"
      git add .
      git commit -m "Deploy api-service ${CI_COMMIT_SHORT_SHA} to ${ENVIRONMENT}"
      git push origin main
```

## Merge Request Environments

Create preview environments for merge requests:

```yaml
# In .gitlab-ci.yml
deploy-review:
  stage: deploy
  image: alpine:3.19
  script:
    - |
      # Create a temporary ArgoCD Application for this MR
      cat > /tmp/mr-app.yaml << EOF
      apiVersion: argoproj.io/v1alpha1
      kind: Application
      metadata:
        name: api-service-mr-${CI_MERGE_REQUEST_IID}
        namespace: argocd
        labels:
          review-app: "true"
        finalizers:
          - resources-finalizer.argocd.argoproj.io
      spec:
        project: review-apps
        source:
          repoURL: https://gitlab.com/${CI_PROJECT_PATH}.git
          path: k8s/review
          targetRevision: ${CI_COMMIT_SHA}
        destination:
          server: https://kubernetes.default.svc
          namespace: review-${CI_MERGE_REQUEST_IID}
      EOF

      kubectl apply -f /tmp/mr-app.yaml
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://mr-${CI_MERGE_REQUEST_IID}.review.example.com
    on_stop: stop-review
  only:
    - merge_requests

stop-review:
  stage: deploy
  image: alpine:3.19
  script:
    - kubectl delete application api-service-mr-${CI_MERGE_REQUEST_IID} -n argocd
    - kubectl delete namespace review-${CI_MERGE_REQUEST_IID} --ignore-not-found
  when: manual
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  only:
    - merge_requests
```

## GitLab Webhook for Faster Sync

Configure a webhook so ArgoCD syncs immediately when the deployment repo is updated, instead of waiting for the default 3-minute polling interval:

```bash
# In GitLab, add a webhook to the deployment repository
# URL: https://argocd.example.com/api/webhook
# Secret: <argocd webhook secret>
# Trigger: Push events
```

## Pipeline Status in ArgoCD

Use ArgoCD Notifications to post deployment status back to GitLab:

```yaml
# In argocd-notifications-cm
service.webhook.gitlab: |
  url: https://gitlab.com/api/v4
  headers:
    - name: PRIVATE-TOKEN
      value: $gitlab-token

template.gitlab-deployment-status: |
  webhook:
    gitlab:
      method: POST
      path: /projects/{{.app.metadata.annotations.gitlab-project-id}}/deployments
      body: |
        {
          "status": "{{if eq .app.status.operationState.phase "Succeeded"}}success{{else}}failed{{end}}",
          "environment": "production",
          "sha": "{{.app.status.operationState.syncResult.revision}}"
        }
```

## Summary

GitLab CI + ArgoCD creates a robust CI/CD pipeline where GitLab handles everything up to the container image, and ArgoCD handles everything from the deployment manifest to the cluster. The deployment repository acts as the single source of truth, and every deployment is traceable back to a GitLab pipeline and a specific commit. Multi-environment support, merge request preview environments, and deployment status reporting make this a complete production pipeline.
