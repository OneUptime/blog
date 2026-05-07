# How to Use Authentication Files with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Authentication, Auth Files, Security

Description: A detailed guide to understanding and managing authentication files in Podman for secure registry access.

---

> Authentication files store your registry credentials and are the key to seamless pulls and pushes in Podman.

Podman uses JSON-formatted authentication files to store or reference registry credentials. These files are created when you run `podman login` and are referenced automatically during pull and push operations. Understanding how these files work gives you fine-grained control over credential management, especially in CI/CD and multi-registry environments.

---

## Default Auth File Locations

Podman looks for authentication files in several locations.

```bash
# Linux default: ${XDG_RUNTIME_DIR}/containers/auth.json
echo "Default auth file: ${XDG_RUNTIME_DIR}/containers/auth.json"

# Persistent per-user location that Podman can also read
ls -la ~/.config/containers/auth.json 2>/dev/null

# Docker-compatible location (also checked by Podman)
ls -la ~/.docker/config.json 2>/dev/null

# Show which file is used during login
podman login --verbose docker.io
```

## Auth File Structure

The auth file is a JSON document that commonly contains base64-encoded credentials.

```bash
# View the structure of an existing auth file
cat ${XDG_RUNTIME_DIR}/containers/auth.json | python3 -m json.tool
```

```json
{
    "auths": {
        "docker.io": {
            "auth": "dXNlcm5hbWU6cGFzc3dvcmQ="
        },
        "quay.io": {
            "auth": "dXNlcm5hbWU6dG9rZW4xMjM="
        },
        "ghcr.io": {
            "auth": "dXNlcm5hbWU6Z2hwX3Rva2VuMTIz"
        }
    }
}
```

```bash
# The "auth" field is base64-encoded "username:password"
echo "dXNlcm5hbWU6cGFzc3dvcmQ=" | base64 -d
# Output: username:password
```

## Creating an Auth File Manually

You can create an auth file without using `podman login`.

```bash
# Generate base64-encoded credentials
AUTH_TOKEN=$(echo -n "myuser:mypassword" | base64)

# Create the auth file
mkdir -p ${XDG_RUNTIME_DIR}/containers

cat > ${XDG_RUNTIME_DIR}/containers/auth.json <<EOF
{
    "auths": {
        "docker.io": {
            "auth": "${AUTH_TOKEN}"
        }
    }
}
EOF

# Set secure permissions
chmod 600 ${XDG_RUNTIME_DIR}/containers/auth.json

# Verify Podman can use it
podman pull docker.io/library/alpine:latest
```

## Using a Custom Auth File

Specify a different auth file for specific operations.

```bash
# Create a project-specific auth file
podman login docker.io --authfile /tmp/project-auth.json

# Pull using the custom auth file
podman pull --authfile /tmp/project-auth.json docker.io/myorg/myimage:latest

# Push using the custom auth file
podman push --authfile /tmp/project-auth.json myregistry.example.com/myimage:latest

# Build using the custom auth file
podman build --authfile /tmp/project-auth.json -t myimage:latest .
```

## Docker Compatibility

Podman can use Docker's credential file.

```bash
# Podman checks ~/.docker/config.json as a fallback
ls -la ~/.docker/config.json

# Copy Docker credentials for Podman to use
mkdir -p ${XDG_RUNTIME_DIR}/containers
cp ~/.docker/config.json ${XDG_RUNTIME_DIR}/containers/auth.json

# Or symlink to share credentials between Docker and Podman
ln -s ~/.docker/config.json ${XDG_RUNTIME_DIR}/containers/auth.json
```

## Auth Files in CI/CD Pipelines

Manage auth files securely in automated environments.

```bash
#!/bin/bash
# ci-setup-auth.sh - Set up registry auth for CI/CD

set -euo pipefail

# Create auth directory
AUTH_DIR="${XDG_RUNTIME_DIR:-/tmp}/containers"
AUTH_FILE="${AUTH_DIR}/auth.json"
mkdir -p "$AUTH_DIR"

# Build the auth file from CI/CD secrets
DOCKER_AUTH=$(echo -n "${DOCKER_USER}:${DOCKER_PASS}" | base64)
GHCR_AUTH=$(echo -n "${GITHUB_USER}:${GITHUB_TOKEN}" | base64)

cat > "$AUTH_FILE" <<EOF
{
    "auths": {
        "docker.io": {
            "auth": "${DOCKER_AUTH}"
        },
        "ghcr.io": {
            "auth": "${GHCR_AUTH}"
        }
    }
}
EOF

# Secure the file
chmod 600 "$AUTH_FILE"

export REGISTRY_AUTH_FILE="$AUTH_FILE"

echo "Auth file created at: $AUTH_FILE"
```

## Merging Auth Files

Combine credentials from multiple auth files.

```bash
# Merge two auth files using Python
python3 -c "
import json

# Load both auth files
with open('/path/to/auth1.json') as f:
    auth1 = json.load(f)
with open('/path/to/auth2.json') as f:
    auth2 = json.load(f)

# Merge the auths dictionaries
merged = {'auths': {}}
merged['auths'].update(auth1.get('auths', {}))
merged['auths'].update(auth2.get('auths', {}))

# Write the merged file
with open('/path/to/merged-auth.json', 'w') as f:
    json.dump(merged, f, indent=4)

print('Merged auth file created')
"
```

## Securing Auth Files

Protect your credential files from unauthorized access.

```bash
# Set restrictive permissions on the auth file
chmod 600 ${XDG_RUNTIME_DIR}/containers/auth.json

# Verify permissions
ls -la ${XDG_RUNTIME_DIR}/containers/auth.json
# Expected: -rw------- (readable/writable only by owner)

# Ensure the directory is also restricted
chmod 700 ${XDG_RUNTIME_DIR}/containers/

# Never commit auth files to version control
echo "auth.json" >> .gitignore
echo "*.auth" >> .gitignore
```

## Summary

Authentication files in Podman are JSON documents that store base64-encoded registry credentials or reference credential helpers. They are created automatically by `podman login` and can also be created manually or shared from Docker. You can use custom auth files per operation with the `--authfile` flag, which is useful for CI/CD pipelines and multi-project environments. Always set restrictive file permissions and never commit auth files to version control.
