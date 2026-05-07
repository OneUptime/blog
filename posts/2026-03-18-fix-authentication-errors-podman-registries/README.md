# How to Fix Authentication Errors with Podman Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Authentication, Registry, Docker Hub

Description: A detailed guide to resolving authentication errors when pulling or pushing images with Podman, covering credential storage, registry configuration, and common login issues.

---

> Authentication errors with Podman registries can block your entire container workflow. This guide covers how to properly configure credentials, fix login failures, and troubleshoot registry access issues.

Working with container registries is a fundamental part of any container workflow. Whether you are pulling base images from Docker Hub, pushing to a private registry, or accessing images from GitHub Container Registry, authentication errors can bring your work to a halt. Podman handles registry authentication differently from Docker in several key ways, and understanding these differences is essential to fixing login issues.

---

## How Podman Handles Registry Authentication

Podman stores registry credentials in a JSON file rather than relying on a background daemon. On Linux, the default read/write credentials file is:

- `${XDG_RUNTIME_DIR}/containers/auth.json` (typically `/run/user/$UID/containers/auth.json`)

Podman can also read credentials from other locations, including the persistent containers auth file and the legacy Docker-compatible location:

```bash
~/.config/containers/auth.json
~/.docker/config.json
```

Check whether Podman has a stored login for a registry:

```bash
podman login --get-login docker.io 2>&1
```

## Common Authentication Errors and Fixes

### 1. "unauthorized: authentication required" When Pulling Images

This is the most common error. It occurs when pulling images that require authentication, especially from Docker Hub with rate limiting:

```text
Error: initializing source docker://myrepo/myimage:latest: unable to retrieve auth token: invalid username/password: unauthorized: authentication required
```

First, log in to the registry:

```bash
podman login docker.io
```

Enter your username and password (or access token) when prompted. For Docker Hub, you should use a Personal Access Token rather than your password:

```bash
# Using an access token

podman login docker.io -u yourusername -p your_access_token
```

Verify the login was successful:

```bash
podman login --get-login docker.io
```

### 2. Credential Storage File Permissions

If you have logged in but still get authentication errors, the credentials file might have incorrect permissions or be stored in an unexpected location:

```bash
# Find all auth.json files
find / -name "auth.json" -path "*/containers/*" 2>/dev/null

# Check permissions
ls -la ${XDG_RUNTIME_DIR}/containers/auth.json
ls -la ~/.docker/config.json 2>/dev/null
```

Fix permissions if needed:

```bash
chmod 600 ${XDG_RUNTIME_DIR}/containers/auth.json
```

You can also explicitly set the auth file location:

```bash
# Set the auth file path
export REGISTRY_AUTH_FILE=$HOME/.config/containers/auth.json

# Log in again
podman login docker.io
```

To make this permanent, add it to your shell profile:

```bash
echo 'export REGISTRY_AUTH_FILE=$HOME/.config/containers/auth.json' >> ~/.bashrc
```

### 3. Docker Hub Rate Limiting

Docker Hub imposes pull rate limits: 100 pulls per 6 hours for anonymous users and 200 pulls per 6 hours for authenticated Docker Personal users. Docker Pro, Team, and Business users are not subject to the 6-hour pull rate limit. If you hit these limits, you will see:

```text
Error: initializing source: toomanyrequests: You have reached your pull rate limit
```

Authenticate to use your account's limit:

```bash
podman login docker.io -u yourusername
```

For CI/CD environments where you hit limits frequently, consider mirroring images to a private registry:

```bash
# Pull and push to your private registry
podman pull docker.io/library/nginx:latest
podman tag docker.io/library/nginx:latest myregistry.example.com/nginx:latest
podman push myregistry.example.com/nginx:latest
```

Or configure a registry mirror in `/etc/containers/registries.conf`:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.gcr.io"
```

### 4. Self-Signed Certificate Errors

When using a private registry with self-signed TLS certificates, you will see:

```text
Error: pinging container registry: x509: certificate signed by unknown authority
```

There are several ways to fix this.

Add the CA certificate to your system trust store:

```bash
# RHEL / Fedora / CentOS
sudo cp my-registry-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust

# Ubuntu / Debian
sudo cp my-registry-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

Alternatively, configure Podman to allow insecure connections for the specific registry. Edit `/etc/containers/registries.conf.d/myregistry.conf`:

```toml
[[registry]]
location = "myregistry.example.com:5000"
insecure = true
```

For a quick test without modifying system configuration:

```bash
podman login myregistry.example.com:5000 --tls-verify=false
podman pull myregistry.example.com:5000/myimage:latest --tls-verify=false
```

### 5. Registry Not Found or Unqualified Image Names

Unlike Docker, Podman does not default to Docker Hub for unqualified image names. If you run:

```bash
podman pull nginx
```

Podman may prompt you to select a registry or fail with an error. Configure default search registries in `/etc/containers/registries.conf`:

```toml
unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]
```

Note: Older Podman versions used a v1 format with `[registries.search]` sections. This format is deprecated and cannot be mixed with the current v2 format shown above.

For rootless users, create `~/.config/containers/registries.conf` with the same content.

### 6. Credential Helper Issues

Podman supports credential helpers like `docker-credential-secretservice` or `docker-credential-pass` for secure credential storage. Podman supports the `credHelpers` format, but not Docker's global `credsStore` setting. If a helper is configured but not installed, you will get errors:

Check the configured helper:

```bash
cat ${REGISTRY_AUTH_FILE:-${XDG_RUNTIME_DIR}/containers/auth.json} 2>/dev/null
cat ~/.docker/config.json 2>/dev/null | grep credHelpers
```

If you see `"credHelpers": {"registry.example.com": "secretservice"}` but the helper is not installed:

```bash
# Install the credential helper
# Fedora / RHEL
sudo dnf install docker-credential-secretservice

# Or remove the credHelpers entry to use plain file storage
# Edit auth.json or config.json and remove the "credHelpers" entry
```

### 7. GitHub Container Registry (ghcr.io) Authentication

GitHub Container Registry requires a Personal Access Token (classic) with the `read:packages` scope for private packages you need to pull:

```bash
# Create a token at https://github.com/settings/tokens
# Select the read:packages scope

# Log in with your token
echo "YOUR_GITHUB_TOKEN" | podman login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

For GitHub Actions, use the built-in token:

```yaml
steps:
  - name: Log in to GHCR
    run: echo "${{ secrets.GITHUB_TOKEN }}" | podman login ghcr.io -u ${{ github.actor }} --password-stdin
```

### 8. AWS ECR Authentication

Amazon ECR uses temporary credentials that expire. You need to refresh them regularly:

```bash
# Get the login password from AWS
aws ecr get-login-password --region us-east-1 | podman login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

For automation, create a script or cron job to refresh credentials:

```bash
#!/bin/bash
# ecr-login.sh - Run every 11 hours (tokens expire after 12)
REGION="us-east-1"
ACCOUNT_ID="123456789"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

aws ecr get-login-password --region "$REGION" | \
  podman login --username AWS --password-stdin "$REGISTRY"
```

## Debugging Authentication Issues

When all else fails, use these commands to diagnose the problem:

```bash
# Test registry connectivity
curl -v https://registry.example.com/v2/

# Check current auth configuration
podman system info --format '{{.Registries}}'

# Verbose login for debugging
podman login docker.io --verbose

# Check configured search registries
podman info --format '{{range index .Registries "search"}}{{.}}{{"\n"}}{{end}}'

# Remove all stored credentials and start fresh
podman logout --all
podman login docker.io
```

## Conclusion

Authentication errors with Podman registries usually come down to missing or misconfigured credentials, certificate trust issues, or registry-specific authentication requirements. The most reliable approach is to explicitly log in with `podman login`, ensure your credentials file has correct permissions, and configure your registries in `registries.conf`. For CI/CD pipelines, always use token-based authentication and handle credential rotation for services like AWS ECR that use temporary tokens.
