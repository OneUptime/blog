# How to Use Docker Build and Push in Kubernetes CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kubernetes, CI/CD, Container Build, Kaniko, BuildKit, GitHub Actions, DevOps

Description: Practical approaches to building and pushing Docker images within Kubernetes CI/CD pipelines using Kaniko, BuildKit, and more.

---

Building Docker images inside a Kubernetes-based CI/CD pipeline presents a unique challenge. The traditional approach of running `docker build` requires access to a Docker daemon, but running Docker inside a container (Docker-in-Docker) has security implications. Fortunately, several tools solve this problem without requiring privileged containers or a Docker socket mount.

This guide covers the most practical methods for building and pushing Docker images from within Kubernetes pods, including Kaniko, BuildKit, and integration with popular CI/CD systems.

## The Problem with Docker-in-Docker

The naive approach mounts the host's Docker socket into a CI pod:

```yaml
# DO NOT use this in production - security risk
volumes:
  - hostPath:
      path: /var/run/docker.sock
    name: docker-socket
```

This gives the CI pod full control over the host's Docker daemon, meaning any container can access any other container on that host, pull secrets, or even escape the container boundary. For production clusters, this is unacceptable.

## Method 1: Kaniko (Recommended)

Kaniko is Google's tool for building container images inside Kubernetes without needing a Docker daemon. It runs entirely in user space and builds images from a Dockerfile, then pushes the result directly to a registry.

### Setting Up Registry Credentials

Kaniko needs credentials to push to your registry. Create a Kubernetes secret from your Docker config:

```bash
# Create a secret with Docker Hub credentials for Kaniko
kubectl create secret docker-registry kaniko-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myuser \
  --docker-password=mytoken \
  -n ci
```

### Running a Kaniko Build Job

Here is a Kubernetes Job that builds and pushes a Docker image:

```yaml
# kaniko-build-job.yaml - Build and push using Kaniko
apiVersion: batch/v1
kind: Job
metadata:
  name: build-myapp
  namespace: ci
spec:
  backoffLimit: 2
  template:
    spec:
      containers:
        - name: kaniko
          image: gcr.io/kaniko-project/executor:latest
          args:
            # Path to the Dockerfile (relative to the build context)
            - "--dockerfile=Dockerfile"
            # Build context - where the source code lives
            - "--context=git://github.com/myorg/myapp.git#refs/heads/main"
            # Destination registry and tag
            - "--destination=myuser/myapp:v1.0"
            - "--destination=myuser/myapp:latest"
            # Cache layers in the registry for faster builds
            - "--cache=true"
            - "--cache-repo=myuser/myapp-cache"
          volumeMounts:
            - name: kaniko-secret
              mountPath: /kaniko/.docker
      restartPolicy: Never
      volumes:
        - name: kaniko-secret
          secret:
            secretName: kaniko-secret
            items:
              - key: .dockerconfigjson
                path: config.json
```

Kaniko supports several context sources:

- **Git**: `git://github.com/org/repo.git#refs/heads/branch`
- **S3**: `s3://bucket/path/to/context.tar.gz`
- **GCS**: `gs://bucket/path/to/context.tar.gz`
- **Local directory**: Mount source code as a volume

### Using a Local Build Context

When your CI runner clones the repository, mount it into the Kaniko container:

```yaml
# kaniko-with-local-context.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: build-local
spec:
  template:
    spec:
      initContainers:
        # Clone the repository first
        - name: git-clone
          image: alpine/git:latest
          command: ["git", "clone", "--depth=1", "https://github.com/myorg/myapp.git", "/workspace"]
          volumeMounts:
            - name: workspace
              mountPath: /workspace
      containers:
        - name: kaniko
          image: gcr.io/kaniko-project/executor:latest
          args:
            - "--dockerfile=/workspace/Dockerfile"
            - "--context=dir:///workspace"
            - "--destination=myuser/myapp:v1.0"
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: kaniko-secret
              mountPath: /kaniko/.docker
      restartPolicy: Never
      volumes:
        - name: workspace
          emptyDir: {}
        - name: kaniko-secret
          secret:
            secretName: kaniko-secret
            items:
              - key: .dockerconfigjson
                path: config.json
```

## Method 2: BuildKit with buildkitd

BuildKit is the modern build engine behind `docker build`. You can run it as a standalone daemon in Kubernetes and send build requests to it.

Deploy BuildKit as a StatefulSet:

```yaml
# buildkitd.yaml - BuildKit daemon running in Kubernetes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: buildkitd
  namespace: ci
spec:
  replicas: 1
  serviceName: buildkitd
  selector:
    matchLabels:
      app: buildkitd
  template:
    metadata:
      labels:
        app: buildkitd
    spec:
      containers:
        - name: buildkitd
          image: moby/buildkit:latest
          args:
            - "--addr"
            - "unix:///run/buildkit/buildkitd.sock"
            - "--addr"
            - "tcp://0.0.0.0:1234"
          # BuildKit needs some elevated permissions for overlay filesystem
          securityContext:
            privileged: true
          ports:
            - containerPort: 1234
          volumeMounts:
            - name: buildkit-state
              mountPath: /var/lib/buildkit
  volumeClaimTemplates:
    - metadata:
        name: buildkit-state
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
---
# Service to expose BuildKit daemon
apiVersion: v1
kind: Service
metadata:
  name: buildkitd
  namespace: ci
spec:
  selector:
    app: buildkitd
  ports:
    - port: 1234
      targetPort: 1234
```

Send builds to the daemon using the `buildctl` CLI:

```bash
# Build and push using a remote BuildKit daemon
buildctl --addr tcp://buildkitd.ci.svc.cluster.local:1234 \
  build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --output type=image,name=myuser/myapp:v1.0,push=true
```

## Method 3: GitHub Actions with Kubernetes Runners

If you use GitHub Actions, you can run self-hosted runners in Kubernetes with Actions Runner Controller (ARC) and build Docker images using standard GitHub Actions.

```yaml
# .github/workflows/build.yml - Build and push with GitHub Actions
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            myuser/myapp:${{ github.sha }}
            myuser/myapp:latest
          # Enable layer caching
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Kubernetes
        run: |
          # Update the deployment with the new image tag
          kubectl set image deployment/myapp \
            myapp=myuser/myapp:${{ github.sha }}
          kubectl rollout status deployment/myapp
```

## Integrating Build and Deploy

A complete CI/CD pipeline builds the image and then updates the Kubernetes deployment. Here is a Tekton Pipeline example:

```yaml
# tekton-pipeline.yaml - Build and deploy pipeline
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-and-deploy
spec:
  params:
    - name: repo-url
      type: string
    - name: image-name
      type: string
    - name: image-tag
      type: string
  workspaces:
    - name: source
    - name: docker-credentials
  tasks:
    # Clone the source code
    - name: fetch-source
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.repo-url)
      workspaces:
        - name: output
          workspace: source

    # Build and push the Docker image using Kaniko
    - name: build-image
      taskRef:
        name: kaniko
      runAfter: ["fetch-source"]
      params:
        - name: IMAGE
          value: $(params.image-name):$(params.image-tag)
        - name: EXTRA_ARGS
          value:
            - "--cache=true"
      workspaces:
        - name: source
          workspace: source
        - name: dockerconfig
          workspace: docker-credentials

    # Update the Kubernetes deployment
    - name: deploy
      runAfter: ["build-image"]
      taskRef:
        name: kubernetes-actions
      params:
        - name: script
          value: |
            kubectl set image deployment/myapp \
              myapp=$(params.image-name):$(params.image-tag)
            kubectl rollout status deployment/myapp
```

## Build Caching Strategies

Slow builds kill developer productivity. Here are proven caching strategies for Kubernetes-based builds.

**Registry-based caching with Kaniko:**

```bash
# Kaniko args for registry-based layer caching
--cache=true
--cache-repo=myuser/myapp-cache
--cache-ttl=168h
```

**Multi-stage build optimization:**

```dockerfile
# Dockerfile optimized for layer caching
FROM node:20-alpine AS deps
WORKDIR /app
# Copy only package files first (changes less often)
COPY package*.json ./
RUN npm ci

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Source code changes more often, so this layer rebuilds frequently
COPY . .
CMD ["node", "server.js"]
```

**BuildKit inline caching:**

```bash
# Build with inline cache metadata, then use it on the next build
docker buildx build \
  --cache-from type=registry,ref=myuser/myapp:cache \
  --cache-to type=inline \
  -t myuser/myapp:v1.0 \
  --push .
```

## Security Best Practices

- Use Kaniko or BuildKit rootless mode instead of Docker-in-Docker
- Store registry credentials in Kubernetes Secrets, not in pipeline scripts
- Scan built images for vulnerabilities before pushing (use Trivy or Grype)
- Sign images with Cosign for supply chain security
- Use read-only file systems where possible
- Limit build pod resources to prevent resource exhaustion

## Conclusion

Building Docker images inside Kubernetes CI/CD pipelines no longer requires the Docker daemon. Kaniko provides the simplest, most secure approach for most teams, requiring zero privileged access while supporting all Dockerfile features. BuildKit offers more flexibility and speed for complex build scenarios. Whichever tool you choose, the pattern is the same: clone code, build image, push to registry, update deployment. With proper caching, builds complete in seconds rather than minutes, keeping your CI/CD pipeline fast and your developers productive.
