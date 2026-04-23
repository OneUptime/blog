# How to Set Up Skaffold for Development on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Skaffold, Development, DevOps, Inner Loop

Description: Configure Skaffold to streamline the Kubernetes development workflow on Rancher with continuous rebuild and redeploy on code changes.

## Introduction

Skaffold is a command-line tool for continuous development on Kubernetes. It watches your source code, builds container images when changes occur, and automatically deploys them to your cluster. This eliminates the manual build-tag-push-deploy cycle during development. This guide covers setting up Skaffold for development against a Rancher-managed cluster.

## Prerequisites

- Skaffold CLI installed
- Docker configured (optionally with BuildKit enabled)
- kubectl configured for your Rancher cluster
- A development namespace in Rancher

## Step 1: Install Skaffold

```bash
# macOS

brew install skaffold

# Linux
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
chmod +x skaffold && sudo mv skaffold /usr/local/bin

# Verify installation
skaffold version
```

## Step 2: Create a skaffold.yaml

```yaml
# skaffold.yaml - Basic Skaffold configuration
apiVersion: skaffold/v4beta13
kind: Config
metadata:
  name: my-app

build:
  artifacts:
    - image: registry.example.com/my-app
      docker:
        dockerfile: Dockerfile
      # Sync source files directly without rebuilding (for interpreted languages)
      sync:
        infer:
          - "**/*.py"
          - "**/*.html"
          - "**/*.css"

  # Push images to private registry
  local:
    push: true
    useDockerCLI: true
    useBuildkit: true

deploy:
  helm:
    releases:
      - name: my-app
        chartPath: ./chart
        namespace: development
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_registry_example_com_my_app}}"
          image.tag: "{{.IMAGE_TAG_registry_example_com_my_app}}@{{.IMAGE_DIGEST_registry_example_com_my_app}}"
        setValues:
          replicaCount: "1"
          resources.requests.cpu: "100m"
          resources.requests.memory: "128Mi"

portForward:
  - resourceType: service
    resourceName: my-app
    namespace: development
    port: 8080
    localPort: 8080

profiles:
  # Development profile: hot reload, lower resources
  - name: dev
    activation:
      - command: dev
    build:
      artifacts:
        - image: registry.example.com/my-app
          docker:
            dockerfile: Dockerfile.dev
          sync:
            infer:
              - "**/*.py"

  # Staging profile: same as production but smaller scale
  - name: staging
    patches:
      - op: replace
        path: /deploy/helm/releases/0/namespace
        value: staging
      - op: replace
        path: /deploy/helm/releases/0/setValues/replicaCount
        value: "2"
```

## Step 3: Configure a Development Namespace

```bash
# Create development namespace in Rancher
kubectl create namespace development
kubectl label namespace development \
  env=development \
  managed-by=skaffold

# Configure image pull secrets
kubectl create secret docker-registry dev-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=devuser \
  --docker-password=devpassword \
  --docker-email=dev@example.com \
  --namespace=development

# Patch service account to use secret
kubectl patch serviceaccount default \
  -n development \
  -p '{"imagePullSecrets": [{"name": "dev-registry-secret"}]}'
```

## Step 4: Start the Development Loop

```bash
# Start Skaffold in continuous development mode
skaffold dev \
  --namespace development \
  --port-forward

# Or with a specific profile
skaffold dev \
  --profile dev \
  --namespace development \
  --port-forward \
  --tail
```

When you save a file, Skaffold will either sync matching files directly into the running container or, if a rebuild is required:
1. Rebuild the container image
2. Push it to the registry
3. Deploy the new image to Kubernetes
4. Stream logs from the new pod

## Step 5: Configure Kaniko for In-Cluster Builds

Build images directly in the cluster to avoid needing Docker locally:

```yaml
# Add this to your Skaffold config for in-cluster builds with Kaniko
build:
  artifacts:
    - image: registry.example.com/my-app
      kaniko:
        dockerfile: Dockerfile
        # Cache layers for faster builds
        cache: {}

  cluster:
    # Namespace to run Kaniko builds in
    namespace: development
    # Use your Docker config for registry credentials
    dockerConfig:
      path: ~/.docker/config.json
```

## Step 6: Optimize Build Caching

```yaml
# Add this to your Skaffold config to optimize builds with caching
build:
  artifacts:
    - image: registry.example.com/my-app
      docker:
        dockerfile: Dockerfile
        # Cache from remote registry
        cacheFrom:
          - registry.example.com/my-app:cache
          - registry.example.com/my-app:latest
        # BuildKit cache
        buildArgs:
          BUILDKIT_INLINE_CACHE: "1"

  # Use content-based tags so cached images match the current source tree
  tagPolicy:
    gitCommit:
      variant: AbbrevTreeSha
```

## Step 7: Configure File Sync for Faster Iteration

```yaml
# Add this to your Skaffold config for faster iteration with file sync
build:
  artifacts:
    - image: registry.example.com/my-python-app
      docker:
        dockerfile: Dockerfile
      # Sync Python files directly without full rebuild
      sync:
        manual:
          - src: "src/**/*.py"
            dest: /app/src
          - src: "templates/**/*.html"
            dest: /app/templates
```

```dockerfile
# Dockerfile - Structure to enable file sync
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ ./src/
COPY templates/ ./templates/
CMD ["python", "src/main.py"]
```

## Step 8: Run Tests with Skaffold

```yaml
# Add this to your Skaffold config to run tests as part of Skaffold
test:
  - image: registry.example.com/my-app
    custom:
      - command: |
          kubectl run test-pod \
            --image="$IMAGE" \
            --rm \
            --attach \
            --restart=Never \
            -n development \
            --command -- pytest tests/
        timeoutSeconds: 120
```

## Conclusion

Skaffold dramatically improves the inner development loop for Kubernetes applications. The file sync feature enables sub-second iteration for interpreted languages, while the full rebuild/redeploy cycle ensures production parity during development. By targeting a Rancher-managed development namespace, developers can test against real Kubernetes infrastructure without the overhead of managing local clusters. Combine Skaffold with a good Dockerfile structure (multi-stage builds, proper layer ordering) to minimize rebuild times.
