# How to Configure Build Caching on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Build Caching, CI/CD, Kubernetes, Performance

Description: Learn how to configure build caching strategies on Talos Linux to speed up CI/CD pipelines, container builds, and dependency resolution in Kubernetes.

---

Build caching is one of the most effective ways to speed up CI/CD pipelines. Without caching, every build starts from scratch - downloading dependencies, compiling source code, and building container layers all over again. On Talos Linux, where ephemeral build pods are created and destroyed for each job, caching becomes even more important because there is no persistent local state between builds.

This guide covers setting up different caching strategies on Talos Linux, from simple shared volumes to distributed cache servers that work across nodes and build tools.

## Why Build Caching on Talos Linux Needs Special Attention

In a traditional CI server, the build machine persists between builds, so caches naturally accumulate on disk. In Kubernetes, and especially on Talos Linux, build pods are ephemeral. When a build pod finishes, it is destroyed along with any files it created. This means you need explicit caching mechanisms to persist data between builds.

Talos Linux also has an immutable filesystem, so you cannot cache anything on the host nodes directly. Every caching solution must use Kubernetes volumes, network storage, or dedicated cache services.

## Approach 1: Persistent Volume Claims

The simplest caching approach is a shared PVC that build pods mount to access cached data.

```yaml
# build-cache-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: build-cache
  namespace: ci
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: nfs
```

Use this PVC in your build pods.

```yaml
# build-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: build-job
  namespace: ci
spec:
  containers:
    - name: builder
      image: golang:1.22
      command: ["sh", "-c"]
      args:
        - |
          # Set the Go module cache to the shared volume
          export GOMODCACHE=/cache/go-mod
          export GOCACHE=/cache/go-build
          mkdir -p $GOMODCACHE $GOCACHE

          # Build with cached dependencies
          go mod download
          go build -o /output/app ./cmd/server
      volumeMounts:
        - name: cache
          mountPath: /cache
        - name: output
          mountPath: /output
  volumes:
    - name: cache
      persistentVolumeClaim:
        claimName: build-cache
    - name: output
      emptyDir: {}
```

This works well for single-node setups but requires a storage class that supports ReadWriteMany (like NFS) for multi-node clusters.

## Approach 2: MinIO as a Distributed Cache Server

MinIO provides S3-compatible object storage that any build tool can use for caching. It works across all nodes in your Talos cluster.

```bash
# Deploy MinIO for build caching
helm repo add minio https://charts.min.io/

helm install minio minio/minio \
  --namespace minio \
  --create-namespace \
  --set rootUser=minioadmin \
  --set rootPassword=minioadmin \
  --set persistence.size=100Gi \
  --set persistence.storageClass=local-path \
  --set resources.requests.memory=512Mi \
  --set defaultBuckets="build-cache\,go-cache\,npm-cache\,docker-cache"
```

### Using MinIO with GitLab Runner

```yaml
# GitLab Runner cache configuration
runners:
  config: |
    [[runners]]
      [runners.cache]
        Type = "s3"
        Shared = true
        [runners.cache.s3]
          ServerAddress = "minio.minio.svc:9000"
          BucketName = "build-cache"
          BucketLocation = "us-east-1"
          Insecure = true
          AccessKey = "minioadmin"
          SecretKey = "minioadmin"
```

### Using MinIO with Tekton

```yaml
# Tekton task with S3 cache
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: go-build-cached
spec:
  workspaces:
    - name: source
  params:
    - name: cache-bucket
      default: "go-cache"
  steps:
    # Step 1: Restore cache from MinIO
    - name: restore-cache
      image: minio/mc:latest
      script: |
        #!/bin/sh
        mc alias set cache http://minio.minio.svc:9000 minioadmin minioadmin
        mc cp --recursive cache/$(params.cache-bucket)/mod/ /cache/go-mod/ || true
        mc cp --recursive cache/$(params.cache-bucket)/build/ /cache/go-build/ || true
      volumeMounts:
        - name: cache
          mountPath: /cache

    # Step 2: Build with cache
    - name: build
      image: golang:1.22
      env:
        - name: GOMODCACHE
          value: /cache/go-mod
        - name: GOCACHE
          value: /cache/go-build
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        go mod download
        go build -v ./...
        go test -v ./...
      volumeMounts:
        - name: cache
          mountPath: /cache

    # Step 3: Save cache to MinIO
    - name: save-cache
      image: minio/mc:latest
      script: |
        #!/bin/sh
        mc alias set cache http://minio.minio.svc:9000 minioadmin minioadmin
        mc mirror /cache/go-mod/ cache/$(params.cache-bucket)/mod/
        mc mirror /cache/go-build/ cache/$(params.cache-bucket)/build/
      volumeMounts:
        - name: cache
          mountPath: /cache

  volumes:
    - name: cache
      emptyDir:
        sizeLimit: 5Gi
```

## Approach 3: Container Layer Caching

Container image builds benefit significantly from layer caching. On Talos Linux, where local Docker caches do not persist, use remote cache backends.

### Kaniko with Remote Cache

```yaml
# kaniko-build-with-cache.yaml
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
        - --dockerfile=Dockerfile
        - --context=dir:///workspace
        - --destination=registry.example.com/myapp:latest
        # Enable remote layer caching
        - --cache=true
        - --cache-repo=registry.example.com/myapp/cache
        # Cache TTL in hours
        - --cache-ttl=168h
      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: workspace
      persistentVolumeClaim:
        claimName: build-workspace
    - name: docker-config
      secret:
        secretName: docker-registry-credentials
```

### BuildKit with Registry Cache

```yaml
# buildkit-cache-config.yaml
apiVersion: v1
kind: Pod
metadata:
  name: buildkit-build
  namespace: ci
spec:
  containers:
    - name: buildkit
      image: moby/buildkit:latest
      securityContext:
        privileged: true
      command: ["buildctl"]
      args:
        - build
        - --frontend=dockerfile.v0
        - --local=context=/workspace
        - --local=dockerfile=/workspace
        - --output=type=image,name=registry.example.com/myapp:latest,push=true
        # Use registry as cache backend
        - --export-cache=type=registry,ref=registry.example.com/myapp:buildcache
        - --import-cache=type=registry,ref=registry.example.com/myapp:buildcache
```

## Approach 4: Language-Specific Caching

### Go Module Cache

```yaml
# go-cache-job.yaml
containers:
  - name: go-builder
    image: golang:1.22
    env:
      - name: GOMODCACHE
        value: /cache/go/mod
      - name: GOCACHE
        value: /cache/go/build
    volumeMounts:
      - name: go-cache
        mountPath: /cache/go
volumes:
  - name: go-cache
    persistentVolumeClaim:
      claimName: go-module-cache
```

### npm/yarn Cache

```yaml
# node-cache-job.yaml
containers:
  - name: node-builder
    image: node:20
    env:
      - name: npm_config_cache
        value: /cache/npm
      - name: YARN_CACHE_FOLDER
        value: /cache/yarn
    command: ["sh", "-c"]
    args:
      - |
        npm ci --prefer-offline
        npm run build
        npm test
    volumeMounts:
      - name: npm-cache
        mountPath: /cache
volumes:
  - name: npm-cache
    persistentVolumeClaim:
      claimName: npm-cache
```

### Python pip Cache

```yaml
# python-cache-job.yaml
containers:
  - name: python-builder
    image: python:3.12
    env:
      - name: PIP_CACHE_DIR
        value: /cache/pip
    command: ["sh", "-c"]
    args:
      - |
        pip install -r requirements.txt
        python -m pytest
    volumeMounts:
      - name: pip-cache
        mountPath: /cache/pip
```

## Cache Maintenance

Caches grow over time and need periodic cleanup.

```yaml
# cache-cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-cleanup
  namespace: ci
spec:
  schedule: "0 3 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: minio/mc:latest
              command: ["sh", "-c"]
              args:
                - |
                  # Configure MinIO client
                  mc alias set cache http://minio.minio.svc:9000 minioadmin minioadmin

                  # Remove cache entries older than 7 days
                  mc rm --recursive --older-than 7d cache/build-cache/
                  mc rm --recursive --older-than 7d cache/go-cache/
                  mc rm --recursive --older-than 7d cache/npm-cache/

                  echo "Cache cleanup completed"
          restartPolicy: OnFailure
```

## Measuring Cache Effectiveness

Track how much time caching saves in your builds.

```bash
# Compare build times with and without cache
# In your CI pipeline, add timing to cache-related steps

# For Go builds
time go mod download  # Should be fast with warm cache
time go build ./...   # Incremental builds are faster

# For npm builds
time npm ci           # Much faster with populated cache
```

## Wrapping Up

Build caching on Talos Linux requires deliberate configuration because the ephemeral nature of Kubernetes pods means nothing persists by default. Whether you use shared PVCs for simple setups, MinIO for distributed S3-compatible caching, or registry-based caching for container builds, the investment pays off quickly in faster build times. Choose the approach that fits your build tools and cluster architecture, implement cache cleanup to prevent unbounded growth, and measure the impact to justify the storage costs. A well-configured caching strategy can cut build times by 50 to 80 percent, which adds up to significant time savings across your development team.
