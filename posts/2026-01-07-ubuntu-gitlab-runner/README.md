# How to Install and Configure GitLab Runner on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, GitLab CI, CI/CD, DevOps

Description: Install and configure GitLab Runner on Ubuntu with shell, Docker, and Kubernetes executors for CI/CD pipelines.

---

GitLab Runner is an open-source project that executes CI/CD jobs and sends the results back to GitLab. It works in conjunction with GitLab CI/CD to run pipelines defined in your `.gitlab-ci.yml` file. In this comprehensive guide, we will cover everything you need to know about installing, configuring, and managing GitLab Runner on Ubuntu.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing GitLab Runner](#installing-gitlab-runner)
3. [Registering the Runner with GitLab](#registering-the-runner-with-gitlab)
4. [Understanding Executor Types](#understanding-executor-types)
5. [Configuring the Shell Executor](#configuring-the-shell-executor)
6. [Configuring the Docker Executor](#configuring-the-docker-executor)
7. [Configuring the Kubernetes Executor](#configuring-the-kubernetes-executor)
8. [Caching and Artifacts](#caching-and-artifacts)
9. [Runner Tags and Job Assignment](#runner-tags-and-job-assignment)
10. [Monitoring Runner Health](#monitoring-runner-health)
11. [Advanced Configuration](#advanced-configuration)
12. [Troubleshooting Common Issues](#troubleshooting-common-issues)
13. [Conclusion](#conclusion)

## Prerequisites

Before we begin, ensure you have the following:

- Ubuntu 20.04 LTS or later (this guide uses Ubuntu 22.04)
- Root or sudo access to the server
- A GitLab instance (self-hosted or GitLab.com) with a project or group
- Basic understanding of CI/CD concepts
- Docker installed (for Docker executor)
- kubectl configured (for Kubernetes executor)

## Installing GitLab Runner

GitLab provides an official repository for installing GitLab Runner. This is the recommended method as it provides automatic updates and easy management.

### Method 1: Using the Official GitLab Repository

First, add the official GitLab repository to your system:

```bash
# Download and add the GitLab official repository GPG key
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
```

Now install the GitLab Runner package:

```bash
# Install gitlab-runner package from the official repository
sudo apt-get install gitlab-runner
```

### Method 2: Manual Installation

If you prefer manual installation or need a specific version, download the binary directly:

```bash
# Download the latest gitlab-runner binary for Linux AMD64
sudo curl -L --output /usr/local/bin/gitlab-runner \
  "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64"

# Make the binary executable
sudo chmod +x /usr/local/bin/gitlab-runner

# Create a GitLab CI user for running the runner
sudo useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash

# Install and run as a service
sudo gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
sudo gitlab-runner start
```

### Verifying the Installation

Confirm that GitLab Runner is installed correctly:

```bash
# Check the installed version of GitLab Runner
gitlab-runner --version

# Expected output similar to:
# Version:      16.x.x
# Git revision: xxxxxxxx
# Git branch:   main
# GO version:   go1.21.x
# Built:        2024-xx-xx
# OS/Arch:      linux/amd64
```

Check the service status:

```bash
# Verify that the gitlab-runner service is running
sudo systemctl status gitlab-runner

# Expected output shows 'active (running)'
```

## Registering the Runner with GitLab

Before a runner can execute jobs, it must be registered with your GitLab instance. You will need a registration token from GitLab.

### Obtaining the Registration Token

For a **project-specific runner**:
1. Navigate to your project in GitLab
2. Go to **Settings** > **CI/CD**
3. Expand the **Runners** section
4. Copy the registration token

For a **group runner**:
1. Navigate to your group in GitLab
2. Go to **Settings** > **CI/CD**
3. Expand the **Runners** section
4. Copy the registration token

For an **instance-wide runner** (admin only):
1. Go to **Admin Area** > **CI/CD** > **Runners**
2. Copy the registration token

### Interactive Registration

Run the registration command and follow the prompts:

```bash
# Start the interactive registration process
sudo gitlab-runner register
```

You will be prompted for:
- **GitLab instance URL**: e.g., `https://gitlab.com/` or your self-hosted URL
- **Registration token**: The token copied from GitLab
- **Description**: A name for your runner
- **Tags**: Comma-separated tags for job targeting
- **Executor**: The type of executor (shell, docker, kubernetes, etc.)

### Non-Interactive Registration

For automation purposes, you can register runners non-interactively:

```bash
# Register a runner with Docker executor non-interactively
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_REGISTRATION_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "docker-runner" \
  --tag-list "docker,linux,ubuntu" \
  --run-untagged="true" \
  --locked="false"
```

### Using Authentication Tokens (GitLab 15.10+)

GitLab 15.10 introduced runner authentication tokens as a more secure alternative:

```bash
# Register using a runner authentication token
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "glrt-xxxxxxxxxxxxxxxxxxxx" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "secure-docker-runner"
```

## Understanding Executor Types

GitLab Runner supports multiple executors, each suited for different use cases:

| Executor | Description | Best For |
|----------|-------------|----------|
| Shell | Runs jobs directly on the host | Simple setups, legacy systems |
| Docker | Runs jobs in Docker containers | Isolated, reproducible builds |
| Docker+Machine | Auto-scales Docker hosts | Large-scale CI with variable load |
| Kubernetes | Runs jobs in Kubernetes pods | Cloud-native, container orchestration |
| VirtualBox | Runs jobs in VirtualBox VMs | Windows/macOS builds on Linux |
| Parallels | Runs jobs in Parallels VMs | macOS-specific builds |
| SSH | Runs jobs via SSH on remote host | Remote execution |
| Custom | User-defined executor | Specialized environments |

## Configuring the Shell Executor

The shell executor runs jobs directly on the host machine where the runner is installed. It is the simplest executor but offers the least isolation.

### Basic Shell Executor Registration

```bash
# Register a shell executor runner
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_TOKEN" \
  --executor "shell" \
  --description "shell-runner" \
  --tag-list "shell,ubuntu"
```

### Shell Executor Configuration in config.toml

The runner configuration is stored in `/etc/gitlab-runner/config.toml`:

```toml
# /etc/gitlab-runner/config.toml
# Configuration for a shell executor runner

[[runners]]
  name = "shell-runner"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "shell"

  # Set the shell type (bash, sh, powershell, pwsh)
  shell = "bash"

  # Working directory for builds
  builds_dir = "/home/gitlab-runner/builds"

  # Directory for caching
  cache_dir = "/home/gitlab-runner/cache"

  # Environment variables available to all jobs
  environment = ["PATH=/usr/local/bin:/usr/bin:/bin"]
```

### Security Considerations for Shell Executor

When using the shell executor, jobs run with the permissions of the gitlab-runner user:

```bash
# Add gitlab-runner to necessary groups for build tools
sudo usermod -aG docker gitlab-runner
sudo usermod -aG sudo gitlab-runner

# Set up proper directory permissions
sudo chown -R gitlab-runner:gitlab-runner /home/gitlab-runner
```

## Configuring the Docker Executor

The Docker executor runs each job in a separate Docker container, providing excellent isolation and reproducibility.

### Prerequisites for Docker Executor

Ensure Docker is installed and the gitlab-runner user can access it:

```bash
# Install Docker if not already installed
sudo apt-get update
sudo apt-get install -y docker.io

# Add gitlab-runner user to docker group
sudo usermod -aG docker gitlab-runner

# Restart gitlab-runner to apply group changes
sudo systemctl restart gitlab-runner

# Verify Docker access
sudo -u gitlab-runner docker ps
```

### Docker Executor Registration

```bash
# Register a Docker executor runner with specific settings
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_TOKEN" \
  --executor "docker" \
  --docker-image "ubuntu:22.04" \
  --docker-privileged="false" \
  --docker-volumes "/cache" \
  --description "docker-runner" \
  --tag-list "docker,linux"
```

### Comprehensive Docker Executor Configuration

Here is a detailed configuration for the Docker executor:

```toml
# /etc/gitlab-runner/config.toml
# Comprehensive Docker executor configuration

concurrent = 4  # Maximum number of concurrent jobs
check_interval = 0  # How often to check for new jobs (0 = default)

[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    # Default image if not specified in .gitlab-ci.yml
    image = "ubuntu:22.04"

    # Allow running privileged containers (required for Docker-in-Docker)
    privileged = false

    # Disable TLS verification (use with caution)
    tls_verify = false

    # Pull policy: always, if-not-present, never
    pull_policy = ["if-not-present"]

    # Shared memory size for containers
    shm_size = 268435456  # 256MB

    # DNS servers for containers
    dns = ["8.8.8.8", "8.8.4.4"]

    # Volumes to mount in containers
    volumes = [
      "/cache",
      "/var/run/docker.sock:/var/run/docker.sock"
    ]

    # Additional hosts entries
    extra_hosts = ["gitlab.local:192.168.1.100"]

    # Network mode for containers
    network_mode = "bridge"

    # Memory and CPU limits
    memory = "2g"
    cpus = "2"

    # Helper image for git operations
    helper_image = ""

    # Wait for container services to be ready
    wait_for_services_timeout = 30

    # Allowed images (security restriction)
    allowed_images = ["ruby:*", "python:*", "node:*", "ubuntu:*"]

    # Allowed services
    allowed_services = ["postgres:*", "redis:*", "mysql:*"]

    # Disable container entrypoint overwrite
    disable_entrypoint_overwrite = false

    # OOM kill disable
    oom_kill_disable = false

  [runners.cache]
    Type = "local"
    Path = "/cache"
```

### Docker-in-Docker Configuration

For jobs that need to build Docker images:

```toml
# /etc/gitlab-runner/config.toml
# Configuration for Docker-in-Docker support

[[runners]]
  name = "dind-runner"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    image = "docker:24.0"

    # Required for Docker-in-Docker
    privileged = true

    # Mount Docker socket or use DinD service
    volumes = ["/certs/client", "/cache"]

    # TLS certificates for secure Docker daemon
    tls_cert_path = "/certs/client"
```

Example `.gitlab-ci.yml` for Docker-in-Docker:

```yaml
# .gitlab-ci.yml
# Example CI configuration for building Docker images

build:
  image: docker:24.0
  services:
    - docker:24.0-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - docker build -t myapp:latest .
    - docker push myapp:latest
  tags:
    - docker
    - dind
```

## Configuring the Kubernetes Executor

The Kubernetes executor runs jobs in Kubernetes pods, ideal for cloud-native environments.

### Prerequisites for Kubernetes Executor

Ensure kubectl is configured and the runner can access your cluster:

```bash
# Verify kubectl is working
kubectl cluster-info

# Ensure the service account has necessary permissions
kubectl create namespace gitlab-runner

# Create a service account for GitLab Runner
kubectl create serviceaccount gitlab-runner -n gitlab-runner

# Create a ClusterRoleBinding for the runner
kubectl create clusterrolebinding gitlab-runner-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=gitlab-runner:gitlab-runner
```

### Kubernetes Executor Registration

```bash
# Register a Kubernetes executor runner
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_TOKEN" \
  --executor "kubernetes" \
  --kubernetes-namespace "gitlab-runner" \
  --kubernetes-image "ubuntu:22.04" \
  --description "k8s-runner" \
  --tag-list "kubernetes,k8s"
```

### Kubernetes Executor Configuration

```toml
# /etc/gitlab-runner/config.toml
# Kubernetes executor configuration

concurrent = 10

[[runners]]
  name = "k8s-runner"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "kubernetes"

  [runners.kubernetes]
    # Kubernetes host (optional, uses in-cluster config if empty)
    host = ""

    # Bearer token for authentication (optional)
    bearer_token = ""

    # CA certificate for Kubernetes API
    ca_file = "/etc/ssl/certs/ca-certificates.crt"

    # Namespace for running pods
    namespace = "gitlab-runner"

    # Default image for jobs
    image = "ubuntu:22.04"

    # Image pull policy
    image_pull_policy = "IfNotPresent"

    # Pod annotations
    [runners.kubernetes.pod_annotations]
      "prometheus.io/scrape" = "true"
      "prometheus.io/port" = "9090"

    # Pod labels
    [runners.kubernetes.pod_labels]
      "app" = "gitlab-runner"
      "environment" = "production"

    # Node selector
    [runners.kubernetes.node_selector]
      "kubernetes.io/os" = "linux"

    # Resource requests and limits for build containers
    cpu_request = "500m"
    cpu_limit = "2"
    memory_request = "1Gi"
    memory_limit = "4Gi"

    # Service account to use
    service_account = "gitlab-runner"

    # Privileged mode for pods
    privileged = false

    # Allow privilege escalation
    allow_privilege_escalation = false

    # Pod security context
    [runners.kubernetes.pod_security_context]
      run_as_non_root = true
      run_as_user = 1000
      run_as_group = 1000
      fs_group = 1000

    # Volumes configuration
    [[runners.kubernetes.volumes.host_path]]
      name = "docker-socket"
      mount_path = "/var/run/docker.sock"
      read_only = true
      host_path = "/var/run/docker.sock"

    [[runners.kubernetes.volumes.pvc]]
      name = "cache"
      mount_path = "/cache"
      claim_name = "gitlab-runner-cache"

    [[runners.kubernetes.volumes.secret]]
      name = "registry-credentials"
      mount_path = "/root/.docker"
      secret_name = "registry-secret"

    # Helper container resources
    helper_cpu_request = "100m"
    helper_cpu_limit = "500m"
    helper_memory_request = "128Mi"
    helper_memory_limit = "512Mi"

    # Service container resources
    service_cpu_request = "100m"
    service_cpu_limit = "1"
    service_memory_request = "128Mi"
    service_memory_limit = "1Gi"

    # Poll configuration
    poll_interval = 3
    poll_timeout = 180
```

### Kubernetes RBAC Configuration

Create proper RBAC permissions for the runner:

```yaml
# gitlab-runner-rbac.yaml
# RBAC configuration for GitLab Runner in Kubernetes

apiVersion: v1
kind: ServiceAccount
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/exec", "pods/attach", "pods/log", "secrets", "configmaps"]
    verbs: ["get", "list", "watch", "create", "delete", "update", "patch"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
subjects:
  - kind: ServiceAccount
    name: gitlab-runner
    namespace: gitlab-runner
roleRef:
  kind: Role
  name: gitlab-runner
  apiGroup: rbac.authorization.k8s.io
```

Apply the RBAC configuration:

```bash
# Apply RBAC configuration to the cluster
kubectl apply -f gitlab-runner-rbac.yaml
```

## Caching and Artifacts

Proper caching configuration significantly speeds up CI/CD pipelines by reusing dependencies between jobs.

### Local Cache Configuration

```toml
# /etc/gitlab-runner/config.toml
# Local cache configuration

[[runners]]
  name = "runner-with-local-cache"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    image = "ubuntu:22.04"
    volumes = ["/cache:/cache:rw"]

  [runners.cache]
    # Use local file system for caching
    Type = "local"
    Path = "/cache"
    Shared = true
```

### S3 Cache Configuration

For distributed runners, use S3-compatible storage:

```toml
# /etc/gitlab-runner/config.toml
# S3 cache configuration for distributed runners

[[runners]]
  name = "runner-with-s3-cache"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    image = "ubuntu:22.04"

  [runners.cache]
    Type = "s3"
    Path = "gitlab-runner-cache"
    Shared = true

    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      BucketName = "my-gitlab-runner-cache"
      BucketLocation = "us-east-1"
      AccessKey = "AWS_ACCESS_KEY"
      SecretKey = "AWS_SECRET_KEY"
      Insecure = false
```

### GCS Cache Configuration

For Google Cloud Storage:

```toml
# /etc/gitlab-runner/config.toml
# Google Cloud Storage cache configuration

[[runners]]
  name = "runner-with-gcs-cache"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    image = "ubuntu:22.04"

  [runners.cache]
    Type = "gcs"
    Path = "gitlab-runner-cache"
    Shared = true

    [runners.cache.gcs]
      BucketName = "my-gitlab-runner-cache"
      CredentialsFile = "/etc/gitlab-runner/gcs-credentials.json"
```

### Using Cache in .gitlab-ci.yml

Example configuration for caching dependencies:

```yaml
# .gitlab-ci.yml
# Example showing cache usage for Node.js project

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .npm/
    - node_modules/
  policy: pull-push

stages:
  - install
  - build
  - test

install:
  stage: install
  script:
    - npm ci --cache .npm --prefer-offline
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - .npm/
      - node_modules/
    policy: push

build:
  stage: build
  script:
    - npm run build
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
    policy: pull
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

test:
  stage: test
  script:
    - npm test
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
    policy: pull
```

### Artifacts Configuration

Configure artifact handling in the runner:

```toml
# /etc/gitlab-runner/config.toml
# Artifacts configuration

[[runners]]
  name = "runner-with-artifacts"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  # Maximum artifact size in bytes (1GB)
  [runners.custom_build_dir]
    enabled = true

  [runners.docker]
    image = "ubuntu:22.04"

    # Temporary directory for artifacts
    volumes = ["/tmp:/tmp:rw"]
```

## Runner Tags and Job Assignment

Tags help you control which runners execute specific jobs.

### Configuring Runner Tags

Tags are set during registration or can be modified in GitLab UI:

```bash
# Register a runner with multiple tags
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "YOUR_TOKEN" \
  --executor "docker" \
  --docker-image "ubuntu:22.04" \
  --description "specialized-runner" \
  --tag-list "docker,linux,gpu,high-memory" \
  --run-untagged="false" \
  --locked="false"
```

### Updating Runner Tags via API

You can also update tags using the GitLab API:

```bash
# Update runner tags using GitLab API
curl --request PUT \
  --header "PRIVATE-TOKEN: YOUR_ACCESS_TOKEN" \
  --form "tag_list=docker,linux,production" \
  "https://gitlab.com/api/v4/runners/RUNNER_ID"
```

### Using Tags in .gitlab-ci.yml

```yaml
# .gitlab-ci.yml
# Example showing tag-based job assignment

stages:
  - build
  - test
  - deploy

# This job runs on any runner with 'docker' tag
build:
  stage: build
  tags:
    - docker
  script:
    - docker build -t myapp .

# This job requires a runner with both 'docker' and 'gpu' tags
ml-training:
  stage: build
  tags:
    - docker
    - gpu
  script:
    - python train_model.py

# This job runs on high-memory runners
integration-test:
  stage: test
  tags:
    - docker
    - high-memory
  script:
    - npm run test:integration

# This job runs on production runners only
deploy-production:
  stage: deploy
  tags:
    - production
    - kubernetes
  script:
    - kubectl apply -f k8s/
  only:
    - main
```

### Protected and Locked Runners

Configure runners for protected branches only:

```bash
# Register a protected runner (via GitLab UI or API)
curl --request PUT \
  --header "PRIVATE-TOKEN: YOUR_ACCESS_TOKEN" \
  --form "access_level=ref_protected" \
  "https://gitlab.com/api/v4/runners/RUNNER_ID"
```

## Monitoring Runner Health

Proper monitoring ensures your CI/CD infrastructure remains reliable.

### Built-in Health Endpoints

GitLab Runner exposes health endpoints:

```bash
# Enable the metrics server in config.toml
# Add this to the global section

listen_address = ":9252"
```

```toml
# /etc/gitlab-runner/config.toml
# Enable metrics and session server

# Listen address for Prometheus metrics
listen_address = ":9252"

# Session server for interactive terminals
[session_server]
  listen_address = "[::]:8093"
  advertise_address = "runner.example.com:8093"
  session_timeout = 1800
```

Access the metrics endpoint:

```bash
# Check runner metrics
curl http://localhost:9252/metrics

# Example output includes:
# gitlab_runner_jobs{state="running"} 2
# gitlab_runner_jobs{state="pending"} 0
# gitlab_runner_api_request_statuses_total{...}
```

### Prometheus Monitoring Configuration

Create a Prometheus configuration to scrape runner metrics:

```yaml
# prometheus.yml
# Prometheus configuration for GitLab Runner monitoring

scrape_configs:
  - job_name: 'gitlab-runner'
    static_configs:
      - targets: ['localhost:9252']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'gitlab-runner-01'
```

### Key Metrics to Monitor

| Metric | Description |
|--------|-------------|
| `gitlab_runner_jobs` | Current job states (running, pending) |
| `gitlab_runner_api_request_statuses_total` | API request status counts |
| `gitlab_runner_errors_total` | Total error count |
| `gitlab_runner_concurrent` | Configured concurrent job limit |
| `gitlab_runner_limit` | Configured runner limit |

### Alerting Rules

Example Prometheus alerting rules for GitLab Runner:

```yaml
# gitlab-runner-alerts.yml
# Alerting rules for GitLab Runner

groups:
  - name: gitlab-runner
    rules:
      - alert: GitLabRunnerDown
        expr: up{job="gitlab-runner"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "GitLab Runner is down"
          description: "GitLab Runner has been down for more than 5 minutes."

      - alert: GitLabRunnerHighErrorRate
        expr: rate(gitlab_runner_errors_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on GitLab Runner"
          description: "GitLab Runner is experiencing a high error rate."

      - alert: GitLabRunnerJobsStuck
        expr: gitlab_runner_jobs{state="running"} > 0 and changes(gitlab_runner_jobs{state="running"}[30m]) == 0
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "GitLab Runner jobs appear stuck"
          description: "Running jobs count hasn't changed in 30 minutes."
```

### Logging Configuration

Configure logging for better observability:

```toml
# /etc/gitlab-runner/config.toml
# Logging configuration

# Log level: debug, info, warn, error, fatal, panic
log_level = "info"

# Log format: runner, text, json
log_format = "json"
```

View logs using journalctl:

```bash
# View GitLab Runner logs in real-time
sudo journalctl -u gitlab-runner -f

# View logs with specific time range
sudo journalctl -u gitlab-runner --since "1 hour ago"

# View only error logs
sudo journalctl -u gitlab-runner -p err
```

## Advanced Configuration

### Concurrent Job Execution

Control how many jobs run simultaneously:

```toml
# /etc/gitlab-runner/config.toml
# Concurrent execution settings

# Global setting: maximum jobs across all runners
concurrent = 10

[[runners]]
  name = "runner-1"
  # Per-runner limit (must be <= global concurrent)
  limit = 5

[[runners]]
  name = "runner-2"
  limit = 5
```

### Environment Variables

Set global and per-runner environment variables:

```toml
# /etc/gitlab-runner/config.toml
# Environment variable configuration

[[runners]]
  name = "runner-with-env"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  # Pre-clone script (runs before git clone)
  pre_clone_script = "echo 'Pre-clone setup'"

  # Pre-build script (runs before build script)
  pre_build_script = "echo 'Pre-build setup'"

  # Post-build script (runs after build script)
  post_build_script = "echo 'Post-build cleanup'"

  # Environment variables for all jobs
  environment = [
    "CI_DEBUG_TRACE=false",
    "DOCKER_DRIVER=overlay2",
    "PATH=/usr/local/bin:/usr/bin:/bin"
  ]

  [runners.docker]
    image = "ubuntu:22.04"
```

### Custom Certificate Authority

For self-signed GitLab instances:

```toml
# /etc/gitlab-runner/config.toml
# Custom CA configuration

[[runners]]
  name = "runner-with-custom-ca"
  url = "https://gitlab.internal/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  # Path to custom CA certificate
  tls-ca-file = "/etc/gitlab-runner/certs/gitlab.crt"

  [runners.docker]
    image = "ubuntu:22.04"

    # Also configure Docker to use the custom CA
    volumes = ["/etc/gitlab-runner/certs:/etc/gitlab-runner/certs:ro"]
```

### Feature Flags

Enable experimental features:

```toml
# /etc/gitlab-runner/config.toml
# Feature flags configuration

[[runners]]
  name = "runner-with-features"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.feature_flags]
    FF_USE_DIRECT_DOWNLOAD = true
    FF_SKIP_NOOP_BUILD_STAGES = true
    FF_USE_FASTZIP = true
```

## Troubleshooting Common Issues

### Runner Not Picking Up Jobs

If your runner is registered but not executing jobs:

```bash
# Check runner status
sudo gitlab-runner status

# Verify runner is connected to GitLab
sudo gitlab-runner verify

# Check for configuration issues
sudo gitlab-runner verify --delete

# Restart the runner service
sudo systemctl restart gitlab-runner
```

### Docker Permission Denied

Fix Docker socket permission issues:

```bash
# Add gitlab-runner to docker group
sudo usermod -aG docker gitlab-runner

# Restart the runner
sudo systemctl restart gitlab-runner

# Verify Docker access
sudo -u gitlab-runner docker ps
```

### Certificate Errors

Handle SSL/TLS certificate issues:

```bash
# Download and install GitLab's certificate
echo | openssl s_client -servername gitlab.example.com \
  -connect gitlab.example.com:443 2>/dev/null | \
  openssl x509 > /etc/gitlab-runner/certs/gitlab.crt

# Register with the certificate
sudo gitlab-runner register \
  --tls-ca-file=/etc/gitlab-runner/certs/gitlab.crt \
  ...
```

### Job Timeout Issues

Adjust timeout settings:

```toml
# /etc/gitlab-runner/config.toml
# Timeout configuration

[[runners]]
  name = "runner-with-timeout"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  # Clone timeout (default: 1h)
  clone_url = ""

  [runners.docker]
    image = "ubuntu:22.04"

    # Wait time for Docker operations
    wait_for_services_timeout = 60
```

### Cleaning Up Old Containers and Volumes

Maintain disk space on Docker executor hosts:

```bash
# Create a cleanup script
cat << 'EOF' > /etc/cron.daily/gitlab-runner-cleanup
#!/bin/bash
# Clean up old Docker resources from GitLab Runner

# Remove stopped containers older than 24 hours
docker container prune -f --filter "until=24h"

# Remove unused images
docker image prune -f --filter "until=168h"

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f
EOF

# Make the script executable
chmod +x /etc/cron.daily/gitlab-runner-cleanup
```

### Debugging Job Execution

Enable debug output for troubleshooting:

```bash
# Run a specific job with debug output
sudo gitlab-runner exec docker job_name --debug

# Check detailed logs
sudo gitlab-runner --debug run
```

## Conclusion

GitLab Runner is a powerful and flexible tool for executing CI/CD pipelines. In this guide, we covered:

- **Installation**: Setting up GitLab Runner on Ubuntu using official repositories or manual installation
- **Registration**: Connecting runners to GitLab using tokens and various authentication methods
- **Executors**: Configuring shell, Docker, and Kubernetes executors for different use cases
- **Caching**: Implementing local and distributed caching to speed up pipelines
- **Tags**: Using tags to control job assignment and runner selection
- **Monitoring**: Setting up metrics collection and alerting for runner health
- **Troubleshooting**: Resolving common issues with permissions, certificates, and timeouts

By properly configuring and managing your GitLab Runners, you can create a reliable and efficient CI/CD infrastructure that scales with your development needs.

For more advanced configurations and use cases, refer to the [official GitLab Runner documentation](https://docs.gitlab.com/runner/).
