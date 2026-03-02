# How to Set Up Kaniko for In-Cluster Container Builds on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kaniko, Kubernetes, Docker, CI/CD

Description: Learn how to set up Kaniko for building container images inside Kubernetes clusters without the Docker daemon, covering registry authentication, caching, and CI/CD integration.

---

Kaniko builds container images from Dockerfiles inside Kubernetes pods without requiring a Docker daemon. Traditional Docker builds need access to the Docker socket, which effectively gives the build process root access to the host - a significant security concern in shared clusters. Kaniko runs entirely in user space, executing each Dockerfile instruction and capturing the resulting filesystem snapshot.

This guide covers setting up Kaniko on a Kubernetes cluster running on Ubuntu nodes, configuring registry authentication, and integrating it into a CI/CD pipeline.

## How Kaniko Works

Kaniko runs as a container itself (using the `gcr.io/kaniko-project/executor` image). It:
1. Reads the Dockerfile
2. Executes each instruction in user space (no Docker daemon)
3. Takes filesystem snapshots after each instruction
4. Pushes the final image to a registry

Because it runs as a regular container without privileged mode or socket mounts, it fits cleanly into Kubernetes security models.

## Prerequisites

- A running Kubernetes cluster (this guide uses a cluster with Ubuntu 22.04 nodes)
- `kubectl` configured to connect to the cluster
- A container registry (Docker Hub, GCR, ECR, or a private registry)

## Basic Kaniko Usage

The simplest Kaniko build runs as a pod. Given a Dockerfile in a Git repository:

```yaml
# kaniko-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-build
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        # Source: Git repository containing the Dockerfile
        - "--context=git://github.com/yourorg/yourrepo.git#refs/heads/main"
        # Destination: where to push the built image
        - "--destination=docker.io/youruser/yourimage:latest"
        # Cache layers in the registry for faster subsequent builds
        - "--cache=true"
        - "--cache-repo=docker.io/youruser/yourimage-cache"
      volumeMounts:
        - name: kaniko-secret
          mountPath: /kaniko/.docker
  volumes:
    - name: kaniko-secret
      secret:
        secretName: regcred
        items:
          - key: .dockerconfigjson
            path: config.json
  restartPolicy: Never
```

Apply it:

```bash
kubectl apply -f kaniko-pod.yaml
kubectl logs -f kaniko-build
```

## Configuring Registry Authentication

Kaniko uses the standard Docker credential format. Create a Kubernetes secret from your Docker credentials:

**For Docker Hub:**

```bash
# Create a secret from your Docker Hub credentials
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=youruser \
  --docker-password=yourpassword \
  --docker-email=youremail@example.com
```

**For AWS ECR:**

```bash
# Get the ECR login token and create a secret
aws ecr get-login-password --region us-east-1 | \
  kubectl create secret docker-registry ecr-credentials \
    --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
    --docker-username=AWS \
    --docker-password-stdin
```

**For Google Container Registry (GCR):**

```bash
# Create a service account key and store it as a secret
kubectl create secret generic gcr-credentials \
  --from-file=config.json=/path/to/keyfile.json
```

For GCR, the config.json format is:

```json
{
  "credHelpers": {
    "gcr.io": "gcr",
    "us.gcr.io": "gcr",
    "eu.gcr.io": "gcr"
  }
}
```

## Using a Local Context (Git Repository)

Kaniko supports several context sources:

```yaml
args:
  # Git repository
  - "--context=git://github.com/org/repo.git#refs/heads/main"

  # Specific subdirectory in Git repo
  - "--context=git://github.com/org/repo.git#refs/heads/main"
  - "--dockerfile=/app/Dockerfile"

  # GCS bucket
  - "--context=gs://mybucket/path/to/context.tar.gz"

  # S3 bucket
  - "--context=s3://mybucket/path/to/context.tar.gz"
```

## Mounting a Local Build Context

For build context stored on a shared volume (useful in CI/CD):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-build
spec:
  initContainers:
    # Copy the build context from a source to the shared volume
    - name: git-clone
      image: alpine/git
      command:
        - git
        - clone
        - "https://github.com/yourorg/yourrepo.git"
        - /workspace
      volumeMounts:
        - name: workspace
          mountPath: /workspace

  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        - "--context=dir:///workspace"
        - "--dockerfile=/workspace/Dockerfile"
        - "--destination=docker.io/youruser/yourimage:latest"
      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: kaniko-secret
          mountPath: /kaniko/.docker

  volumes:
    - name: workspace
      emptyDir: {}
    - name: kaniko-secret
      secret:
        secretName: regcred
        items:
          - key: .dockerconfigjson
            path: config.json

  restartPolicy: Never
```

## Layer Caching

Kaniko supports caching layers in the registry to speed up builds:

```yaml
args:
  - "--context=git://github.com/org/repo.git#refs/heads/main"
  - "--destination=docker.io/youruser/yourimage:v1.0"
  # Enable layer caching
  - "--cache=true"
  # Where to store cache (can be the same registry, different tag)
  - "--cache-repo=docker.io/youruser/yourimage-cache"
  # How long to keep cache (default 2 weeks)
  - "--cache-ttl=336h"
```

On the first build, all layers are cached to the registry. Subsequent builds reuse unchanged layers, significantly reducing build time for images with stable base layers.

## Using a Private Registry with TLS

For a private registry with custom CA:

```bash
# Create a ConfigMap with the CA certificate
kubectl create configmap registry-ca \
  --from-file=ca.crt=/path/to/registry-ca.crt
```

Mount it in the Kaniko pod:

```yaml
containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    args:
      - "--context=dir:///workspace"
      - "--destination=registry.internal.example.com/myimage:latest"
      # Tell Kaniko where to find the CA cert
      - "--registry-certificate=registry.internal.example.com=/kaniko/ssl/certs/ca.crt"
    volumeMounts:
      - name: registry-ca
        mountPath: /kaniko/ssl/certs

volumes:
  - name: registry-ca
    configMap:
      name: registry-ca
```

## Integrating with GitLab CI

```yaml
# .gitlab-ci.yml
build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    # Create Docker config with registry credentials
    - mkdir -p /kaniko/.docker
    - echo "{\"auths\":{\"$CI_REGISTRY\":{\"auth\":\"$(echo -n $CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD | base64)\"}}}" > /kaniko/.docker/config.json
    # Build and push the image
    - /kaniko/executor
        --context "$CI_PROJECT_DIR"
        --dockerfile "$CI_PROJECT_DIR/Dockerfile"
        --destination "$CI_REGISTRY_IMAGE:$CI_COMMIT_TAG"
        --cache=true
        --cache-repo="$CI_REGISTRY_IMAGE/cache"
```

## Integrating with GitHub Actions

```yaml
# .github/workflows/build.yaml
name: Build and Push Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" > ~/.kube/config

      - name: Build with Kaniko
        run: |
          kubectl run kaniko-build-$GITHUB_RUN_ID \
            --image=gcr.io/kaniko-project/executor:latest \
            --restart=Never \
            --overrides='{
              "spec": {
                "containers": [{
                  "name": "kaniko",
                  "image": "gcr.io/kaniko-project/executor:latest",
                  "args": [
                    "--context=git://github.com/${{ github.repository }}.git#${{ github.ref }}",
                    "--destination=docker.io/youruser/yourimage:${{ github.sha }}"
                  ]
                }]
              }
            }'
          kubectl wait --for=condition=ready pod/kaniko-build-$GITHUB_RUN_ID --timeout=5m
          kubectl logs -f kaniko-build-$GITHUB_RUN_ID
```

## Multi-Architecture Builds

Kaniko supports building for different architectures using the `--custom-platform` flag:

```yaml
args:
  - "--context=dir:///workspace"
  - "--destination=docker.io/youruser/yourimage:latest"
  - "--custom-platform=linux/arm64"
```

For multi-platform images, build once for each architecture and use `docker manifest` to create a multi-arch manifest.

## Monitoring Build Progress

```bash
# Watch the build pod logs
kubectl logs -f kaniko-build

# Check pod status and events
kubectl describe pod kaniko-build

# Get exit code
kubectl get pod kaniko-build -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}'
```

## Troubleshooting

**Build fails with "no such file or directory":**
```bash
# Check that the context path is correct
kubectl exec -it kaniko-build -- ls /workspace

# Verify the Dockerfile path is relative to the context
kubectl exec -it kaniko-build -- cat /workspace/Dockerfile
```

**Registry push fails with authentication error:**
```bash
# Verify the secret is correctly formatted
kubectl get secret regcred -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Test authentication manually
docker login docker.io -u youruser
```

**Slow builds despite caching:**
```bash
# Check if cache is being hit
# Kaniko logs show "INFO[...] Retrieving layer from cache..."
# If not, the cache repo might be wrong or TTL expired

# Verify cache repo is accessible
kubectl run test-registry --image=curlimages/curl --rm -it -- \
  curl https://docker.io/v2/youruser/yourimage-cache/manifests/latest
```

Kaniko's security model is particularly valuable in multi-tenant Kubernetes clusters where giving pods access to the Docker socket would be unacceptable. The cache mechanism keeps build times comparable to Docker daemon builds once the cache is warm.
