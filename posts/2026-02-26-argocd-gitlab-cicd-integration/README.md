# How to Integrate ArgoCD with GitLab CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitLab, CI/CD

Description: Learn how to integrate ArgoCD with GitLab CI/CD pipelines for a complete GitOps workflow including image updates, sync triggering, environment management, and merge request previews.

---

GitLab CI/CD and ArgoCD form a powerful combination for Kubernetes deployments. GitLab handles the build and test pipeline, while ArgoCD manages the actual deployment through GitOps. This guide covers how to connect the two systems, from basic image tag update workflows to advanced patterns like merge request environments and multi-stage promotions.

## GitOps Architecture with GitLab and ArgoCD

The recommended architecture keeps CI and CD responsibilities separate:

```mermaid
flowchart LR
    A[Developer Push to GitLab] --> B[GitLab CI Pipeline]
    B --> C[Build Image]
    C --> D[Push to GitLab Registry]
    D --> E[Update Deployment Repo]
    E --> F[ArgoCD Detects Change]
    F --> G[ArgoCD Syncs to K8s]
```

GitLab CI builds the application and updates the deployment manifests in Git. ArgoCD watches the deployment repository and syncs changes to Kubernetes.

## Pattern 1: Image Tag Update Pipeline

The standard GitOps pattern where GitLab CI updates the image tag in the deployment repository:

```yaml
# .gitlab-ci.yml in the application repository
stages:
  - build
  - test
  - deploy

variables:
  IMAGE_NAME: $CI_REGISTRY_IMAGE
  IMAGE_TAG: $CI_COMMIT_SHORT_SHA
  DEPLOY_REPO: "https://gitlab.example.com/myorg/k8s-manifests.git"

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_NAME:$IMAGE_TAG .
    - docker push $IMAGE_NAME:$IMAGE_TAG
  only:
    - main

test:
  stage: test
  image: $IMAGE_NAME:$IMAGE_TAG
  script:
    - npm test
  only:
    - main

update-manifests:
  stage: deploy
  image: alpine:3.19
  before_script:
    - apk add --no-cache git curl
    # Install kustomize
    - curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin
  script:
    # Clone the deployment repository
    - git clone https://deploy-bot:${DEPLOY_TOKEN}@gitlab.example.com/myorg/k8s-manifests.git
    - cd k8s-manifests

    # Update the image tag
    - cd apps/my-app/production
    - kustomize edit set image $IMAGE_NAME=$IMAGE_NAME:$IMAGE_TAG

    # Commit and push
    - git config user.name "GitLab CI"
    - git config user.email "ci@example.com"
    - git add .
    - git commit -m "Deploy my-app:$IMAGE_TAG [skip ci]"
    - git push origin main
  only:
    - main
```

The `[skip ci]` in the commit message prevents the deployment repository from triggering its own pipeline.

## Pattern 2: Direct ArgoCD Sync from GitLab

For workflows that need to trigger ArgoCD sync and wait for completion:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy
  - verify

variables:
  ARGOCD_SERVER: argocd.example.com
  APP_NAME: my-app

deploy:
  stage: deploy
  image: alpine:3.19
  before_script:
    # Install ArgoCD CLI
    - curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    - chmod +x /usr/local/bin/argocd
  script:
    # Login to ArgoCD
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web

    # Trigger refresh to detect latest changes
    - argocd app get $APP_NAME --refresh --grpc-web

    # Sync the application
    - argocd app sync $APP_NAME --grpc-web

    # Wait for the sync and health check
    - argocd app wait $APP_NAME --sync --health --timeout 300 --grpc-web
  only:
    - main

verify:
  stage: verify
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl jq
    - curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    - chmod +x /usr/local/bin/argocd
  script:
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web

    # Get detailed status
    - |
      STATUS=$(argocd app get $APP_NAME -o json --grpc-web)
      SYNC=$(echo $STATUS | jq -r '.status.sync.status')
      HEALTH=$(echo $STATUS | jq -r '.status.health.status')
      echo "Sync Status: $SYNC"
      echo "Health Status: $HEALTH"

      if [ "$SYNC" != "Synced" ] || [ "$HEALTH" != "Healthy" ]; then
        echo "Deployment verification failed!"
        exit 1
      fi
  only:
    - main
```

## Pattern 3: GitLab Environments Integration

GitLab has built-in environment support. You can integrate ArgoCD deployments with GitLab environments:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy-staging
  - deploy-production

deploy-staging:
  stage: deploy-staging
  environment:
    name: staging
    url: https://staging.example.com
  script:
    # Update staging manifests
    - cd k8s-manifests/apps/my-app/staging
    - kustomize edit set image $IMAGE_NAME=$IMAGE_NAME:$IMAGE_TAG
    - git commit -am "Deploy $IMAGE_TAG to staging"
    - git push
    # Trigger ArgoCD sync
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - argocd app sync my-app-staging --grpc-web
    - argocd app wait my-app-staging --health --timeout 300 --grpc-web
  only:
    - main

deploy-production:
  stage: deploy-production
  environment:
    name: production
    url: https://app.example.com
  when: manual  # Requires manual approval
  script:
    # Update production manifests
    - cd k8s-manifests/apps/my-app/production
    - kustomize edit set image $IMAGE_NAME=$IMAGE_NAME:$IMAGE_TAG
    - git commit -am "Deploy $IMAGE_TAG to production"
    - git push
    # Trigger ArgoCD sync
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - argocd app sync my-app-production --grpc-web
    - argocd app wait my-app-production --health --timeout 300 --grpc-web
  only:
    - main
```

## Pattern 4: Merge Request Preview Environments

Create temporary environments for merge requests:

```yaml
# .gitlab-ci.yml
deploy-review:
  stage: deploy
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://mr-$CI_MERGE_REQUEST_IID.preview.example.com
    on_stop: stop-review
    auto_stop_in: 1 week
  script:
    # Build and push preview image
    - docker build -t $IMAGE_NAME:mr-$CI_MERGE_REQUEST_IID .
    - docker push $IMAGE_NAME:mr-$CI_MERGE_REQUEST_IID

    # Install ArgoCD CLI
    - curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    - chmod +x /usr/local/bin/argocd
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web

    # Create ArgoCD application for this MR
    - |
      argocd app create my-app-mr-$CI_MERGE_REQUEST_IID \
        --repo https://gitlab.example.com/myorg/k8s-manifests.git \
        --path apps/my-app/preview \
        --dest-server https://kubernetes.default.svc \
        --dest-namespace preview-mr-$CI_MERGE_REQUEST_IID \
        --project previews \
        --sync-option CreateNamespace=true \
        --parameter image.tag=mr-$CI_MERGE_REQUEST_IID \
        --sync-policy automated \
        --grpc-web || true

    # Sync the preview
    - argocd app sync my-app-mr-$CI_MERGE_REQUEST_IID --grpc-web
    - argocd app wait my-app-mr-$CI_MERGE_REQUEST_IID --health --timeout 300 --grpc-web
  rules:
    - if: $CI_MERGE_REQUEST_IID

stop-review:
  stage: deploy
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  script:
    - curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    - chmod +x /usr/local/bin/argocd
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - argocd app delete my-app-mr-$CI_MERGE_REQUEST_IID --cascade --yes --grpc-web
  when: manual
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Pattern 5: Using GitLab CI Variables

Store ArgoCD credentials securely in GitLab CI variables:

1. Go to **Settings > CI/CD > Variables** in your GitLab project
2. Add the following variables:

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `ARGOCD_SERVER` | argocd.example.com | Yes | No |
| `ARGOCD_TOKEN` | (API token) | Yes | Yes |
| `DEPLOY_TOKEN` | (Git deploy token) | Yes | Yes |

Use protected variables so they are only available in pipelines running on protected branches.

## Pattern 6: Webhook-Based Fast Sync

Configure GitLab webhooks to notify ArgoCD immediately when the deployment repository changes:

```yaml
# In ArgoCD, configure the webhook secret
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
data:
  # GitLab webhook secret
  webhook.gitlab.secret: <base64-encoded-secret>
```

Configure the webhook in GitLab:
1. Go to the deployment repository **Settings > Webhooks**
2. Set URL to `https://argocd.example.com/api/webhook`
3. Set Secret Token to match the configured secret
4. Select "Push events"
5. Enable SSL verification

## ArgoCD Account Configuration for GitLab CI

Create a dedicated account for GitLab CI:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Create a CI account
  accounts.gitlab-ci: apiKey, login
  accounts.gitlab-ci.enabled: "true"
```

```yaml
# argocd-rbac-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # GitLab CI can sync and get application status
    p, gitlab-ci, applications, sync, */*, allow
    p, gitlab-ci, applications, get, */*, allow
    p, gitlab-ci, applications, create, previews/*, allow
    p, gitlab-ci, applications, delete, previews/*, allow
```

Generate the token:

```bash
argocd account generate-token --account gitlab-ci
```

## Reusable CI Templates

Create reusable templates for common ArgoCD operations:

```yaml
# templates/argocd.yml
.argocd-base:
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl
    - curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    - chmod +x /usr/local/bin/argocd
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web

.argocd-sync:
  extends: .argocd-base
  script:
    - argocd app sync $APP_NAME --grpc-web
    - argocd app wait $APP_NAME --sync --health --timeout $SYNC_TIMEOUT --grpc-web
  variables:
    SYNC_TIMEOUT: "300"

.argocd-verify:
  extends: .argocd-base
  script:
    - |
      STATUS=$(argocd app get $APP_NAME -o json --grpc-web)
      HEALTH=$(echo $STATUS | jq -r '.status.health.status')
      if [ "$HEALTH" != "Healthy" ]; then
        echo "Application $APP_NAME is not healthy: $HEALTH"
        exit 1
      fi
```

Use the templates in your pipeline:

```yaml
include:
  - local: templates/argocd.yml

sync-staging:
  extends: .argocd-sync
  variables:
    APP_NAME: my-app-staging
  stage: deploy-staging

verify-staging:
  extends: .argocd-verify
  variables:
    APP_NAME: my-app-staging
  stage: verify-staging
```

## Troubleshooting

**Pipeline hangs on argocd app wait**: The sync might be stuck. Add a timeout and check ArgoCD logs for errors.

**Authentication failures**: Verify the token is not expired and the account is enabled in `argocd-cm`.

**Manifest update not detected**: If ArgoCD does not pick up changes, configure a webhook or reduce the polling interval. The default polling interval is 3 minutes.

**GRPC errors**: If ArgoCD is behind an ingress that does not support gRPC, use `--grpc-web` flag on all CLI commands.

## Conclusion

GitLab CI and ArgoCD complement each other perfectly in a GitOps workflow. The image tag update pattern is the cleanest approach, keeping CI and CD fully decoupled. For teams that need tighter integration, the ArgoCD CLI can be used directly in pipelines for sync triggering and verification. For other CI system integrations, see our guides on [GitHub Actions integration](https://oneuptime.com/blog/post/2026-02-26-argocd-github-actions-integration/view) and [Jenkins pipeline integration](https://oneuptime.com/blog/post/2026-02-26-argocd-jenkins-pipeline-integration/view).
