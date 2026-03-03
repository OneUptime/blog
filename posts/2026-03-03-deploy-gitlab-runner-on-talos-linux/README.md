# How to Deploy GitLab Runner on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitLab Runner, CI/CD, Kubernetes, DevOps

Description: A complete guide to deploying GitLab Runner on Talos Linux with the Kubernetes executor for scalable, container-native CI/CD pipeline execution.

---

GitLab Runner is the component that executes GitLab CI/CD pipelines. When configured with the Kubernetes executor, it creates a pod for each build job, runs the job inside containers, and cleans up afterward. Deploying GitLab Runner on Talos Linux gives you a secure, immutable platform for executing your CI/CD workloads, with the Kubernetes executor providing automatic scaling and resource isolation.

This guide walks through deploying GitLab Runner on Talos Linux, configuring the Kubernetes executor, and optimizing it for production use.

## Why GitLab Runner on Talos Linux

The Kubernetes executor for GitLab Runner creates ephemeral pods for each job. This means every build starts with a clean environment, there is no state leakage between jobs, and the runner scales automatically with your cluster's capacity. On Talos Linux, you add the security benefits of an immutable operating system - the nodes running your builds cannot be modified, eliminating a whole class of supply chain attacks that target CI infrastructure.

## Prerequisites

Before starting, make sure you have:

- A Talos Linux cluster with kubectl configured
- Helm v3 installed
- A GitLab instance (GitLab.com or self-hosted) with a project or group
- A runner registration token from GitLab (Settings > CI/CD > Runners)

## Installing GitLab Runner with Helm

```bash
# Add the GitLab Helm repository
helm repo add gitlab https://charts.gitlab.io

# Update the chart cache
helm repo update

# Create a namespace for the runner
kubectl create namespace gitlab-runner
```

Create the runner configuration values file.

```yaml
# gitlab-runner-values.yaml
# Number of runner replicas
replicas: 1

# GitLab instance URL
gitlabUrl: https://gitlab.com/

# Runner registration token (use a secret for production)
runnerToken: "glrt-YOUR_RUNNER_TOKEN_HERE"

# Runner configuration
runners:
  # Runner tags
  tags: "kubernetes, talos-linux"

  # Use the Kubernetes executor
  executor: kubernetes

  # Kubernetes executor configuration
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "ubuntu:22.04"
        privileged = false

        # Pod labels for all build pods
        [runners.kubernetes.pod_labels]
          "ci" = "gitlab"
          "environment" = "ci"

        # Resource requests for the build container
        cpu_request = "500m"
        memory_request = "1Gi"
        cpu_limit = "2"
        memory_limit = "4Gi"

        # Resource requests for the helper container
        helper_cpu_request = "100m"
        helper_memory_request = "128Mi"
        helper_cpu_limit = "500m"
        helper_memory_limit = "256Mi"

        # Service container resources
        service_cpu_request = "200m"
        service_memory_request = "256Mi"

        # Pod security context
        [runners.kubernetes.pod_security_context]
          run_as_non_root = true
          run_as_user = 1000
          fs_group = 1000

        # Build container security context
        [runners.kubernetes.build_container_security_context]
          run_as_non_root = true
          run_as_user = 1000
          allow_privilege_escalation = false
          read_only_root_filesystem = false

        # Clean up build pods after completion
        [runners.kubernetes.cleanup]
          delete_grace_period = 30

# RBAC
rbac:
  create: true
  rules:
    - apiGroups: [""]
      resources: ["pods", "secrets", "configmaps"]
      verbs: ["get", "list", "watch", "create", "delete", "update"]
    - apiGroups: [""]
      resources: ["pods/exec", "pods/attach", "pods/log"]
      verbs: ["get", "create"]

# Resource limits for the runner manager itself
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

```bash
# Install GitLab Runner
helm install gitlab-runner \
  gitlab/gitlab-runner \
  --namespace gitlab-runner \
  -f gitlab-runner-values.yaml

# Verify the runner is running
kubectl get pods -n gitlab-runner

# Check the runner logs
kubectl logs -n gitlab-runner -l app=gitlab-runner
```

## Verifying Registration

```bash
# Check if the runner registered with GitLab
kubectl logs -n gitlab-runner -l app=gitlab-runner | grep "Registering"

# You can also verify in the GitLab UI:
# Settings > CI/CD > Runners
# The runner should appear with the "kubernetes" and "talos-linux" tags
```

## Configuring Build Caching

Caching significantly speeds up builds by preserving dependencies between jobs.

```yaml
# Add to the runners.config section in values
[[runners]]
  [runners.kubernetes]
    namespace = "gitlab-runner"

    # Configure distributed cache with S3
    [runners.cache]
      Type = "s3"
      Shared = true
      [runners.cache.s3]
        ServerAddress = "minio.minio.svc:9000"
        BucketName = "gitlab-runner-cache"
        BucketLocation = "us-east-1"
        Insecure = true
        AccessKey = "minioadmin"
        SecretKey = "minioadmin"
```

Deploy MinIO for local caching.

```bash
# Install MinIO for build cache storage
helm repo add minio https://charts.min.io/

helm install minio \
  minio/minio \
  --namespace minio \
  --create-namespace \
  --set rootUser=minioadmin \
  --set rootPassword=minioadmin \
  --set persistence.size=50Gi \
  --set defaultBuckets="gitlab-runner-cache"
```

## Writing GitLab CI Pipelines

Create a `.gitlab-ci.yml` file in your repository.

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  # Use the Go module cache
  GOPATH: "$CI_PROJECT_DIR/.go"

# Cache Go modules across jobs
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .go/pkg/mod/

test:
  stage: test
  image: golang:1.22
  tags:
    - kubernetes
    - talos-linux
  script:
    - go mod download
    - go test -v -race -coverprofile=coverage.out ./...
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.out

lint:
  stage: test
  image: golangci/golangci-lint:latest
  tags:
    - kubernetes
    - talos-linux
  script:
    - golangci-lint run ./...

build:
  stage: build
  image: golang:1.22
  tags:
    - kubernetes
    - talos-linux
  script:
    - go build -ldflags="-s -w" -o app ./cmd/server
  artifacts:
    paths:
      - app
    expire_in: 1 hour
  only:
    - main

build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  tags:
    - kubernetes
    - talos-linux
  script:
    - mkdir -p /kaniko/.docker
    - echo "{\"auths\":{\"${CI_REGISTRY}\":{\"auth\":\"$(echo -n ${CI_REGISTRY_USER}:${CI_REGISTRY_PASSWORD} | base64)\"}}}" > /kaniko/.docker/config.json
    - /kaniko/executor
      --context ${CI_PROJECT_DIR}
      --dockerfile ${CI_PROJECT_DIR}/Dockerfile
      --destination ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
      --destination ${CI_REGISTRY_IMAGE}:latest
  only:
    - main
  needs:
    - test
    - lint

deploy-staging:
  stage: deploy
  image: bitnami/kubectl:latest
  tags:
    - kubernetes
    - talos-linux
  script:
    - kubectl set image deployment/myapp
      app=${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
      -n staging
  environment:
    name: staging
  only:
    - main
  needs:
    - build-image

deploy-production:
  stage: deploy
  image: bitnami/kubectl:latest
  tags:
    - kubernetes
    - talos-linux
  script:
    - kubectl set image deployment/myapp
      app=${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
      -n production
  environment:
    name: production
  when: manual
  only:
    - main
  needs:
    - deploy-staging
```

## Using Services in Jobs

GitLab CI supports service containers for databases and other dependencies.

```yaml
# Integration tests with database
integration-test:
  stage: test
  image: golang:1.22
  tags:
    - kubernetes
    - talos-linux
  services:
    - name: postgres:16
      alias: database
      variables:
        POSTGRES_DB: testdb
        POSTGRES_USER: testuser
        POSTGRES_PASSWORD: testpass
    - name: redis:7-alpine
      alias: cache
  variables:
    DATABASE_URL: "postgres://testuser:testpass@database:5432/testdb?sslmode=disable"
    REDIS_URL: "redis://cache:6379"
  script:
    - go test -v -tags=integration ./...
```

## Resource Management

Control how many concurrent jobs the runner can handle.

```yaml
# In the values file
runners:
  config: |
    concurrent = 10
    check_interval = 3

    [[runners]]
      limit = 10
      request_concurrency = 5
      [runners.kubernetes]
        namespace = "gitlab-runner"
        poll_interval = 5
        poll_timeout = 3600
```

## Monitoring GitLab Runner

```bash
# Check runner status
kubectl logs -n gitlab-runner -l app=gitlab-runner --tail=50

# Monitor build pods
kubectl get pods -n gitlab-runner -l ci=gitlab -w

# Check resource usage
kubectl top pods -n gitlab-runner
```

Enable Prometheus metrics for the runner.

```yaml
# Add to values
metrics:
  enabled: true
  port: 9252
  serviceMonitor:
    enabled: true
```

## Wrapping Up

GitLab Runner on Talos Linux with the Kubernetes executor provides a scalable, secure CI/CD execution environment. Each job runs in an isolated pod with its own containers, preventing state leakage and ensuring reproducibility. The immutable nature of Talos Linux means the runner infrastructure itself cannot be tampered with, adding a layer of security that protects your entire CI/CD supply chain. Configure the runner with appropriate resource limits, set up caching with MinIO for faster builds, and use the security context settings to run build containers with minimal privileges.
