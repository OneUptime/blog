# How to Set Up Kaniko for Image Building on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kaniko, Container Image, Kubernetes, CI/CD

Description: Learn how to set up Kaniko on Talos Linux for building container images inside Kubernetes without requiring Docker-in-Docker or privileged containers.

---

Building container images inside Kubernetes has traditionally required either Docker-in-Docker (which needs privileged access) or mounting the Docker socket (which exposes the host). Neither option is acceptable on a security-focused platform like Talos Linux. Kaniko solves this problem by building container images entirely in userspace, without needing a Docker daemon or privileged access. It runs as a regular container, reads a Dockerfile, and pushes the built image to a registry.

This guide covers setting up Kaniko on Talos Linux for building container images in your CI/CD pipelines.

## Why Kaniko on Talos Linux

Talos Linux does not have a Docker daemon. The container runtime is containerd, and there is no way to run Docker commands on the host. Even if you could, running privileged containers or mounting host sockets would undermine the security model that makes Talos valuable in the first place.

Kaniko builds images from a Dockerfile within a standard, unprivileged container. It does not need the Docker daemon, it does not need privileged access, and it does not need to mount any host paths. This makes it the ideal image building tool for Talos Linux.

## How Kaniko Works

Kaniko executes each command in a Dockerfile in userspace:

1. It reads the Dockerfile and parses the instructions
2. For each instruction, it executes the command in the container's filesystem
3. After each command, it takes a snapshot of the filesystem changes
4. The snapshots become layers in the final container image
5. The built image is pushed directly to a container registry

There is no daemon, no socket, and no privilege escalation involved.

## Prerequisites

Before starting, ensure you have:

- A Talos Linux cluster with kubectl configured
- A container registry (Docker Hub, GitHub Container Registry, Harbor, etc.)
- Registry credentials stored as a Kubernetes secret
- A Git repository with a Dockerfile

## Setting Up Registry Credentials

Kaniko needs credentials to push images to your registry.

```bash
# Create a Docker config secret
kubectl create secret docker-registry kaniko-registry-credentials \
  --namespace ci \
  --docker-server=registry.example.com \
  --docker-username=your-username \
  --docker-password=your-password

# Alternatively, create from an existing Docker config
kubectl create secret generic kaniko-registry-credentials \
  --namespace ci \
  --from-file=config.json=$HOME/.docker/config.json
```

## Basic Kaniko Build

Run a simple Kaniko build as a Kubernetes pod.

```yaml
# kaniko-build-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-build
  namespace: ci
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        # Build context from the workspace
        - --context=dir:///workspace
        # Path to the Dockerfile
        - --dockerfile=/workspace/Dockerfile
        # Destination image
        - --destination=registry.example.com/myapp:latest
      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: docker-config
          mountPath: /kaniko/.docker
  restartPolicy: Never
  volumes:
    - name: workspace
      persistentVolumeClaim:
        claimName: build-workspace
    - name: docker-config
      secret:
        secretName: kaniko-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
```

```bash
# Run the build
kubectl apply -f kaniko-build-pod.yaml

# Watch the build logs
kubectl logs -n ci kaniko-build -f

# Check the pod status
kubectl get pod -n ci kaniko-build
```

## Kaniko with Git Context

Kaniko can clone a Git repository directly as the build context.

```yaml
# kaniko-git-build.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-git-build
  namespace: ci
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        # Clone from Git directly
        - --context=git://github.com/myorg/myapp.git#refs/heads/main
        - --dockerfile=Dockerfile
        - --destination=registry.example.com/myapp:latest
        # Git credentials if needed
        - --git=branch=main
      env:
        - name: GIT_USERNAME
          valueFrom:
            secretKeyRef:
              name: git-credentials
              key: username
        - name: GIT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: git-credentials
              key: password
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  restartPolicy: Never
  volumes:
    - name: docker-config
      secret:
        secretName: kaniko-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
```

## Enabling Build Caching

Kaniko supports layer caching through a remote registry. This dramatically speeds up rebuilds.

```yaml
# kaniko-cached-build.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-cached-build
  namespace: ci
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --context=dir:///workspace
        - --dockerfile=/workspace/Dockerfile
        - --destination=registry.example.com/myapp:v1.2.3
        # Enable caching
        - --cache=true
        # Where to store cache layers
        - --cache-repo=registry.example.com/myapp/cache
        # Cache TTL (168 hours = 7 days)
        - --cache-ttl=168h
        # Cache copy layers too (improves cache hits)
        - --cache-copy-layers
      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: docker-config
          mountPath: /kaniko/.docker
  restartPolicy: Never
  volumes:
    - name: workspace
      persistentVolumeClaim:
        claimName: build-workspace
    - name: docker-config
      secret:
        secretName: kaniko-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
```

## Multi-Stage Builds

Kaniko fully supports multi-stage Dockerfiles.

```dockerfile
# Dockerfile
# Build stage
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Runtime stage
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/server /usr/local/bin/server
USER 65534
ENTRYPOINT ["server"]
```

Kaniko handles multi-stage builds automatically, building each stage and carrying artifacts forward as specified in the Dockerfile.

## Integrating Kaniko with CI/CD Pipelines

### With Tekton

```yaml
# kaniko-tekton-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: kaniko-build
spec:
  params:
    - name: IMAGE
      description: Name and tag of the image to build
    - name: DOCKERFILE
      description: Path to the Dockerfile
      default: ./Dockerfile
  workspaces:
    - name: source
    - name: docker-credentials
  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --dockerfile=$(params.DOCKERFILE)
        - --context=$(workspaces.source.path)
        - --destination=$(params.IMAGE)
        - --cache=true
        - --cache-repo=$(params.IMAGE)-cache
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      secret:
        secretName: docker-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
```

### With GitLab CI

```yaml
# .gitlab-ci.yml
build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - mkdir -p /kaniko/.docker
    - echo "{\"auths\":{\"${CI_REGISTRY}\":{\"auth\":\"$(echo -n ${CI_REGISTRY_USER}:${CI_REGISTRY_PASSWORD} | base64)\"}}}" > /kaniko/.docker/config.json
    - /kaniko/executor
      --context ${CI_PROJECT_DIR}
      --dockerfile ${CI_PROJECT_DIR}/Dockerfile
      --destination ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
      --destination ${CI_REGISTRY_IMAGE}:latest
      --cache=true
      --cache-repo=${CI_REGISTRY_IMAGE}/cache
```

### With Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command:
        - /busybox/cat
      tty: true
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      secret:
        secretName: docker-registry-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
'''
        }
    }
    stages {
        stage('Build Image') {
            steps {
                container('kaniko') {
                    sh '''
                        /kaniko/executor \
                          --context=dir://${WORKSPACE} \
                          --destination=registry.example.com/myapp:${BUILD_NUMBER} \
                          --cache=true
                    '''
                }
            }
        }
    }
}
```

## Building Multiple Images

Build multiple images from the same repository.

```yaml
# multi-image-build.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multi-image-build
  namespace: ci
spec:
  template:
    spec:
      initContainers:
        # Clone the repo first
        - name: clone
          image: alpine/git:latest
          command: ["git", "clone", "https://github.com/myorg/myapp.git", "/workspace"]
          volumeMounts:
            - name: workspace
              mountPath: /workspace
      containers:
        # Build the API image
        - name: build-api
          image: gcr.io/kaniko-project/executor:latest
          args:
            - --context=dir:///workspace
            - --dockerfile=/workspace/cmd/api/Dockerfile
            - --destination=registry.example.com/myapp-api:latest
            - --cache=true
            - --cache-repo=registry.example.com/myapp-api/cache
          volumeMounts:
            - name: workspace
              mountPath: /workspace
              readOnly: true
            - name: docker-config
              mountPath: /kaniko/.docker

        # Build the worker image
        - name: build-worker
          image: gcr.io/kaniko-project/executor:latest
          args:
            - --context=dir:///workspace
            - --dockerfile=/workspace/cmd/worker/Dockerfile
            - --destination=registry.example.com/myapp-worker:latest
            - --cache=true
            - --cache-repo=registry.example.com/myapp-worker/cache
          volumeMounts:
            - name: workspace
              mountPath: /workspace
              readOnly: true
            - name: docker-config
              mountPath: /kaniko/.docker
      restartPolicy: Never
      volumes:
        - name: workspace
          emptyDir: {}
        - name: docker-config
          secret:
            secretName: kaniko-registry-credentials
            items:
              - key: .dockerconfigjson
                path: config.json
```

## Kaniko Build Arguments and Optimization

```yaml
args:
  # Use compressed layers for smaller images
  - --compressed-caching
  # Reproduce builds with specific snapshot mode
  - --snapshot-mode=redo
  # Skip TLS verification for internal registries
  - --skip-tls-verify
  # Build arguments
  - --build-arg=VERSION=1.2.3
  - --build-arg=COMMIT_SHA=abc123
  # Target a specific build stage
  - --target=runtime
  # Custom labels
  - --label=maintainer=team@example.com
  - --label=build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

## Troubleshooting

```bash
# Use the debug image for interactive troubleshooting
kubectl run kaniko-debug \
  --image=gcr.io/kaniko-project/executor:debug \
  --restart=Never \
  --rm -it \
  -- /busybox/sh

# Check build logs for errors
kubectl logs kaniko-build -n ci

# Common issues:
# 1. Registry auth failure - verify the docker config secret
# 2. Context not found - check volume mounts
# 3. OOM kills - increase memory limits for large builds
```

## Wrapping Up

Kaniko is the standard tool for building container images on Talos Linux. It requires no privileged access, no Docker daemon, and no host mounts, making it perfectly compatible with Talos's security model. With remote layer caching enabled, rebuild times drop dramatically, making Kaniko comparable in speed to local Docker builds. Integrate it with your CI/CD pipeline of choice, configure caching for your most frequently built images, and let Kaniko handle image building while Talos handles the secure execution environment underneath.
