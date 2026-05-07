# How to Use Skopeo with Podman Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Authentication, Registry, Security

Description: Learn how Skopeo and Podman share authentication credentials and how to manage registry logins across both tools seamlessly.

---

> Skopeo and Podman use the same authentication configuration by default, so a single `podman login` makes those credentials available to Skopeo automatically.

Working with private container registries requires authentication. One of the key advantages of the Podman ecosystem is that Skopeo, Podman, and Buildah all share the same authentication configuration. This means you can log in once with Podman and use those credentials seamlessly across all three tools. This guide covers how authentication works, where credentials are stored, and how to manage auth across different scenarios.

---

## How Shared Authentication Works

Podman, Skopeo, and Buildah use the same primary auth file and credential search path by default.

```bash
# On Linux, the primary read/write auth file is:
#   ${XDG_RUNTIME_DIR}/containers/auth.json
# Additional credentials may also be read from:
#   ${XDG_CONFIG_HOME}/containers/auth.json (usually ~/.config/containers/auth.json)
#   ~/.docker/config.json
#   ~/.dockercfg

# Check the primary auth file location
AUTH_FILE="${REGISTRY_AUTH_FILE:-${XDG_RUNTIME_DIR}/containers/auth.json}"
echo "$AUTH_FILE"

# View the current primary auth configuration if it exists
[ -f "$AUTH_FILE" ] && jq . "$AUTH_FILE"
```

## Logging In with Podman for Skopeo

A simple `podman login` makes credentials available to Skopeo.

```bash
# Log in to Docker Hub
podman login docker.io
# Enter username and password when prompted

# Log in to a private registry
podman login registry.example.com

# Log in to GitHub Container Registry
podman login ghcr.io -u YOUR_GITHUB_USERNAME

# Log in to AWS ECR (using the token from AWS CLI)
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Verify - Skopeo can now access the registry without extra auth
skopeo inspect docker://registry.example.com/myapp:latest
skopeo list-tags docker://registry.example.com/myapp
```

## Using a Custom Auth File

You can point both tools to a specific auth file for isolated environments.

```bash
# Log in with Podman using a custom auth file
podman login \
  --authfile /opt/ci/auth.json \
  registry.example.com

# Use the same custom auth file with Skopeo
skopeo copy \
  --authfile /opt/ci/auth.json \
  docker://registry.example.com/myapp:v1.0 \
  docker://backup-registry.example.com/myapp:v1.0

skopeo inspect \
  --authfile /opt/ci/auth.json \
  docker://registry.example.com/myapp:v1.0
```

## Passing Credentials Directly

For scripts and automation, you can pass credentials on the command line.

```bash
# Use --creds for Skopeo commands
skopeo inspect \
  --creds "username:password" \
  docker://registry.example.com/myapp:latest

# Use separate source and destination credentials for copy
skopeo copy \
  --src-creds "user1:pass1" \
  --dest-creds "user2:pass2" \
  docker://source-registry.example.com/myapp:v1 \
  docker://dest-registry.example.com/myapp:v1

# Use environment variables to avoid credentials in command history
export REG_USER="myuser"
export REG_PASS="mypassword"
skopeo inspect \
  --creds "${REG_USER}:${REG_PASS}" \
  docker://registry.example.com/myapp:latest
```

## Managing Multiple Registry Credentials

The auth file stores credentials for multiple registries simultaneously.

```bash
# Log in to several registries
podman login docker.io
podman login quay.io
podman login ghcr.io
podman login registry.example.com

# View all stored registry entries from the primary auth file
AUTH_FILE="${REGISTRY_AUTH_FILE:-${XDG_RUNTIME_DIR}/containers/auth.json}"
jq '.auths | keys' "$AUTH_FILE"

# The auth file structure looks like this:
# {
#   "auths": {
#     "docker.io": { "auth": "base64-encoded-creds" },
#     "quay.io": { "auth": "base64-encoded-creds" },
#     "ghcr.io": { "auth": "base64-encoded-creds" }
#   }
# }

# Log out from a specific registry
podman logout registry.example.com

# Log out from all registries
podman logout --all
```

## Authentication in CI/CD Environments

In CI/CD pipelines, manage credentials carefully using environment variables and temporary auth files.

```bash
#!/bin/bash
# ci-auth-setup.sh - Set up registry auth for CI/CD

# Create a temporary auth file for this pipeline run
AUTH_DIR=$(mktemp -d)
AUTH_FILE="$AUTH_DIR/auth.json"

# Log in using CI/CD secrets (environment variables set by the CI system)
echo "$REGISTRY_PASS" | podman login \
  --authfile "$AUTH_FILE" \
  --username "$REGISTRY_USER" \
  --password-stdin \
  registry.example.com

# Use Skopeo with the temporary auth file
skopeo copy \
  --authfile "$AUTH_FILE" \
  "containers-storage:myapp:${CI_COMMIT_SHA}" \
  "docker://registry.example.com/myapp:${CI_COMMIT_SHA}"

# Clean up the auth file after use
rm -rf "$AUTH_DIR"
echo "Auth file cleaned up."
```

## Token-Based Authentication

Some registries use tokens instead of username/password pairs.

```bash
# Log in to GitHub Container Registry with a personal access token (classic)
echo "$CR_PAT" | podman login ghcr.io \
  --username "$GITHUB_USERNAME" \
  --password-stdin

# Log in to GitLab Container Registry with a deploy token
echo "$GITLAB_DEPLOY_TOKEN" | podman login registry.gitlab.com \
  --username "$GITLAB_DEPLOY_USER" \
  --password-stdin

# Skopeo can now access both registries
skopeo inspect docker://ghcr.io/myorg/myapp:latest
skopeo copy \
  docker://ghcr.io/myorg/myapp:latest \
  docker://registry.gitlab.com/myorg/myapp:latest
```

## Troubleshooting Authentication Issues

When authentication fails, here are common debugging steps.

```bash
# Check if the primary auth file exists and has content
AUTH_FILE="${REGISTRY_AUTH_FILE:-${XDG_RUNTIME_DIR}/containers/auth.json}"
ls -la "$AUTH_FILE"
jq . "$AUTH_FILE"

# Test authentication with a simple inspect
skopeo inspect docker://registry.example.com/myapp:latest 2>&1

# Check if credentials are valid by logging in again
podman login registry.example.com

# Force re-authentication by removing the auth file entry
podman logout registry.example.com
podman login registry.example.com

# Enable debug output for more detail
skopeo --debug inspect docker://registry.example.com/myapp:latest
```

## Summary

Skopeo and Podman share a unified authentication system through a common auth configuration and credential lookup path. A single `podman login` grants Skopeo access to the same registries without additional configuration. You can manage credentials for multiple registries, use custom auth files for isolated environments, pass credentials directly for automation, and integrate token-based authentication for cloud registries. This shared approach simplifies credential management and ensures consistent access across the entire Podman toolchain.
