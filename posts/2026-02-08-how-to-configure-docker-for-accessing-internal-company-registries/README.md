# How to Configure Docker for Accessing Internal Company Registries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Container Registry, DevOps, Security, Enterprise, Authentication, TLS

Description: Configure Docker to authenticate and pull images from private internal company registries with TLS, credentials, and mirror setup

---

Most companies run their own container registries to host proprietary images, cache public images, and enforce security scanning policies. These internal registries often use self-signed certificates, sit behind corporate firewalls, and require specific authentication methods. Configuring Docker to work with these registries involves several steps that differ from pulling images off Docker Hub. This guide covers authentication, TLS configuration, registry mirrors, and common enterprise setups.

## Common Internal Registry Solutions

Companies typically use one of these registry solutions:

- **Harbor**: Open-source registry with vulnerability scanning and access control
- **JFrog Artifactory**: Universal artifact manager with Docker registry support
- **Nexus Repository**: Supports Docker alongside Maven, npm, and other formats
- **AWS ECR**: Amazon's managed container registry
- **Azure Container Registry (ACR)**: Microsoft's managed registry
- **Google Artifact Registry**: Google Cloud's managed registry
- **GitLab Container Registry**: Built into GitLab
- **Self-hosted Docker Registry**: The official Docker registry image

The configuration principles apply to all of them.

## Basic Authentication with docker login

The simplest way to authenticate is `docker login`. This works with most registry implementations.

Log in to an internal registry:

```bash
# Log in to your company's registry
docker login registry.company.com

# You will be prompted for username and password
# Credentials are stored in ~/.docker/config.json
```

For non-interactive login (CI/CD pipelines):

```bash
# Log in using command-line credentials
echo "$REGISTRY_PASSWORD" | docker login registry.company.com \
  --username "$REGISTRY_USERNAME" \
  --password-stdin
```

Always use `--password-stdin` instead of `-p` to avoid leaking credentials in shell history and process listings.

## Where Credentials Are Stored

After `docker login`, credentials are saved in `~/.docker/config.json`:

```json
{
  "auths": {
    "registry.company.com": {
      "auth": "base64-encoded-username:password"
    }
  }
}
```

This file stores credentials in base64 encoding, which is not encryption. For better security, use a credential helper.

## Using Credential Helpers

Docker supports external credential stores that keep secrets out of plain-text files.

Configure the Docker credential helper for your OS:

```json
{
  "credHelpers": {
    "registry.company.com": "osxkeychain",
    "aws_account_id.dkr.ecr.region.amazonaws.com": "ecr-login"
  }
}
```

Available credential helpers:

- `docker-credential-osxkeychain` for macOS Keychain
- `docker-credential-pass` for Linux password store
- `docker-credential-wincred` for Windows Credential Manager
- `docker-credential-ecr-login` for AWS ECR
- `docker-credential-gcr` for Google Cloud

Install the ECR credential helper for AWS:

```bash
# Install the AWS ECR credential helper
# On macOS
brew install docker-credential-helper-ecr

# On Linux
sudo apt-get install amazon-ecr-credential-helper
```

Configure it in `~/.docker/config.json`:

```json
{
  "credHelpers": {
    "123456789.dkr.ecr.us-east-1.amazonaws.com": "ecr-login"
  }
}
```

Now `docker pull 123456789.dkr.ecr.us-east-1.amazonaws.com/my-image:latest` authenticates automatically.

## Configuring TLS for Self-Signed Certificates

Internal registries often use self-signed TLS certificates or certificates signed by an internal CA. Docker rejects these by default.

### Option 1: Add the CA Certificate

The preferred approach is to trust the CA certificate.

Copy the CA certificate to Docker's certificate directory:

```bash
# Create the directory for the registry's certificates
sudo mkdir -p /etc/docker/certs.d/registry.company.com

# Copy the CA certificate
sudo cp company-ca.crt /etc/docker/certs.d/registry.company.com/ca.crt
```

The directory name must match the registry hostname (and port, if non-standard):

```bash
# For a registry on a non-standard port
sudo mkdir -p /etc/docker/certs.d/registry.company.com:5000
sudo cp company-ca.crt /etc/docker/certs.d/registry.company.com:5000/ca.crt
```

No Docker restart is needed. Docker reads this directory on every registry interaction.

### Option 2: Client Certificate Authentication

Some registries require mutual TLS (mTLS) where the client also presents a certificate.

Place the client certificate and key alongside the CA certificate:

```bash
# Directory structure for mTLS
/etc/docker/certs.d/registry.company.com/
    ca.crt          # CA certificate
    client.cert     # Client certificate
    client.key      # Client private key
```

Docker automatically uses these for TLS handshakes with the matching registry.

### Option 3: Insecure Registry (Not Recommended)

As a last resort, you can tell Docker to skip TLS verification entirely. This is insecure and should only be used for testing.

Edit `/etc/docker/daemon.json`:

```json
{
  "insecure-registries": ["registry.company.com:5000"]
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

## Setting Up a Registry Mirror

A registry mirror caches images from Docker Hub or other public registries. This speeds up pulls and reduces external bandwidth usage.

Configure a mirror in `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": [
    "https://mirror.company.com"
  ]
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

Now when you run `docker pull nginx`, Docker tries the mirror first. If the image is not cached, the mirror fetches it from Docker Hub and caches it for future requests.

## Multiple Registries in Docker Compose

Docker Compose projects often pull images from multiple registries.

This Compose file references images from different sources:

```yaml
version: "3.8"

services:
  # Image from the company's internal registry
  backend:
    image: registry.company.com/team-alpha/backend:v2.1.0

  # Image from Docker Hub (default)
  postgres:
    image: postgres:16-alpine

  # Image from a different internal registry
  frontend:
    image: harbor.company.com/team-alpha/frontend:v3.0.0

  # Image from AWS ECR
  ml-service:
    image: 123456789.dkr.ecr.us-east-1.amazonaws.com/ml-service:latest
```

Make sure you are authenticated to all registries before running `docker compose up`.

Script to authenticate all registries at once:

```bash
#!/bin/bash
# login-registries.sh - Authenticate to all company registries

# Internal Harbor registry
echo "$HARBOR_PASSWORD" | docker login registry.company.com \
  --username "$HARBOR_USERNAME" --password-stdin

# AWS ECR (uses AWS CLI)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# GitLab registry
echo "$GITLAB_TOKEN" | docker login gitlab.company.com:5050 \
  --username "$GITLAB_USERNAME" --password-stdin

echo "All registries authenticated"
```

## Pulling and Pushing to Internal Registries

Pull an image from the internal registry:

```bash
# Pull from internal registry
docker pull registry.company.com/team/my-app:v1.0.0
```

Tag and push a locally built image:

```bash
# Build the image
docker build -t my-app:latest .

# Tag it for the internal registry
docker tag my-app:latest registry.company.com/team/my-app:v1.0.0

# Push to the internal registry
docker push registry.company.com/team/my-app:v1.0.0
```

## CI/CD Pipeline Configuration

In CI/CD systems, authenticate before any Docker operations.

GitHub Actions example:

```yaml
# .github/workflows/build.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to internal registry
        uses: docker/login-action@v3
        with:
          registry: registry.company.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push
        run: |
          docker build -t registry.company.com/team/my-app:${{ github.sha }} .
          docker push registry.company.com/team/my-app:${{ github.sha }}
```

GitLab CI example:

```yaml
# .gitlab-ci.yml
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    # GitLab CI provides these variables automatically
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
  script:
    - docker build -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" .
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
```

## Configuring Docker Desktop

Docker Desktop has a GUI for registry configuration, but you can also edit the settings file directly.

On macOS, edit `~/.docker/daemon.json`:

```json
{
  "insecure-registries": [],
  "registry-mirrors": ["https://mirror.company.com"],
  "dns": ["10.0.0.2", "8.8.8.8"]
}
```

The DNS configuration is important if your internal registry hostname is only resolvable through company DNS servers.

## Kubernetes and Docker Registry Secrets

If you deploy to Kubernetes, you need to create registry secrets:

```bash
# Create a Kubernetes secret for pulling from the internal registry
kubectl create secret docker-registry company-registry \
  --docker-server=registry.company.com \
  --docker-username=deploy-user \
  --docker-password=deploy-password \
  --docker-email=devops@company.com
```

Reference it in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      imagePullSecrets:
        - name: company-registry
      containers:
        - name: app
          image: registry.company.com/team/my-app:v1.0.0
```

## Troubleshooting

**"x509: certificate signed by unknown authority"**: The registry uses a certificate that Docker does not trust. Add the CA certificate to `/etc/docker/certs.d/registry-hostname/ca.crt`.

**"unauthorized: authentication required"**: Run `docker login` for the registry. Check that credentials are correct and the user has pull permissions.

**"dial tcp: lookup registry.company.com: no such host"**: DNS resolution is failing. Check that Docker can resolve the registry hostname. You may need to add DNS servers to the Docker daemon configuration.

**Slow pulls from internal registry**: Configure the registry as a mirror for frequently used base images. Check network bandwidth between the Docker host and the registry.

## Conclusion

Configuring Docker for internal company registries involves authentication, TLS trust, and potentially network configuration. Use `docker login` with `--password-stdin` for secure authentication, place CA certificates in `/etc/docker/certs.d/` for TLS trust, and set up registry mirrors for faster pulls. In CI/CD pipelines, automate authentication with credential helpers or pipeline-specific login steps. These configurations, combined with proper credential management, give your team reliable access to internal images while maintaining security standards.
