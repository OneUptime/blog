# How to Set Up Image Automation with GitLab CI and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, GitLab CI, CI/CD

Description: Learn how to integrate GitLab CI pipelines with Flux CD image automation to build container images and automatically deploy them to Kubernetes.

---

## Introduction

GitLab CI and Flux CD work together to create a complete GitOps pipeline. GitLab CI builds and pushes container images to the GitLab Container Registry (or any external registry), and Flux CD detects new tags and updates your Kubernetes manifests. This guide covers configuring both sides of the pipeline, from the `.gitlab-ci.yml` file to the Flux image automation resources.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- Flux image-reflector-controller and image-automation-controller installed
- A GitLab project for your application code
- A GitOps repository (can be the same or separate GitLab project)
- `kubectl` and `flux` CLI access to your cluster

## GitLab CI Pipeline

Create a `.gitlab-ci.yml` that builds and pushes a container image to the GitLab Container Registry.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - push

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG

build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  rules:
    - if: $CI_COMMIT_TAG =~ /^v[0-9]+\.[0-9]+\.[0-9]+$/
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
```

### Build Number Tagging

For build-number-based tags instead of SemVer:

```yaml
# .gitlab-ci.yml
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  rules:
    - if: $CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == "main"
  variables:
    IMAGE_TAG: $CI_REGISTRY_IMAGE:build-$CI_PIPELINE_IID
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
```

The `$CI_PIPELINE_IID` variable provides a project-scoped incrementing pipeline ID.

### Timestamp Tagging

```yaml
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  rules:
    - if: $CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == "main"
  script:
    - export TAG=$(date -u +%Y%m%d%H%M%S)
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$TAG .
    - docker push $CI_REGISTRY_IMAGE:$TAG
```

## Configuring Registry Access for Flux

The GitLab Container Registry requires authentication. Create a deploy token in GitLab with `read_registry` scope, then create a Kubernetes secret.

```bash
# Create a secret for GitLab Container Registry access
kubectl create secret docker-registry gitlab-registry-auth \
  --namespace flux-system \
  --docker-server=registry.gitlab.com \
  --docker-username=gitlab-deploy-token \
  --docker-password="${GITLAB_DEPLOY_TOKEN}"
```

## Creating Flux Image Automation Resources

### ImageRepository

```yaml
# image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.gitlab.com/my-group/my-app
  interval: 5m
  secretRef:
    name: gitlab-registry-auth
```

### ImagePolicy for SemVer Tags

```yaml
# image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<version>.+)$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
```

### ImagePolicy for Build Number Tags

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

## Marking Deployment Manifests

```yaml
# apps/my-app/deployment.yaml
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
          image: registry.gitlab.com/my-group/my-app:v1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

## Configuring ImageUpdateAutomation

When the GitOps repository is hosted on GitLab, configure the GitRepository source with a deploy key or access token that has write access.

```bash
# Create a secret with a GitLab access token for pushing commits
kubectl create secret generic gitlab-git-auth \
  --namespace flux-system \
  --from-literal=username=flux-bot \
  --from-literal=password="${GITLAB_ACCESS_TOKEN}"
```

```yaml
# flux-system/git-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  url: https://gitlab.com/my-group/fleet-infra.git
  secretRef:
    name: gitlab-git-auth
```

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux-bot@example.com
      messageTemplate: |
        chore: automated image update

        {{ range .Changed.Objects -}}
        - {{ .Kind }}/{{ .Name }}: {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Using GitLab Webhooks for Faster Detection

Instead of waiting for the Flux scan interval, configure a webhook to notify Flux immediately when a new image is pushed.

Create a Flux Receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
  namespace: flux-system
spec:
  type: gitlab
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1beta2
      kind: ImageRepository
      name: my-app
```

Get the webhook URL and configure it in your GitLab project under Settings > Webhooks.

```bash
# Get the receiver URL
kubectl get receiver gitlab-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Verifying the Pipeline

```bash
# Create and push a tag in GitLab to trigger the pipeline
git tag v1.1.0 && git push origin v1.1.0

# After the GitLab CI pipeline completes, check Flux
flux get image repository my-app -n flux-system
flux get image policy my-app -n flux-system
flux get image update my-app -n flux-system
```

## Troubleshooting

**ImageRepository reports 401 Unauthorized.** The deploy token may have expired or lack the `read_registry` scope. Create a new token and update the Kubernetes secret.

**GitLab CI pipeline passes but no new tag appears.** Verify the image path matches between the CI pipeline (`$CI_REGISTRY_IMAGE`) and the Flux ImageRepository. GitLab uses lowercase paths.

**ImageUpdateAutomation fails to push to GitLab.** Check that the access token has `write_repository` permission. If the repository has branch protection rules, the token owner must be allowed to push to the protected branch.

## Conclusion

GitLab CI and Flux CD integrate smoothly for GitOps workflows. GitLab CI handles the build pipeline, pushing tagged images to the GitLab Container Registry, while Flux detects new tags and updates Kubernetes manifests. The key integration points are registry authentication for image scanning and Git authentication for automated commits. Adding a webhook from GitLab to Flux reduces the delay between pushing an image and starting the deployment.
