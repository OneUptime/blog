# How to Fix Docker 'Unauthorized: Authentication Required' Pull Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Authentication, Unauthorized, Docker Pull, Registry, Troubleshooting, DevOps

Description: Fix Docker unauthorized and authentication required errors when pulling images from Docker Hub, ECR, GCR, and private registries.

---

You run `docker pull` and instead of your image, you get:

```
Error response from daemon: pull access denied for myapp, repository does not exist or may require 'docker login'
```

Or:

```
Error response from daemon: Head "https://registry.example.com/v2/myapp/manifests/latest": unauthorized: authentication required
```

These errors mean the Docker daemon cannot authenticate with the registry. The image might be private, your credentials might be expired, or the registry URL might be wrong. This guide walks through every cause and fix for authentication failures when pulling Docker images.

## Common Causes

Before diving into fixes, understand the typical reasons:

1. You are not logged in to the registry
2. Your credentials have expired (especially tokens from ECR, GCR)
3. The image name is misspelled (Docker interprets it as a Docker Hub request)
4. The registry requires authentication for all pulls, not just private images
5. Your Docker config file is corrupted or referencing a credential helper that is not working
6. You are behind a proxy that intercepts HTTPS connections

## Fix 1: Log In to the Registry

The most common fix. You simply need to authenticate.

For Docker Hub:

```bash
# Log in to Docker Hub
docker login

# Or specify credentials directly (useful in CI/CD)
docker login -u myuser -p mytoken

# Use a personal access token instead of your password (recommended)
echo "dckr_pat_xxxxxxxxxxxx" | docker login -u myuser --password-stdin
```

For Amazon ECR:

```bash
# Authenticate with ECR (token valid for 12 hours)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

For Google Artifact Registry / GCR:

```bash
# Authenticate using gcloud
gcloud auth configure-docker

# For Artifact Registry specifically
gcloud auth configure-docker us-docker.pkg.dev
```

For GitHub Container Registry (GHCR):

```bash
# Log in using a personal access token with read:packages scope
echo "ghp_xxxxxxxxxxxx" | docker login ghcr.io -u USERNAME --password-stdin
```

For Azure Container Registry:

```bash
# Log in with the Azure CLI
az acr login --name myregistry

# Or with credentials
docker login myregistry.azurecr.io -u <client-id> -p <client-secret>
```

After logging in, retry the pull:

```bash
# Pull the image after authenticating
docker pull myregistry.com/myapp:latest
```

## Fix 2: Check the Image Name

A surprisingly common cause: the image name is wrong. Docker uses the registry hostname as part of the image reference. If you omit it, Docker assumes Docker Hub.

```bash
# These are NOT the same
docker pull myapp:latest                           # Pulls from Docker Hub (docker.io/library/myapp)
docker pull myuser/myapp:latest                    # Pulls from Docker Hub (docker.io/myuser/myapp)
docker pull registry.example.com/myapp:latest      # Pulls from a private registry
docker pull ghcr.io/myorg/myapp:latest             # Pulls from GitHub Container Registry
```

Double-check the full image reference:

```bash
# Verify the image exists on the registry
# For Docker Hub
docker manifest inspect docker.io/myuser/myapp:latest

# For a private registry
docker manifest inspect registry.example.com/myapp:latest
```

## Fix 3: Refresh Expired Credentials

Many registries issue temporary tokens. When they expire, pulls start failing.

**Docker Hub personal access tokens** do not expire unless you revoke them, but session tokens from `docker login` with a password can become stale.

**ECR tokens** expire after 12 hours. You need to re-authenticate:

```bash
# Check when your ECR token expires
aws ecr get-authorization-token --query 'authorizationData[0].expiresAt'

# Re-authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

**GCR/Artifact Registry tokens** through `gcloud auth` also have limited lifetimes:

```bash
# Refresh gcloud credentials
gcloud auth login
gcloud auth configure-docker
```

## Fix 4: Check Your Docker Config File

Docker stores credentials in `~/.docker/config.json`. A corrupted config can cause authentication failures even after a successful login.

```bash
# View your Docker config (contains credential references)
cat ~/.docker/config.json
```

A healthy config looks like:

```json
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "base64encodedcredentials"
    },
    "123456789012.dkr.ecr.us-east-1.amazonaws.com": {
      "auth": "base64encodedcredentials"
    }
  },
  "credsStore": "desktop"
}
```

If the config uses a `credsStore` (like `desktop`, `osxkeychain`, or `secretservice`), the actual credentials are stored in the system keychain. If the credential helper is broken:

```bash
# Test the credential helper directly
echo "https://index.docker.io/v1/" | docker-credential-desktop list

# If the helper is broken, temporarily remove the credsStore entry
# and log in again to store credentials in the config file directly
```

To reset the config entirely:

```bash
# Back up and reset the Docker config
cp ~/.docker/config.json ~/.docker/config.json.bak
echo '{}' > ~/.docker/config.json

# Log in again
docker login
```

## Fix 5: Credential Helpers Not Installed

On Linux servers (especially in CI/CD), credential helpers like `docker-credential-ecr-login` or `docker-credential-gcr` may not be installed.

For ECR:

```bash
# Install the ECR credential helper
sudo apt-get install amazon-ecr-credential-helper

# Or download the binary
# Configure Docker to use it by editing ~/.docker/config.json:
# { "credHelpers": { "123456789012.dkr.ecr.us-east-1.amazonaws.com": "ecr-login" } }
```

For GCR:

```bash
# Install the GCR credential helper
gcloud components install docker-credential-gcr

# Configure it
docker-credential-gcr configure-docker
```

## Fix 6: Network and Proxy Issues

Corporate proxies often interfere with Docker registry authentication by intercepting HTTPS traffic.

```bash
# Test direct connectivity to the registry
curl -v https://registry.example.com/v2/

# If behind a proxy, configure Docker to use it
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/proxy.conf <<'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.company.com:3128"
Environment="HTTPS_PROXY=http://proxy.company.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,.company.com"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

If your proxy performs TLS inspection, you also need to trust its CA certificate:

```bash
# Add the proxy's CA certificate to Docker's trust store
sudo cp proxy-ca.crt /etc/docker/certs.d/registry.example.com/ca.crt
sudo systemctl restart docker
```

## Fix 7: Kubernetes Image Pull Authentication

In Kubernetes, pods pull images using image pull secrets, not the Docker CLI login.

```bash
# Create an image pull secret for Kubernetes
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mytoken

# Reference the secret in your pod spec
```

```yaml
# pod.yaml with image pull secret
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: myapp
      image: registry.example.com/myapp:latest
```

## Debugging Authentication Issues

A systematic debugging checklist:

```bash
# 1. Verify you can reach the registry
curl -I https://registry.example.com/v2/

# 2. Check if your credentials work
curl -u myuser:mytoken https://registry.example.com/v2/myapp/tags/list

# 3. Check the Docker daemon logs for detailed error messages
sudo journalctl -u docker -n 20 --no-pager

# 4. Enable Docker debug logging temporarily
# Edit /etc/docker/daemon.json: { "debug": true }
sudo systemctl restart docker
docker pull myapp:latest 2>&1
# Disable debug mode after troubleshooting

# 5. Check if the image/tag actually exists
docker manifest inspect registry.example.com/myapp:latest
```

## CI/CD Best Practices

- Store registry credentials in your CI system's secret management (GitHub Secrets, GitLab CI Variables, etc.), never in code
- Use service accounts or IAM roles for registry access instead of personal credentials
- For ECR, use IAM roles for ECS tasks and EC2 instances rather than static access keys
- Rotate credentials regularly and audit access logs
- Use read-only tokens when you only need to pull images

## Conclusion

Authentication errors when pulling Docker images almost always trace back to missing credentials, expired tokens, or incorrect image names. The fix follows a predictable pattern: verify the image name is correct, log in to the right registry, and confirm credentials are stored properly in Docker's config. For automated environments, use credential helpers that handle token refresh automatically, like `ecr-login` for ECR or `gcloud auth configure-docker` for GCR. With proper credential management in place, these errors disappear from your workflow.
