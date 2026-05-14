# How to Build and Push Container Images with GitLab CI for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitLab CI, Container Image, CI/CD, GitOps, Kubernetes, Docker

Description: A practical guide to building and pushing container images with GitLab CI and automating deployments with Flux CD.

---

## Introduction

GitLab CI is one of the most popular CI/CD platforms, and when combined with Flux CD, it creates a powerful GitOps pipeline. In this guide, you will learn how to configure GitLab CI to build container images, push them to a registry, and have Flux CD automatically detect and deploy the new images to your Kubernetes cluster.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster with Flux CD installed
- A GitLab account with a project repository
- A container registry (GitLab Container Registry, Docker Hub, or any OCI-compatible registry)
- `kubectl` and `flux` CLI tools installed locally
- Basic familiarity with GitLab CI/CD pipelines

## Architecture Overview

The workflow follows a clear separation of concerns between CI and CD:

```mermaid
graph LR
    A[Developer Push] --> B[GitLab CI Pipeline]
    B --> C[Build Container Image]
    C --> D[Push to Registry]
    D --> E[Flux Image Automation]
    E --> F[Update Git Repo]
    F --> G[Flux Kustomize Controller]
    G --> H[Deploy to Kubernetes]
```

## Step 1: Set Up the GitLab CI Pipeline

Create a `.gitlab-ci.yml` file in the root of your application repository. This pipeline will build a Docker image and push it to the GitLab Container Registry.

```yaml
# .gitlab-ci.yml

# Pipeline to build and push container images for Flux CD

stages:
  - build

variables:
  # Use the GitLab Container Registry
  IMAGE_NAME: $CI_REGISTRY_IMAGE
  # Tag images with the pipeline IID so Flux can select the newest tag numerically
  IMAGE_TAG: main-$CI_PIPELINE_IID

# Build and push the container image in the same job
build-and-push-image:
  stage: build
  image: docker:24.0.5-cli
  services:
    - name: docker:24.0.5-dind
      variables:
        HEALTHCHECK_TCP_PORT: "2375"
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  before_script:
    # Authenticate with the GitLab Container Registry
    - echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
  script:
    # Build the Docker image with a Flux-friendly monotonic tag
    - docker build -t "$IMAGE_NAME:$IMAGE_TAG" .
    # Also tag with the branch name for convenience
    - docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_NAME:$CI_COMMIT_REF_SLUG"
    # Push both tags to the registry
    - docker push "$IMAGE_NAME:$IMAGE_TAG"
    - docker push "$IMAGE_NAME:$CI_COMMIT_REF_SLUG"
  rules:
    # Only run on the main branch
    - if: $CI_COMMIT_BRANCH == "main"
```

## Step 2: Use Buildah for Daemonless Builds

For better security, you can use Buildah instead of Docker-in-Docker. Buildah builds images without requiring a Docker daemon, and it can run in rootless runner setups when the runner is configured for it.

```yaml
# .gitlab-ci.yml using Buildah (recommended for daemonless builds)

stages:
  - build

variables:
  IMAGE_NAME: $CI_REGISTRY_IMAGE
  IMAGE_TAG: main-$CI_PIPELINE_IID

build-and-push:
  stage: build
  image: quay.io/buildah/stable:v1.43.0
  variables:
    STORAGE_DRIVER: vfs
    BUILDAH_FORMAT: docker
    BUILDAH_ISOLATION: chroot
  before_script:
    # Authenticate with the GitLab Container Registry
    - buildah login -u "$CI_REGISTRY_USER" --password "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
  script:
    # Build and push the image
    - buildah build -t "$IMAGE_NAME:$IMAGE_TAG" -t "$IMAGE_NAME:latest" .
    - buildah push "$IMAGE_NAME:$IMAGE_TAG"
    - buildah push "$IMAGE_NAME:latest"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Step 3: Configure Flux Image Repository

In your Flux configuration repository, create an `ImageRepository` resource that tells Flux where to scan for new images.

```yaml
# clusters/my-cluster/image-repositories/app-image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Point to the GitLab Container Registry
  image: registry.gitlab.com/my-org/my-app
  # Scan for new images every 1 minute
  interval: 1m0s
  # Reference the secret for private registry authentication
  secretRef:
    name: gitlab-registry-credentials
```

## Step 4: Create Registry Credentials for Flux

Flux needs credentials to access your private GitLab Container Registry.

```bash
# Create a Kubernetes secret with GitLab registry credentials
kubectl create secret docker-registry gitlab-registry-credentials \
  --namespace=flux-system \
  --docker-server=registry.gitlab.com \
  --docker-username=your-deploy-token-username \
  --docker-password=your-deploy-token-password
```

## Step 5: Set Up an Image Policy

The `ImagePolicy` resource defines how Flux selects the latest image tag.

```yaml
# clusters/my-cluster/image-policies/app-image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  # Use numerical ordering to select the highest pipeline IID tag
  filterTags:
    # Match tags such as main-123 and compare only the numeric part
    pattern: '^main-(?P<iid>[0-9]+)$'
    extract: '$iid'
  policy:
    numerical:
      order: asc
```

If you prefer semantic versioning, tag images with semver and update the policy:

```yaml
# Alternative: semver-based image policy
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
      # Select the latest patch version in the 1.x range
      range: ">=1.0.0 <2.0.0"
```

## Step 6: Configure Image Update Automation

Create an `ImageUpdateAutomation` resource so Flux can automatically update your deployment manifests when new images are detected.

```yaml
# clusters/my-cluster/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app-automation
  namespace: flux-system
spec:
  interval: 1m0s
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@users.noreply.gitlab.com
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Kind }} {{ $resource.Name }}
          Changes:
        {{ range $_, $change := $changes -}}
            - {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end -}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

## Step 7: Add Image Policy Markers to Deployment Manifests

In your Kubernetes deployment manifests, add marker comments so Flux knows where to update the image tag.

```yaml
# clusters/my-cluster/app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
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
          # The marker comment tells Flux which ImagePolicy to use
          image: registry.gitlab.com/my-org/my-app:main-123 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

## Step 8: Add Semver Tagging to GitLab CI (Optional)

For semver-based tagging, update your GitLab CI pipeline:

```yaml
# .gitlab-ci.yml with semantic version tagging

stages:
  - version
  - build

# Generate a semantic version tag based on the pipeline
generate-version:
  stage: version
  image: alpine:3.19
  script:
    # Create a semver tag using pipeline ID as patch version
    - echo "1.0.$CI_PIPELINE_IID" > version.txt
  artifacts:
    paths:
      - version.txt

build-and-push:
  stage: build
  image: quay.io/buildah/stable:v1.43.0
  variables:
    STORAGE_DRIVER: vfs
    BUILDAH_FORMAT: docker
    BUILDAH_ISOLATION: chroot
  before_script:
    - buildah login -u "$CI_REGISTRY_USER" --password "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
  script:
    - VERSION=$(cat version.txt)
    # Tag with the semantic version
    - buildah build -t "$CI_REGISTRY_IMAGE:$VERSION" .
    - buildah push "$CI_REGISTRY_IMAGE:$VERSION"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Step 9: Verify the Integration

After committing all the configuration, verify that everything is working:

```bash
# Check if Flux is scanning the image repository
flux get image repository my-app

# Check the image policy status
flux get image policy my-app

# Check the image update automation status
flux get image update my-app-automation

# Watch for new image tags being detected
kubectl -n flux-system get imagerepository my-app -o yaml
```

## Step 10: Troubleshooting Common Issues

If images are not being detected or deployments are not updating, check the following:

```bash
# Check Flux image reflector logs
kubectl -n flux-system logs deployment/image-reflector-controller

# Check Flux image automation logs
kubectl -n flux-system logs deployment/image-automation-controller

# Verify the secret is correctly configured
kubectl -n flux-system get secret gitlab-registry-credentials -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Force a reconciliation
flux reconcile image repository my-app
flux reconcile image update my-app-automation
```

## Conclusion

By combining GitLab CI with Flux CD, you create a robust GitOps pipeline where GitLab CI handles the build and push of container images, and Flux CD handles the deployment side automatically. This separation of concerns ensures that your CI pipeline remains focused on building artifacts while Flux manages the desired state of your cluster. The image automation controllers in Flux continuously scan for new images and update your Git repository, keeping your deployments in sync with the latest builds.
