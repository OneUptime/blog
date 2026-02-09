# How to Build Container Images Inside Kubernetes Using Kaniko Without Docker Daemon

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kaniko, Kubernetes, Container Build, Docker, CI/CD

Description: Learn how to use Kaniko to build container images inside Kubernetes without requiring privileged Docker daemon access for secure CI/CD pipelines.

---

Building container images in Kubernetes traditionally requires running Docker-in-Docker or mounting the Docker socket, both of which create security risks. Kaniko solves this by building container images without a Docker daemon, running entirely in userspace. This makes it perfect for secure CI/CD pipelines running inside Kubernetes.

This guide shows you how to build images with Kaniko in your Kubernetes clusters.

## Why Kaniko

Traditional image building in Kubernetes has problems:

- Docker-in-Docker requires privileged containers
- Mounting Docker socket gives root access to host
- BuildKit needs complex configuration
- Security scanners flag privileged containers

Kaniko advantages:

- No daemon required
- Runs as non-root user
- Works in standard Kubernetes pods
- Supports multi-stage builds
- Compatible with Dockerfiles

## Basic Kaniko Build

Simple Pod that builds an image:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-build
spec:
  restartPolicy: Never
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    args:
      - "--dockerfile=Dockerfile"
      - "--context=git://github.com/yourorg/yourapp.git"
      - "--destination=docker.io/yourorg/yourapp:latest"
    volumeMounts:
    - name: docker-config
      mountPath: /kaniko/.docker
  volumes:
  - name: docker-config
    secret:
      secretName: docker-credentials
      items:
      - key: .dockerconfigjson
        path: config.json
```

### Docker Registry Credentials

Create secret for registry authentication:

```bash
kubectl create secret docker-registry docker-credentials \
  --docker-server=docker.io \
  --docker-username=youruser \
  --docker-password=yourpass \
  --docker-email=your@email.com
```

## Tekton Pipeline with Kaniko

Integrate Kaniko into Tekton pipelines:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: kaniko-build
spec:
  params:
    - name: image-name
      description: Name of the image to build
    - name: image-tag
      description: Tag for the image
      default: latest

  workspaces:
    - name: source
      description: Source code workspace

  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      workingDir: $(workspaces.source.path)
      env:
        - name: DOCKER_CONFIG
          value: /kaniko/.docker
      args:
        - "--dockerfile=Dockerfile"
        - "--context=$(workspaces.source.path)"
        - "--destination=$(params.image-name):$(params.image-tag)"
        - "--cache=true"
        - "--cache-ttl=24h"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker

  volumes:
    - name: docker-config
      secret:
        secretName: docker-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
```

Complete pipeline:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-push-pipeline
spec:
  params:
    - name: git-url
    - name: git-revision
      default: main
    - name: image-name

  workspaces:
    - name: source-code

  tasks:
    - name: fetch-source
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: source-code

    - name: build-image
      taskRef:
        name: kaniko-build
      params:
        - name: image-name
          value: $(params.image-name)
        - name: image-tag
          value: $(params.git-revision)
      workspaces:
        - name: source
          workspace: source-code
      runAfter:
        - fetch-source
```

## Caching for Faster Builds

Enable layer caching:

```yaml
args:
  - "--dockerfile=Dockerfile"
  - "--context=$(workspaces.source.path)"
  - "--destination=myregistry.io/myapp:latest"
  - "--cache=true"
  - "--cache-repo=myregistry.io/cache"
  - "--cache-ttl=168h"  # 1 week
```

Kaniko stores cache layers in the cache repository, dramatically speeding up subsequent builds.

## Multi-Architecture Builds

Build for multiple platforms:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multi-arch-build
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      # Build for AMD64
      - name: build-amd64
        image: gcr.io/kaniko-project/executor:latest
        args:
          - "--dockerfile=Dockerfile"
          - "--context=git://github.com/yourorg/app.git"
          - "--destination=myregistry.io/app:latest-amd64"
          - "--custom-platform=linux/amd64"
        volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker

      # Build for ARM64
      - name: build-arm64
        image: gcr.io/kaniko-project/executor:latest
        args:
          - "--dockerfile=Dockerfile"
          - "--context=git://github.com/yourorg/app.git"
          - "--destination=myregistry.io/app:latest-arm64"
          - "--custom-platform=linux/arm64"
        volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker

      volumes:
      - name: docker-config
        secret:
          secretName: docker-credentials
```

Then create a manifest:

```bash
docker manifest create myregistry.io/app:latest \
  myregistry.io/app:latest-amd64 \
  myregistry.io/app:latest-arm64

docker manifest push myregistry.io/app:latest
```

## Building from Tarball

Build from local context:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-tarball
spec:
  initContainers:
  - name: prepare-context
    image: busybox
    command: ['sh', '-c']
    args:
      - |
        tar -czf /workspace/context.tar.gz -C /source .
    volumeMounts:
    - name: source-code
      mountPath: /source
    - name: workspace
      mountPath: /workspace

  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    args:
      - "--dockerfile=Dockerfile"
      - "--context=tar:///workspace/context.tar.gz"
      - "--destination=myregistry.io/app:latest"
    volumeMounts:
    - name: workspace
      mountPath: /workspace
    - name: docker-config
      mountPath: /kaniko/.docker

  volumes:
  - name: source-code
    emptyDir: {}
  - name: workspace
    emptyDir: {}
  - name: docker-config
    secret:
      secretName: docker-credentials
```

## Custom Dockerfile Location

Specify Dockerfile path:

```yaml
args:
  - "--dockerfile=docker/Dockerfile.production"
  - "--context=git://github.com/yourorg/app.git"
  - "--destination=myregistry.io/app:prod"
```

## Build Arguments

Pass build args:

```yaml
args:
  - "--dockerfile=Dockerfile"
  - "--context=git://github.com/yourorg/app.git"
  - "--destination=myregistry.io/app:latest"
  - "--build-arg=VERSION=1.2.3"
  - "--build-arg=ENV=production"
```

In Dockerfile:

```dockerfile
ARG VERSION
ARG ENV

FROM node:18-alpine
ENV APP_VERSION=${VERSION}
ENV ENVIRONMENT=${ENV}

COPY . /app
WORKDIR /app
RUN npm install --production
CMD ["node", "server.js"]
```

## Debugging Builds

Enable verbose logging:

```yaml
args:
  - "--dockerfile=Dockerfile"
  - "--context=$(workspaces.source.path)"
  - "--destination=myregistry.io/app:latest"
  - "--verbosity=debug"
  - "--log-format=text"
```

View build logs:

```bash
kubectl logs -f kaniko-build
```

## Security Scanning Integration

Combine with Trivy for vulnerability scanning:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: secure-build
spec:
  workspaces:
    - name: source

  tasks:
    - name: build
      taskRef:
        name: kaniko-build
      workspaces:
        - name: source
          workspace: source

    - name: scan
      taskRef:
        name: trivy-scan
      params:
        - name: image
          value: "$(tasks.build.results.image-url)"
      runAfter:
        - build
```

Trivy task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: trivy-scan
spec:
  params:
    - name: image

  steps:
    - name: scan
      image: aquasec/trivy:latest
      args:
        - image
        - --severity=HIGH,CRITICAL
        - --exit-code=1
        - $(params.image)
```

## Private Git Repositories

Access private repos:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
type: kubernetes.io/basic-auth
stringData:
  username: git
  password: ghp_your_github_token
---
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-private-repo
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    args:
      - "--dockerfile=Dockerfile"
      - "--context=git://github.com/yourorg/private-repo.git"
      - "--destination=myregistry.io/app:latest"
    volumeMounts:
    - name: git-credentials
      mountPath: /root/.git-credentials
      subPath: .git-credentials
    - name: docker-config
      mountPath: /kaniko/.docker
  volumes:
  - name: git-credentials
    secret:
      secretName: git-credentials
  - name: docker-config
    secret:
      secretName: docker-credentials
```

## Resource Limits

Set appropriate resource limits:

```yaml
containers:
- name: kaniko
  image: gcr.io/kaniko-project/executor:latest
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

Large builds need more memory.

## Best Practices

1. **Use cache**: Enable layer caching for faster builds
2. **Pin versions**: Use specific Kaniko image tags, not latest
3. **Clean context**: Exclude unnecessary files with .dockerignore
4. **Scan images**: Always scan built images for vulnerabilities
5. **Limit resources**: Set memory limits to prevent OOM kills
6. **Use workspaces**: Persistent volumes for build context
7. **Monitor builds**: Track build duration and success rates

## Troubleshooting

**Out of memory errors:**
```yaml
# Increase memory limit
resources:
  limits:
    memory: "4Gi"
```

**Slow builds:**
```yaml
# Enable caching
args:
  - "--cache=true"
  - "--cache-repo=myregistry.io/cache"
```

**Permission denied:**
```yaml
# Kaniko runs as non-root by default
# If you need root, add:
securityContext:
  runAsUser: 0
```

**Registry authentication fails:**
```bash
# Verify secret format
kubectl get secret docker-credentials -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

## Conclusion

Kaniko brings secure container image building to Kubernetes without requiring privileged access or Docker daemons. It integrates seamlessly with Tekton pipelines, supports standard Dockerfiles, and provides layer caching for fast builds. For CI/CD running inside Kubernetes, Kaniko is the secure choice that doesn't compromise on features or performance. Start with simple builds, enable caching, and integrate vulnerability scanning for production-ready container image pipelines.
