# How to Login to a Container Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Authentication, Login

Description: A practical guide to logging in to container registries with Podman, covering interactive and non-interactive authentication methods.

---

> Logging in to a container registry is the first step to pulling private images and pushing your own.

Most container registries require authentication before you can pull private images or push new ones. Podman provides the `podman login` command to handle registry authentication, storing credentials in an auth file for future use. This guide covers all the ways to authenticate with container registries in Podman.

---

## Basic Interactive Login

The simplest way to log in is interactively with a username and password prompt.

```bash
# Log in to Docker Hub

podman login docker.io
# Username: yourusername
# Password: (entered securely, not displayed)
# Login Succeeded!

# Log in to Quay.io
podman login quay.io

# Log in to a private registry
podman login myregistry.example.com
```

## Non-Interactive Login

For scripts and CI/CD pipelines, provide credentials on the command line.

```bash
# Provide username and password directly
podman login docker.io --username myuser --password mypassword

# Provide password via stdin (more secure, avoids shell history)
echo "mypassword" | podman login docker.io --username myuser --password-stdin

# Read password from a file
podman login docker.io --username myuser --password-stdin < /path/to/password-file

# Use environment variables in CI/CD
podman login docker.io \
  --username "$REGISTRY_USER" \
  --password-stdin <<< "$REGISTRY_PASSWORD"
```

## Login with Token-Based Authentication

Some registries use tokens instead of passwords.

```bash
# Log in to GitHub Container Registry with a personal access token
echo "$GITHUB_TOKEN" | podman login ghcr.io --username myuser --password-stdin

# Log in to GitLab Container Registry with a deploy token
podman login registry.gitlab.com \
  --username deploy-token-user \
  --password-stdin <<< "$GITLAB_DEPLOY_TOKEN"
```

## Specifying the Auth File Location

Podman stores credentials in an auth file. You can control where this file is stored.

```bash
# Default auth file location
# Linux: ${XDG_RUNTIME_DIR}/containers/auth.json
# Windows/macOS: $HOME/.config/containers/auth.json

# View the auth file path used during login
podman login docker.io --verbose

# Store credentials in a custom auth file
podman login docker.io --authfile /path/to/custom-auth.json

# Use the custom auth file for subsequent operations
podman pull --authfile /path/to/custom-auth.json docker.io/myorg/myimage:latest
```

## Verifying Login Status

Check if you are currently logged in to a registry.

```bash
# Check login status for a specific registry
podman login docker.io --get-login
# Returns the username if logged in

# View stored credentials (the file contains base64-encoded credentials)
cat ${XDG_RUNTIME_DIR}/containers/auth.json | python3 -m json.tool

# Test login by pulling a private image
podman pull docker.io/myorg/private-image:latest
```

## Login to Multiple Registries

You can be logged in to multiple registries simultaneously.

```bash
# Log in to several registries
podman login docker.io --username user1 --password-stdin <<< "$DOCKERHUB_PASS"
podman login quay.io --username user2 --password-stdin <<< "$QUAY_PASS"
podman login ghcr.io --username user3 --password-stdin <<< "$GITHUB_TOKEN"

# All credentials are stored in the same auth file
cat ${XDG_RUNTIME_DIR}/containers/auth.json | python3 -m json.tool
```

## Login with TLS Options

When connecting to registries with custom TLS settings.

```bash
# Login to a registry with a self-signed certificate
podman login --tls-verify=false dev-registry.local:5000

# Login using a custom CA certificate
podman login --cert-dir=/path/to/certs myregistry.example.com

# Login with client certificate authentication
podman login --cert-dir=/etc/containers/certs.d/myregistry.example.com \
  myregistry.example.com
```

## CI/CD Pipeline Login Script

A complete login script for CI/CD environments.

```bash
#!/bin/bash
# ci-registry-login.sh - Log in to container registries in CI/CD

set -euo pipefail

# Function to login with error handling
registry_login() {
    local registry="$1"
    local username="$2"
    local password="$3"

    echo "Logging in to ${registry}..."
    if echo "${password}" | podman login "${registry}" \
        --username "${username}" \
        --password-stdin 2>/dev/null; then
        echo "Successfully logged in to ${registry}"
    else
        echo "ERROR: Failed to log in to ${registry}" >&2
        return 1
    fi
}

# Login to required registries
registry_login "docker.io" "${DOCKER_USER}" "${DOCKER_PASS}"
registry_login "ghcr.io" "${GITHUB_USER}" "${GITHUB_TOKEN}"

echo "All registry logins complete."
```

## Summary

Podman's `podman login` command supports interactive and non-interactive authentication to container registries. Credentials are stored in a JSON auth file that can be customized per user or per operation. For CI/CD, use `--password-stdin` to avoid exposing credentials in shell history. You can be logged in to multiple registries simultaneously, and Podman handles TLS options for registries with custom certificate configurations.
