# How to Use ArgoCD CLI in CI/CD Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CI/CD, CLI

Description: Learn how to install, configure, and use the ArgoCD CLI in CI/CD containers for GitHub Actions, GitLab CI, Jenkins, and other pipeline systems with authentication and networking best practices.

---

The ArgoCD CLI is the go-to tool for interacting with ArgoCD from CI/CD pipelines. But CI environments are ephemeral containers with their own networking constraints and security requirements. This guide covers how to set up the ArgoCD CLI properly in various CI systems, handle authentication, and work around common networking issues.

## Installing the ArgoCD CLI

### Direct Download

The simplest method works in any CI system:

```bash
# Download the latest version for Linux (most CI runners use Linux)
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Or download a specific version
ARGOCD_VERSION="v2.10.0"
curl -sSL -o /usr/local/bin/argocd \
  "https://github.com/argoproj/argo-cd/releases/download/$ARGOCD_VERSION/argocd-linux-amd64"
chmod +x /usr/local/bin/argocd

# Verify the installation
argocd version --client
```

### Using the Official ArgoCD Docker Image

Many CI systems let you specify a container image for your job. The official ArgoCD image already has the CLI installed:

```yaml
# GitLab CI
deploy:
  image: argoproj/argocd:v2.10.0
  script:
    - argocd app sync my-app --grpc-web
```

### Caching the CLI Binary

To speed up pipelines, cache the CLI binary between runs:

```yaml
# GitHub Actions with caching
- name: Cache ArgoCD CLI
  uses: actions/cache@v4
  with:
    path: /usr/local/bin/argocd
    key: argocd-cli-v2.10.0

- name: Install ArgoCD CLI
  run: |
    if [ ! -f /usr/local/bin/argocd ]; then
      curl -sSL -o /usr/local/bin/argocd \
        https://github.com/argoproj/argo-cd/releases/download/v2.10.0/argocd-linux-amd64
      chmod +x /usr/local/bin/argocd
    fi
    argocd version --client
```

## Authentication in CI/CD

### Using Auth Tokens

The recommended approach for CI/CD is using API tokens instead of username/password:

```bash
# All commands use the token via environment variable
export ARGOCD_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# The CLI picks up the token automatically
argocd app list --server argocd.example.com --grpc-web
```

### Using Environment Variables

The ArgoCD CLI supports several environment variables that eliminate the need for repeated flags:

```bash
# Set these in your CI environment
export ARGOCD_SERVER="argocd.example.com"
export ARGOCD_AUTH_TOKEN="your-token-here"
export ARGOCD_OPTS="--grpc-web"  # Global options applied to all commands

# Now commands are simpler
argocd app list
argocd app sync my-app
argocd app wait my-app --health --timeout 300
```

### Setting Up in Each CI Platform

**GitHub Actions:**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
      ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
      ARGOCD_OPTS: "--grpc-web"
    steps:
      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd

      - name: Deploy
        run: |
          argocd app sync my-app
          argocd app wait my-app --health --timeout 300
```

**GitLab CI:**

```yaml
deploy:
  image: argoproj/argocd:v2.10.0
  variables:
    ARGOCD_SERVER: argocd.example.com
    ARGOCD_OPTS: "--grpc-web"
  script:
    - argocd app sync my-app --auth-token $ARGOCD_TOKEN
    - argocd app wait my-app --auth-token $ARGOCD_TOKEN --health --timeout 300
```

**Jenkins:**

```groovy
pipeline {
    agent any
    environment {
        ARGOCD_SERVER = 'argocd.example.com'
        ARGOCD_AUTH_TOKEN = credentials('argocd-token')
        ARGOCD_OPTS = '--grpc-web'
    }
    stages {
        stage('Deploy') {
            steps {
                sh '''
                    curl -sSL -o argocd \
                      https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                    chmod +x argocd
                    ./argocd app sync my-app
                    ./argocd app wait my-app --health --timeout 300
                '''
            }
        }
    }
}
```

**CircleCI:**

```yaml
jobs:
  deploy:
    docker:
      - image: cimg/base:2024.01
    environment:
      ARGOCD_OPTS: "--grpc-web"
    steps:
      - run:
          name: Install ArgoCD CLI
          command: |
            curl -sSL -o /usr/local/bin/argocd \
              https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
            chmod +x /usr/local/bin/argocd
      - run:
          name: Deploy
          command: |
            export ARGOCD_SERVER="$ARGOCD_SERVER"
            export ARGOCD_AUTH_TOKEN="$ARGOCD_TOKEN"
            argocd app sync my-app
            argocd app wait my-app --health --timeout 300
```

## Networking Considerations

### The --grpc-web Flag

The ArgoCD API server uses gRPC. Many CI environments, load balancers, and proxies do not support native gRPC. The `--grpc-web` flag wraps gRPC calls in HTTP/1.1 requests, which works through most network infrastructure.

```bash
# Always use --grpc-web in CI environments
argocd app sync my-app --grpc-web

# Or set it globally
export ARGOCD_OPTS="--grpc-web"
```

### TLS and Certificate Issues

If ArgoCD uses a self-signed certificate or a corporate CA:

```bash
# Option 1: Skip TLS verification (development only)
argocd app sync my-app --grpc-web --insecure

# Option 2: Provide the CA certificate
argocd app sync my-app --grpc-web \
  --server-crt /path/to/ca.crt

# Option 3: Add the CA to the system trust store
cp /path/to/ca.crt /usr/local/share/ca-certificates/
update-ca-certificates
```

### Accessing ArgoCD Behind a VPN

If ArgoCD is not publicly accessible, your CI runners need VPN or network access:

```yaml
# GitHub Actions with self-hosted runners
jobs:
  deploy:
    runs-on: [self-hosted, internal-network]
    steps:
      - name: Deploy via ArgoCD
        run: |
          argocd app sync my-app --grpc-web
```

## Creating a Reusable CI Script

Create a wrapper script that handles CLI installation, authentication, and common operations:

```bash
#!/bin/bash
# argocd-deploy.sh - Reusable ArgoCD deployment script for CI
set -eo pipefail

# Configuration
ARGOCD_CLI_VERSION="${ARGOCD_CLI_VERSION:-latest}"
TIMEOUT="${DEPLOY_TIMEOUT:-300}"

# Ensure required variables
: "${ARGOCD_SERVER:?ARGOCD_SERVER environment variable is required}"
: "${ARGOCD_AUTH_TOKEN:?ARGOCD_AUTH_TOKEN environment variable is required}"
: "${APP_NAME:?APP_NAME environment variable is required}"

# Export for CLI
export ARGOCD_OPTS="--grpc-web"

# Install CLI if not present
if ! command -v argocd &> /dev/null; then
  echo "Installing ArgoCD CLI..."
  if [ "$ARGOCD_CLI_VERSION" = "latest" ]; then
    URL="https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64"
  else
    URL="https://github.com/argoproj/argo-cd/releases/download/$ARGOCD_CLI_VERSION/argocd-linux-amd64"
  fi
  curl -sSL -o /usr/local/bin/argocd "$URL"
  chmod +x /usr/local/bin/argocd
fi

echo "ArgoCD CLI version: $(argocd version --client --short)"
echo "Server: $ARGOCD_SERVER"
echo "Application: $APP_NAME"

# Refresh application state
echo "==> Refreshing application state..."
argocd app get "$APP_NAME" --refresh > /dev/null

# Trigger sync
echo "==> Syncing $APP_NAME..."
argocd app sync "$APP_NAME" --retry-limit 3

# Wait for health
echo "==> Waiting for $APP_NAME to become healthy (timeout: ${TIMEOUT}s)..."
argocd app wait "$APP_NAME" --health --timeout "$TIMEOUT"

# Display final status
echo "==> Final status:"
argocd app get "$APP_NAME"
echo "==> Deployment complete!"
```

Usage in any CI system:

```bash
export ARGOCD_SERVER="argocd.example.com"
export ARGOCD_AUTH_TOKEN="$TOKEN"
export APP_NAME="my-app"
./argocd-deploy.sh
```

## Security Best Practices

1. **Never log the token** - Ensure your CI system masks the `ARGOCD_AUTH_TOKEN` in logs.

2. **Use short-lived tokens** - Rotate CI tokens regularly. Consider generating tokens per-pipeline run if your CI supports it.

3. **Scope tokens narrowly** - Use project-scoped tokens that only allow sync and get operations on specific applications.

4. **Do not use --insecure in production** - Always configure proper TLS certificates for production ArgoCD instances.

5. **Pin the CLI version** - Match the CLI version to your ArgoCD server version to avoid compatibility issues.

For monitoring the health of your CI/CD to ArgoCD integration, see [how to implement health checks in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-health-checks-argocd/view).

The ArgoCD CLI in CI/CD containers bridges the gap between your build pipeline and your GitOps deployment. With proper setup, it provides reliable, secure access to ArgoCD from any CI system.
