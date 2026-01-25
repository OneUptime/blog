# How to Set Up Docker Registry Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Registry, Authentication, Security, DevOps

Description: Configure Docker authentication for private registries including Docker Hub, GitHub Container Registry, AWS ECR, and self-hosted registries with secure credential management.

---

Private Docker registries protect your images from unauthorized access. Whether you use Docker Hub, cloud provider registries, or self-hosted solutions, proper authentication ensures only authorized users and systems can push and pull images.

## Docker Hub Authentication

### Interactive Login

```bash
# Login to Docker Hub
docker login

# Login with username (prompts for password)
docker login -u yourusername

# Login to Docker Hub explicitly
docker login docker.io
```

### Non-Interactive Login

For scripts and automation:

```bash
# Using password from stdin (recommended)
echo $DOCKER_PASSWORD | docker login -u yourusername --password-stdin

# Using environment variable
docker login -u $DOCKER_USERNAME --password-stdin <<< "$DOCKER_PASSWORD"
```

Never use `--password` on the command line as it appears in shell history.

### Personal Access Tokens

Docker Hub personal access tokens are more secure than passwords:

1. Go to Docker Hub > Account Settings > Security
2. Create new access token with appropriate permissions
3. Use the token instead of your password

```bash
# Login with access token
echo $DOCKER_TOKEN | docker login -u yourusername --password-stdin
```

## GitHub Container Registry (ghcr.io)

### Personal Access Token

```bash
# Create a PAT with read:packages and write:packages permissions
# Login using the token
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build and Push

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        run: |
          docker build -t ghcr.io/${{ github.repository }}:latest .
          docker push ghcr.io/${{ github.repository }}:latest
```

## AWS Elastic Container Registry (ECR)

### AWS CLI Authentication

```bash
# Get login password and pipe to docker login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

### Docker Credential Helper

Install the ECR credential helper for automatic authentication:

```bash
# Install on Amazon Linux / RHEL
sudo yum install amazon-ecr-credential-helper

# Install on Debian/Ubuntu
sudo apt-get install amazon-ecr-credential-helper

# Install on macOS
brew install docker-credential-helper-ecr
```

Configure Docker to use the helper:

```json
// ~/.docker/config.json
{
  "credHelpers": {
    "123456789012.dkr.ecr.us-east-1.amazonaws.com": "ecr-login",
    "public.ecr.aws": "ecr-login"
  }
}
```

### CI/CD with ECR

```yaml
# GitHub Actions
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2
```

## Google Container Registry / Artifact Registry

### Service Account Authentication

```bash
# Using service account key file
cat key.json | docker login -u _json_key --password-stdin https://gcr.io

# Using gcloud
gcloud auth configure-docker

# For Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Docker Config for GCR

```json
// ~/.docker/config.json
{
  "credHelpers": {
    "gcr.io": "gcloud",
    "us.gcr.io": "gcloud",
    "eu.gcr.io": "gcloud",
    "asia.gcr.io": "gcloud",
    "us-central1-docker.pkg.dev": "gcloud"
  }
}
```

## Azure Container Registry (ACR)

### Azure CLI Authentication

```bash
# Login using Azure CLI credentials
az acr login --name myregistry

# Get credentials for service principal
az acr credential show --name myregistry
```

### Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
  --name myregistry-sp \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.ContainerRegistry/registries/{registry-name} \
  --role acrpush

# Login with service principal
docker login myregistry.azurecr.io \
  --username $SP_APP_ID \
  --password $SP_PASSWORD
```

## Self-Hosted Registry

### Basic Authentication

Set up a registry with htpasswd authentication:

```bash
# Create password file
mkdir -p /auth
htpasswd -Bbn myuser mypassword > /auth/htpasswd

# Run registry with authentication
docker run -d \
  --name registry \
  -p 5000:5000 \
  -v /auth:/auth \
  -e "REGISTRY_AUTH=htpasswd" \
  -e "REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm" \
  -e "REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd" \
  registry:2
```

Login to the registry:

```bash
docker login localhost:5000 -u myuser -p mypassword
```

### TLS Configuration

For production, always use TLS:

```bash
# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /certs/registry.key \
  -out /certs/registry.crt \
  -subj "/CN=registry.example.com"

# Run registry with TLS
docker run -d \
  --name registry \
  -p 443:443 \
  -v /certs:/certs \
  -v /auth:/auth \
  -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.key \
  -e REGISTRY_AUTH=htpasswd \
  -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd \
  -e REGISTRY_AUTH_HTPASSWD_REALM="Registry Realm" \
  registry:2
```

## Credential Storage

### Docker Config File

Credentials are stored in `~/.docker/config.json`:

```json
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "base64encodedcredentials"
    },
    "ghcr.io": {
      "auth": "base64encodedcredentials"
    }
  }
}
```

The `auth` field is base64-encoded `username:password`. This is not secure storage.

### Credential Helpers

Use credential helpers for secure storage:

```json
{
  "credHelpers": {
    "docker.io": "osxkeychain",
    "gcr.io": "gcloud",
    "123456789.dkr.ecr.us-east-1.amazonaws.com": "ecr-login"
  },
  "credsStore": "osxkeychain"
}
```

Available helpers:

- `osxkeychain` - macOS Keychain
- `secretservice` - Linux Secret Service (GNOME Keyring)
- `wincred` - Windows Credential Manager
- `pass` - Pass password manager

### Install Credential Helper on Linux

```bash
# Download and install docker-credential-secretservice
VERSION=0.8.0
wget https://github.com/docker/docker-credential-helpers/releases/download/v${VERSION}/docker-credential-secretservice-v${VERSION}.linux-amd64
chmod +x docker-credential-secretservice-v${VERSION}.linux-amd64
sudo mv docker-credential-secretservice-v${VERSION}.linux-amd64 /usr/local/bin/docker-credential-secretservice
```

## Kubernetes Image Pull Secrets

For Kubernetes to pull from private registries:

```bash
# Create secret from Docker config
kubectl create secret generic regcred \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson

# Or create directly
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=myuser \
  --docker-password=$TOKEN \
  --docker-email=myuser@example.com
```

Use in pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: ghcr.io/myorg/myapp:latest
  imagePullSecrets:
    - name: regcred
```

## Troubleshooting Authentication

### Check Current Credentials

```bash
# List configured registries
cat ~/.docker/config.json | jq '.auths | keys'

# Test authentication
docker pull yourregistry/testimage:latest
```

### Common Issues

**Error: unauthorized**

```bash
# Re-authenticate
docker logout yourregistry.com
docker login yourregistry.com
```

**Error: certificate signed by unknown authority**

```bash
# For self-signed certs, add to Docker's trust
sudo mkdir -p /etc/docker/certs.d/yourregistry.com
sudo cp ca.crt /etc/docker/certs.d/yourregistry.com/

# Or configure insecure registry (not recommended for production)
# /etc/docker/daemon.json
# { "insecure-registries": ["yourregistry.com:5000"] }
```

**Token expired**

```bash
# Refresh ECR token
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL

# Refresh GCR token
gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin https://gcr.io
```

---

Docker registry authentication varies by provider, but the fundamentals remain consistent: use tokens instead of passwords, leverage credential helpers for secure storage, and automate authentication in CI/CD pipelines. Configure appropriate credential helpers for your registries, and ensure Kubernetes clusters have the necessary image pull secrets for private images.
