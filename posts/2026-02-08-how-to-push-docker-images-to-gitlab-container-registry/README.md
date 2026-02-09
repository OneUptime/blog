# How to Push Docker Images to GitLab Container Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, GitLab, Container Registry, CI/CD, GitLab CI, DevOps, Cloud

Description: A practical guide to pushing Docker images to GitLab Container Registry with GitLab CI/CD pipeline integration and access management.

---

GitLab Container Registry is built into every GitLab project. You do not need to create a separate registry or link accounts. Every project gets its own container registry at a URL derived from the project path. Combined with GitLab CI/CD, this creates a tight loop from code push to image build to deployment, all within one platform.

## How GitLab Container Registry Works

Each GitLab project has a container registry accessible at:

```
registry.gitlab.com/NAMESPACE/PROJECT
```

For subgroups:

```
registry.gitlab.com/GROUP/SUBGROUP/PROJECT
```

You can store multiple images per project using different paths:

```
registry.gitlab.com/mygroup/myproject/frontend:v1.0
registry.gitlab.com/mygroup/myproject/backend:v1.0
registry.gitlab.com/mygroup/myproject/worker:v1.0
```

## Enabling the Container Registry

The container registry is enabled by default on gitlab.com. For self-managed GitLab instances, verify it is enabled:

1. Go to your project's Settings > General
2. Expand "Visibility, project features, permissions"
3. Ensure "Container registry" is toggled on

## Authentication

### Local Development with Personal Access Token

Create a personal access token with `read_registry` and `write_registry` scopes:

```bash
# Login to GitLab Container Registry
docker login registry.gitlab.com -u YOUR_GITLAB_USERNAME -p YOUR_PERSONAL_ACCESS_TOKEN

# Or use stdin for security
echo YOUR_PERSONAL_ACCESS_TOKEN | docker login registry.gitlab.com -u YOUR_GITLAB_USERNAME --password-stdin
```

### GitLab CI/CD (Automatic)

In GitLab CI/CD pipelines, authentication is handled automatically using predefined variables:

```yaml
# .gitlab-ci.yml - Login uses built-in CI variables
before_script:
  - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
```

The variables `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, and `CI_REGISTRY` are automatically available in every pipeline job.

## Building and Pushing Locally

```bash
# Build with the GitLab registry tag
docker build -t registry.gitlab.com/mygroup/myproject:v1.0.0 .

# Push to the registry
docker push registry.gitlab.com/mygroup/myproject:v1.0.0

# Push with multiple tags
docker tag registry.gitlab.com/mygroup/myproject:v1.0.0 \
    registry.gitlab.com/mygroup/myproject:latest
docker push registry.gitlab.com/mygroup/myproject:latest
```

For projects with multiple images:

```bash
# Build and push the frontend image
docker build -t registry.gitlab.com/mygroup/myproject/frontend:v1.0.0 -f Dockerfile.frontend .
docker push registry.gitlab.com/mygroup/myproject/frontend:v1.0.0

# Build and push the backend image
docker build -t registry.gitlab.com/mygroup/myproject/backend:v1.0.0 -f Dockerfile.backend .
docker push registry.gitlab.com/mygroup/myproject/backend:v1.0.0
```

## GitLab CI/CD Pipeline

The most common way to push to GitLab Container Registry is through CI/CD. Here is a complete pipeline:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  # Use the project-specific registry URL
  IMAGE: $CI_REGISTRY_IMAGE
  TAG: $CI_COMMIT_SHA

# Build and push the Docker image
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Build with commit SHA tag
    - docker build -t $IMAGE:$TAG .
    # Also tag as latest on the default branch
    - docker tag $IMAGE:$TAG $IMAGE:latest
    - docker push $IMAGE:$TAG
    - docker push $IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Build for merge requests (do not push)
build-mr:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - docker build -t $IMAGE:mr-$CI_MERGE_REQUEST_IID .
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

### Using Docker BuildKit and Buildx

For advanced builds with caching:

```yaml
# .gitlab-ci.yml - With BuildKit caching
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
    DOCKER_BUILDKIT: 1
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Pull the previous image for cache (ignore errors if it does not exist)
    - docker pull $IMAGE:latest || true
    # Build using the previous image as cache
    - >
      docker build
      --cache-from $IMAGE:latest
      --tag $IMAGE:$CI_COMMIT_SHA
      --tag $IMAGE:latest
      .
    - docker push $IMAGE:$CI_COMMIT_SHA
    - docker push $IMAGE:latest
```

### Using Kaniko (No Docker-in-Docker)

Kaniko builds images inside a container without needing Docker-in-Docker, which is more secure:

```yaml
# .gitlab-ci.yml - Build with Kaniko (no Docker daemon needed)
build:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:v1.19.2-debug
    entrypoint: [""]
  script:
    - >
      /kaniko/executor
      --context "${CI_PROJECT_DIR}"
      --dockerfile "${CI_PROJECT_DIR}/Dockerfile"
      --destination "${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}"
      --destination "${CI_REGISTRY_IMAGE}:latest"
      --cache=true
      --cache-repo="${CI_REGISTRY_IMAGE}/cache"
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

Kaniko eliminates the security concerns of running a Docker daemon inside CI. It builds directly from the Dockerfile and pushes to the registry.

## Semantic Versioning in CI

Generate proper version tags based on git tags:

```yaml
# .gitlab-ci.yml - Versioned builds triggered by git tags
build-release:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - VERSION=${CI_COMMIT_TAG#v}  # Strip 'v' prefix from tag
    - docker build -t $IMAGE:$VERSION -t $IMAGE:latest .
    - docker push $IMAGE:$VERSION
    - docker push $IMAGE:latest
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/
```

## Viewing and Managing Images

### From the GitLab UI

Navigate to your project's Deploy > Container Registry. You will see all images with their tags, sizes, and push dates.

### From the Command Line

```bash
# List tags for an image using the GitLab API
curl --header "PRIVATE-TOKEN: YOUR_TOKEN" \
  "https://gitlab.com/api/v4/projects/PROJECT_ID/registry/repositories"

# List tags for a specific repository
curl --header "PRIVATE-TOKEN: YOUR_TOKEN" \
  "https://gitlab.com/api/v4/projects/PROJECT_ID/registry/repositories/REPO_ID/tags"
```

## Cleanup Policies

Configure automatic cleanup to manage storage:

1. Go to Settings > Packages and registries > Clean up image tags
2. Set rules like: keep the latest 10 tags matching `v*`, remove tags older than 90 days

Or configure via `.gitlab-ci.yml`:

```yaml
# Cleanup job that runs on a schedule
cleanup:
  stage: deploy
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    # Remove images tagged with old commit SHAs
    - |
      TAGS=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "https://gitlab.com/api/v4/projects/$CI_PROJECT_ID/registry/repositories/$REPO_ID/tags" \
        | jq -r '.[10:][].name')
      for TAG in $TAGS; do
        curl -s --request DELETE --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
          "https://gitlab.com/api/v4/projects/$CI_PROJECT_ID/registry/repositories/$REPO_ID/tags/$TAG"
      done
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## Pulling Images for Deployment

Pull images from GitLab Container Registry on your deployment targets:

```bash
# On a deployment server, use a deploy token for read-only access
docker login registry.gitlab.com -u deploy-token-user -p YOUR_DEPLOY_TOKEN

# Pull and run
docker pull registry.gitlab.com/mygroup/myproject:latest
docker run -d -p 8080:8080 registry.gitlab.com/mygroup/myproject:latest
```

Deploy tokens provide read-only access without exposing personal credentials.

GitLab Container Registry requires zero additional setup beyond what GitLab already provides. Every project gets a registry, CI/CD handles authentication automatically, and cleanup policies prevent storage bloat. Combined with Kaniko for secure builds and deploy tokens for production pulls, it forms a complete image lifecycle management system within the GitLab platform.
