# How to Set Up Buildah for Rootless Container Image Builds in Kubernetes CI Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildah, Kubernetes, Rootless, Container Build, CI/CD

Description: Learn how to use Buildah for rootless container image builds in Kubernetes CI/CD pipelines without privileged access or Docker daemon requirements.

---

Buildah is Red Hat's answer to secure container image building. Like Kaniko, it doesn't require a Docker daemon. Unlike Kaniko, Buildah gives you fine-grained control over image layers and supports both Dockerfile and scripted builds. When run in rootless mode, Buildah provides maximum security for Kubernetes CI/CD pipelines.

This guide shows you how to use Buildah for secure, rootless builds in Kubernetes.

## Why Buildah

Buildah advantages over other builders:

- True rootless operation with user namespaces
- No daemon required
- OCI-compliant images
- Dockerfile and script-based builds
- Fine-grained layer control
- Mount and commit workflow
- Compatible with Podman

Perfect for security-conscious Kubernetes environments.

## Basic Buildah Pod

Simple rootless build:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: buildah-build
spec:
  containers:
  - name: buildah
    image: quay.io/buildah/stable:latest
    command: ['sh', '-c']
    args:
      - |
        git clone https://github.com/yourorg/app.git /workspace
        cd /workspace
        buildah bud -t myapp:latest .
        buildah push myapp:latest docker://registry.io/yourorg/myapp:latest
    securityContext:
      runAsUser: 1000
      runAsGroup: 1000
      capabilities:
        add:
          - SETUID
          - SETGID
    volumeMounts:
    - name: varlibcontainers
      mountPath: /var/lib/containers
    - name: registry-config
      mountPath: /home/build/.docker
  volumes:
  - name: varlibcontainers
    emptyDir: {}
  - name: registry-config
    secret:
      secretName: registry-credentials
```

## Buildah with Tekton

Create a reusable Tekton task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: buildah-build-push
spec:
  params:
    - name: IMAGE
      description: Reference of the image to build
    - name: DOCKERFILE
      description: Path to Dockerfile
      default: ./Dockerfile
    - name: CONTEXT
      description: Path to build context
      default: .
    - name: TLSVERIFY
      description: Verify TLS on registry
      default: "true"

  workspaces:
    - name: source

  steps:
    - name: build
      image: quay.io/buildah/stable:latest
      workingDir: $(workspaces.source.path)
      script: |
        #!/usr/bin/env bash
        set -e

        echo "Building image $(params.IMAGE)"

        buildah --storage-driver=vfs bud \
          --format=oci \
          --tls-verify=$(params.TLSVERIFY) \
          --no-cache \
          -f $(params.DOCKERFILE) \
          -t $(params.IMAGE) \
          $(params.CONTEXT)

        echo "Pushing image to registry"

        buildah --storage-driver=vfs push \
          --tls-verify=$(params.TLSVERIFY) \
          $(params.IMAGE) \
          docker://$(params.IMAGE)

      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        capabilities:
          add:
            - SETUID
            - SETGID

      volumeMounts:
        - name: varlibcontainers
          mountPath: /var/lib/containers

      env:
        - name: STORAGE_DRIVER
          value: vfs
        - name: BUILDAH_ISOLATION
          value: chroot
        - name: REGISTRY_AUTH_FILE
          value: /tekton/home/.docker/config.json

  volumes:
    - name: varlibcontainers
      emptyDir: {}
```

## Registry Authentication

Create authentication secret:

```bash
# Docker Hub
kubectl create secret generic registry-credentials \
  --from-file=config.json=<(echo '{
    "auths": {
      "docker.io": {
        "auth": "'$(echo -n "username:password" | base64)'"
      }
    }
  }')

# Quay.io
kubectl create secret generic registry-credentials \
  --from-file=config.json=<(echo '{
    "auths": {
      "quay.io": {
        "auth": "'$(echo -n "username:token" | base64)'"
      }
    }
  }')
```

Mount in pod:

```yaml
volumeMounts:
  - name: registry-auth
    mountPath: /tekton/home/.docker
    readOnly: true
volumes:
  - name: registry-auth
    secret:
      secretName: registry-credentials
```

## Storage Driver Configuration

For rootless builds, use `vfs` storage driver:

```bash
buildah --storage-driver=vfs bud -t myapp .
```

Or configure in `/etc/containers/storage.conf`:

```toml
[storage]
driver = "vfs"

[storage.options]
mount_program = "/usr/bin/fuse-overlayfs"
```

## Complete Pipeline Example

Full Tekton pipeline with Buildah:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-and-deploy
spec:
  params:
    - name: git-url
      description: Git repository URL
    - name: git-revision
      description: Git revision to build
      default: main
    - name: image-name
      description: Container image name

  workspaces:
    - name: shared-workspace

  tasks:
    # Clone source code
    - name: fetch-repository
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: shared-workspace

    # Run tests
    - name: run-tests
      taskRef:
        name: golang-test
      workspaces:
        - name: source
          workspace: shared-workspace
      runAfter:
        - fetch-repository

    # Build image with Buildah
    - name: build-image
      taskRef:
        name: buildah-build-push
      params:
        - name: IMAGE
          value: $(params.image-name):$(params.git-revision)
        - name: DOCKERFILE
          value: ./Dockerfile
      workspaces:
        - name: source
          workspace: shared-workspace
      runAfter:
        - run-tests

    # Scan for vulnerabilities
    - name: scan-image
      taskRef:
        name: trivy-scan
      params:
        - name: IMAGE
          value: $(params.image-name):$(params.git-revision)
      runAfter:
        - build-image
```

## Multi-Stage Builds

Buildah handles multi-stage Dockerfiles:

```dockerfile
# Dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server

FROM alpine:3.18
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/server /usr/local/bin/
ENTRYPOINT ["server"]
```

Build with Buildah:

```bash
buildah bud -t myapp:latest .
```

## Scripted Builds

For more control, use Buildah commands directly:

```yaml
script: |
  #!/usr/bin/env bash
  set -e

  # Create new container
  container=$(buildah from alpine:latest)

  # Install dependencies
  buildah run $container apk add --no-cache python3 py3-pip

  # Copy application
  buildah copy $container . /app

  # Install Python packages
  buildah run $container pip3 install -r /app/requirements.txt

  # Set working directory and command
  buildah config --workingdir /app $container
  buildah config --cmd "python3 app.py" $container

  # Set labels
  buildah config --label version=1.0.0 $container
  buildah config --label maintainer=team@company.com $container

  # Commit image
  buildah commit $container myapp:latest

  # Push to registry
  buildah push myapp:latest docker://registry.io/org/myapp:latest

  # Cleanup
  buildah rm $container
```

This approach gives fine-grained control over each layer.

## Caching Strategies

Use bind mounts for caching:

```yaml
volumeMounts:
  - name: buildah-cache
    mountPath: /var/lib/containers
  - name: go-cache
    mountPath: /go/pkg/mod

volumes:
  - name: buildah-cache
    persistentVolumeClaim:
      claimName: buildah-cache-pvc
  - name: go-cache
    persistentVolumeClaim:
      claimName: go-cache-pvc
```

Create PVCs:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: buildah-cache-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: go-cache-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

## Rootless Configuration

Enable proper rootless operation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: buildah-rootless
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000

  containers:
  - name: buildah
    image: quay.io/buildah/stable:latest
    securityContext:
      capabilities:
        add:
          - SETUID
          - SETGID
      allowPrivilegeEscalation: false
      runAsNonRoot: true

    env:
      - name: BUILDAH_ISOLATION
        value: chroot
      - name: STORAGE_DRIVER
        value: vfs

    volumeMounts:
      - name: varlibcontainers
        mountPath: /var/lib/containers

  volumes:
    - name: varlibcontainers
      emptyDir: {}
```

## Building for Multiple Architectures

Cross-platform builds with Buildah:

```bash
# For ARM64
buildah bud \
  --arch=arm64 \
  --os=linux \
  -t myapp:latest-arm64 \
  .

# For AMD64
buildah bud \
  --arch=amd64 \
  --os=linux \
  -t myapp:latest-amd64 \
  .

# Create manifest
buildah manifest create myapp:latest
buildah manifest add myapp:latest myapp:latest-arm64
buildah manifest add myapp:latest myapp:latest-amd64

# Push manifest
buildah manifest push --all myapp:latest docker://registry.io/org/myapp:latest
```

## Debugging Builds

Enable verbose output:

```bash
buildah --log-level=debug bud -t myapp .
```

Inspect intermediate containers:

```bash
# List containers
buildah containers

# Run shell in container
buildah run <container-id> /bin/sh

# Inspect changes
buildah diff <container-id>
```

## Resource Requirements

Set appropriate limits:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

Builds with many layers need more memory.

## Best Practices

1. **Use VFS storage driver**: Most compatible for rootless
2. **Enable caching**: Use persistent volumes for build cache
3. **Pin base images**: Use specific tags, not latest
4. **Minimize layers**: Combine RUN commands
5. **Clean up**: Remove intermediate containers
6. **Scan images**: Integrate vulnerability scanning
7. **Use .dockerignore**: Exclude unnecessary files

## Troubleshooting

**Permission errors:**
```yaml
# Ensure capabilities are added
securityContext:
  capabilities:
    add:
      - SETUID
      - SETGID
```

**Slow builds:**
```bash
# Use overlay storage if possible
buildah --storage-driver=overlay bud -t myapp .
```

**Registry push fails:**
```bash
# Verify auth file exists
ls -la /tekton/home/.docker/config.json

# Test authentication
buildah login registry.io
```

**Out of space:**
```bash
# Clean up old images
buildah rmi --prune

# Use smaller base images
FROM alpine:3.18  # Instead of ubuntu
```

## Conclusion

Buildah brings true rootless container building to Kubernetes with fine-grained control over the build process. Whether using Dockerfiles or scripted builds, Buildah provides security without sacrificing features. The VFS storage driver and proper capability configuration enable completely unprivileged operation. For Kubernetes CI/CD pipelines prioritizing security, Buildah offers the best balance of control, compatibility, and safety.
