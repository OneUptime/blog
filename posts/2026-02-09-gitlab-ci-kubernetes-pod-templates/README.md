# How to Configure GitLab CI Runners to Use Kubernetes Pod Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Kubernetes, CI/CD, DevOps, Runner

Description: Configure GitLab CI runners on Kubernetes with pod templates to create flexible, scalable build environments with custom images, resource allocation, and service dependencies.

---

GitLab CI runners on Kubernetes provide dynamic, scalable build environments. Kubernetes executor pod settings let you define custom build environments with specific images, resource requirements, and dependencies. This guide shows you how to configure GitLab runners with Kubernetes pod settings for flexible CI/CD pipelines that adapt to your workload needs.

## Understanding Kubernetes Executor

The GitLab Kubernetes executor creates a new pod for each job, with containers defined by the runner configuration and the CI job. The build runs in an isolated environment with specific resource limits, custom images, and service containers. After the job completes, the pod is deleted, ensuring clean builds.

## Installing GitLab Runner on Kubernetes

Deploy GitLab Runner using Helm:

```bash
# Add GitLab Helm repository

helm repo add gitlab https://charts.gitlab.io
helm repo update

# Create namespace
kubectl create namespace gitlab-runner

# Get your GitLab runner authentication token
# From GitLab: Settings > CI/CD > Runners > New instance runner

# Install runner with Kubernetes executor
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --set gitlabUrl=https://gitlab.example.com \
  --set runnerToken="your-runner-authentication-token" \
  --set rbac.create=true \
  --set serviceAccount.create=true \
  --set runners.executor=kubernetes
```

## Configuring Basic Pod Templates

Create a custom values file for more control:

```yaml
# values.yaml
gitlabUrl: https://gitlab.example.com
runnerToken: "your-runner-authentication-token"

runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "{{.Release.Namespace}}"
        image = "ubuntu:22.04"

        # Resource limits for build pods
        cpu_limit = "2"
        cpu_request = "1"
        memory_limit = "4Gi"
        memory_request = "2Gi"

        # Helper image for cloning and artifacts
        helper_image = "registry.gitlab.com/gitlab-org/gitlab-runner/gitlab-runner-helper:x86_64-v${CI_RUNNER_VERSION}"

        # Service account
        service_account = "gitlab-runner"

        # Pod labels
        [runners.kubernetes.pod_labels]
          "app" = "gitlab-runner"
          "managed-by" = "helm"

rbac:
  create: true

serviceAccount:
  create: true
  name: gitlab-runner
```

Install with custom configuration:

```bash
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner \
  -f values.yaml
```

## Creating Custom Pod Templates

Define templates for different job types:

```yaml
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"

        # Default build container
        image = "ubuntu:22.04"

        # Node.js build template
        [runners.kubernetes.pod_annotations]
          "build-type" = "nodejs"

        [[runners.kubernetes.volumes.empty_dir]]
          name = "npm-cache"
          mount_path = "/root/.npm"
          medium = "Memory"

        # Docker-in-Docker support
        privileged = true

        [[runners.kubernetes.services]]
          name = "docker:24.0.5-dind"
          alias = "docker"

        # Security context
        [runners.kubernetes.pod_security_context]
          run_as_user = 1000
          run_as_group = 1000
          fs_group = 1000
```

## Using Image-Specific Configurations

Create runners for specific images:

```yaml
runners:
  config: |
    [[runners]]
      name = "python-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "python:3.11"

        cpu_limit = "2"
        memory_limit = "4Gi"

        [[runners.kubernetes.volumes.empty_dir]]
          name = "pip-cache"
          mount_path = "/root/.cache/pip"

    [[runners]]
      name = "go-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "golang:1.26"

        cpu_limit = "4"
        memory_limit = "8Gi"

        [[runners.kubernetes.volumes.empty_dir]]
          name = "go-cache"
          mount_path = "/go/pkg"

    [[runners]]
      name = "node-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "node:24"

        [[runners.kubernetes.volumes.empty_dir]]
          name = "node-modules"
          mount_path = "/root/.npm"
```

Assign matching tags to these runners in GitLab, then use the tags in `.gitlab-ci.yml`:

```yaml
build-python:
  image: python:3.11
  tags:
    - python-runner
  script:
    - pip install -r requirements.txt
    - python -m pytest

build-go:
  image: golang:1.26
  tags:
    - go-runner
  script:
    - go build -o app
    - go test ./...

build-node:
  image: node:24
  tags:
    - node-runner
  script:
    - npm install
    - npm test
```

## Configuring Resource Classes

Define runners with different resource profiles:

```yaml
runners:
  config: |
    [[runners]]
      name = "small-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"
        cpu_limit = "1"
        cpu_request = "0.5"
        memory_limit = "2Gi"
        memory_request = "1Gi"

    [[runners]]
      name = "medium-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"
        cpu_limit = "4"
        cpu_request = "2"
        memory_limit = "8Gi"
        memory_request = "4Gi"

    [[runners]]
      name = "large-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"
        cpu_limit = "8"
        cpu_request = "4"
        memory_limit = "16Gi"
        memory_request = "8Gi"

        # Use dedicated nodes
        [runners.kubernetes.node_selector]
          "workload-type" = "ci-large"

        # Allow priority scheduling
        priority_class_name = "high-priority"
```

Assign matching tags to these runners in GitLab, then use them in the pipeline:

```yaml
unit-tests:
  tags:
    - small-runner
  script:
    - npm test

integration-tests:
  tags:
    - medium-runner
  script:
    - npm run test:integration

performance-tests:
  tags:
    - large-runner
  script:
    - npm run test:performance
```

## Adding Service Containers

Configure database and cache services:

```yaml
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"

        # PostgreSQL service
        [[runners.kubernetes.services]]
          name = "postgres:15"
          alias = "postgres"
          environment = ["POSTGRES_DB=test", "POSTGRES_USER=test", "POSTGRES_PASSWORD=test"]

        [[runners.kubernetes.services]]
          name = "redis:7"
          alias = "redis"
```

Use services in pipeline:

```yaml
test-with-database:
  image: python:3.11
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres:5432/test
    REDIS_URL: redis://redis:6379
  script:
    - pip install -r requirements.txt
    - pytest tests/integration/
```

## Implementing Build Caching

Configure persistent volume caching:

```yaml
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"

        # Use PVC for cache
        [[runners.kubernetes.volumes.pvc]]
          name = "runner-cache"
          mount_path = "/cache"

        [runners.cache]
          Type = "s3"
          Path = "gitlab-runner"
          Shared = true
          [runners.cache.s3]
            ServerAddress = "s3.amazonaws.com"
            BucketName = "gitlab-runner-cache"
            BucketLocation = "us-east-1"
```

Create the PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: runner-cache
  namespace: gitlab-runner
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
```

Use cache in pipeline:

```yaml
build:
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .npm/
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run build
```

## Configuring Security Contexts

Set pod security policies:

```yaml
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"
        allow_privilege_escalation = false

        # Pod security context
        [runners.kubernetes.pod_security_context]
          run_as_non_root = true
          run_as_user = 1000
          run_as_group = 1000
          fs_group = 1000
          supplemental_groups = [1000]

        # Build container security context
        [runners.kubernetes.build_container_security_context]
          run_as_non_root = true
          run_as_user = 1000
          [runners.kubernetes.build_container_security_context.capabilities]
            drop = ["ALL"]
```

Apply Pod Security Standards:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gitlab-runner
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Using Node Selectors and Tolerations

Schedule runners on specific nodes:

```yaml
runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"

        # Node selection
        [runners.kubernetes.node_selector]
          "workload-type" = "ci-builds"
          "disk-type" = "ssd"

        # Tolerations for tainted nodes
        [runners.kubernetes.node_tolerations]
          "ci-workload=true" = "NoSchedule"
          "spot-instance" = "NoSchedule"
```

## Implementing Multi-Architecture Builds

Configure runners for different architectures:

```yaml
runners:
  config: |
    [[runners]]
      name = "amd64-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"

        [runners.kubernetes.node_selector]
          "kubernetes.io/arch" = "amd64"

    [[runners]]
      name = "arm64-runner"
      [runners.kubernetes]
        namespace = "gitlab-runner"

        [runners.kubernetes.node_selector]
          "kubernetes.io/arch" = "arm64"
```

Build for multiple architectures:

```yaml
build-amd64:
  tags:
    - amd64-runner
  script:
    - docker build --platform linux/amd64 -t myapp:amd64 .

build-arm64:
  tags:
    - arm64-runner
  script:
    - docker build --platform linux/arm64 -t myapp:arm64 .

create-manifest:
  script:
    - docker manifest create myapp:latest myapp:amd64 myapp:arm64
    - docker manifest push myapp:latest
```

## Monitoring Runner Performance

Track runner metrics:

```yaml
metrics:
  enabled: true
  port: 9252
  podMonitor:
    enabled: true
    path: /metrics
```

Query runner metrics:

```bash
# Get runner pod metrics
kubectl top pods -n gitlab-runner

# View runner logs
kubectl logs -n gitlab-runner -l app=gitlab-runner

# List configured runners
gitlab-runner list
```

## Troubleshooting Common Issues

Debug runner problems:

```bash
# Check runner registration
kubectl exec -it -n gitlab-runner <runner-pod> -- gitlab-runner verify

# View runner configuration
kubectl get configmap -n gitlab-runner gitlab-runner -o yaml

# Check pod creation
kubectl get pods -n gitlab-runner -w

# View events
kubectl get events -n gitlab-runner --sort-by='.lastTimestamp'

# Test runner connectivity
kubectl exec -it -n gitlab-runner <runner-pod> -- curl https://gitlab.example.com
```

## Conclusion

GitLab CI runners with Kubernetes pod templates provide flexible, scalable build environments tailored to your specific needs. By configuring custom images, resource allocations, service containers, and security contexts, you create an efficient CI/CD platform that adapts to different workload requirements. This approach maximizes resource utilization, maintains build isolation, and scales automatically with your pipeline demands. The combination of GitLab CI and Kubernetes creates a powerful, modern CI/CD infrastructure.
