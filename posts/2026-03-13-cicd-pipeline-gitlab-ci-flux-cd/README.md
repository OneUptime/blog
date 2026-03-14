# How to Build a Complete CI/CD Pipeline with GitLab CI and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitLab CI, CI/CD, GitOps, Kubernetes, DevOps

Description: Learn how to build a complete CI/CD pipeline using GitLab CI for continuous integration and Flux CD for GitOps-based continuous deployment to Kubernetes.

---

## Introduction

GitLab CI is a powerful CI/CD platform deeply integrated with GitLab repositories, offering pipelines, package registries, and container registries in a single platform. When paired with Flux CD, you can build a clean separation between CI (building and testing) and CD (deploying to Kubernetes), while keeping all configuration in Git.

The architecture keeps your Kubernetes cluster access out of GitLab CI entirely. GitLab CI pushes images to the GitLab Container Registry, updates an image tag in your fleet repository, and Flux CD reconciles the change into the cluster on its own schedule. This means a compromised CI runner cannot directly modify cluster state.

This guide covers setting up a GitLab CI pipeline from code push to container build, through fleet repository update, to Flux CD reconciliation.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped against a GitLab repository
- A GitLab project for your application with CI/CD enabled
- A separate GitLab project (or group) for your fleet repository
- GitLab Container Registry enabled
- `flux` CLI installed and configured

## Step 1: Bootstrap Flux CD Against GitLab

Bootstrap Flux using a GitLab personal access token or deploy key:

```bash
flux bootstrap gitlab \
  --owner=your-group \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --token-auth
```

Flux will create the `flux-system` namespace and configure a GitRepository pointing at your GitLab fleet repository.

## Step 2: Define the Application Source and Kustomization

```yaml
# clusters/production/apps/myapp.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://gitlab.com/your-group/fleet-repo
  secretRef:
    name: flux-system # created by flux bootstrap
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
```

## Step 3: Define the Application Deployment

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          # Flux Image Automation will update this field
          image: registry.gitlab.com/your-group/myapp:latest # {"$imagepolicy": "flux-system:myapp"}
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

## Step 4: Configure GitLab CI Pipeline

Create `.gitlab-ci.yml` in your application repository:

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - update-fleet

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
  IMAGE_LATEST: $CI_REGISTRY_IMAGE:latest

test:
  stage: test
  image: golang:1.22
  script:
    - go test ./...
  only:
    - merge_requests
    - main
    - tags

build-push:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $IMAGE_TAG -t $IMAGE_LATEST .
    - docker push $IMAGE_TAG
    - docker push $IMAGE_LATEST
  only:
    - tags

update-fleet:
  stage: update-fleet
  image: alpine/git:latest
  before_script:
    - git config --global user.email "ci@your-org.com"
    - git config --global user.name "GitLab CI"
  script:
    # Clone the fleet repository using a CI/CD variable with a deploy token
    - git clone https://ci-deploy-token:$FLEET_DEPLOY_TOKEN@gitlab.com/your-group/fleet-repo.git
    - cd fleet-repo
    # Update the image tag using sed
    - |
      sed -i "s|image: registry.gitlab.com/your-group/myapp:.*|image: registry.gitlab.com/your-group/myapp:$CI_COMMIT_TAG|" apps/myapp/deployment.yaml
    - git add apps/myapp/deployment.yaml
    - git commit -m "chore: update myapp to $CI_COMMIT_TAG"
    - git push origin main
  only:
    - tags
```

## Step 5: Configure Image Automation with GitLab Registry Secret

Create a Kubernetes secret for GitLab registry access:

```bash
kubectl create secret docker-registry gitlab-registry \
  --docker-server=registry.gitlab.com \
  --docker-username=your-deploy-token-user \
  --docker-password=your-deploy-token-password \
  --namespace=flux-system
```

Configure the ImageRepository to use it:

```yaml
# clusters/production/apps/myapp-image.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: registry.gitlab.com/your-group/myapp
  interval: 1m
  secretRef:
    name: gitlab-registry
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 6: Monitor the Reconciliation

```bash
# Check image policy is resolving the latest tag
flux get images policy myapp

# Watch Kustomization reconcile
flux get kustomizations myapp --watch

# Check events if reconciliation fails
flux events --for Kustomization/myapp -n flux-system
```

## Best Practices

- Use GitLab deploy tokens scoped to the fleet repository for the CI update step rather than personal access tokens.
- Separate application source and fleet repositories even within the same GitLab group.
- Use GitLab Environments to model staging and production, mapping to different Flux Kustomization paths.
- Protect your production branch in the fleet repository to require approvals for Flux Bot commits.
- Use GitLab CI's `only: tags` to ensure images are only pushed for tagged releases.
- Store sensitive values as GitLab CI/CD variables marked as masked and protected.

## Conclusion

GitLab CI and Flux CD complement each other well in a GitOps architecture. GitLab CI handles the inner loop of build, test, and publish, while Flux CD drives the outer loop of cluster reconciliation. The fleet repository acts as the contract between both systems, providing a Git-native audit trail of every deployment.
