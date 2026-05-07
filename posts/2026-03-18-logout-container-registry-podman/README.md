# How to Logout from a Container Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Authentication, Logout, Security

Description: Learn how to securely log out from container registries in Podman, removing stored credentials and managing authentication state.

---

> Logging out from registries is essential for security hygiene, especially on shared systems and CI/CD environments.

After working with private container registries, it is important to remove stored credentials when they are no longer needed. The `podman logout` command removes cached credentials from the authentication file or configured credential store, preventing unauthorized access to your registry accounts. This guide covers all aspects of logging out from registries in Podman.

---

## Basic Logout

Log out from a specific registry.

```bash
# Log out from Docker Hub

podman logout docker.io
# Removed login credentials for docker.io

# Log out from a private registry
podman logout myregistry.example.com

# Log out from Quay.io
podman logout quay.io
```

## Logging Out from All Registries

Remove credentials for every registry you are logged in to.

```bash
# Log out from all registries at once
podman logout --all
# Removed login credentials for all registries

# Verify no credentials remain
podman login docker.io --get-login 2>&1
# Error: not logged into docker.io
```

## Verifying Logout

Confirm that credentials have been removed.

```bash
# Check if you are still logged in to a specific registry
podman login docker.io --get-login 2>&1
# Expected: "not logged into docker.io"

# Inspect the auth file to confirm it is empty or the entry is gone
cat ${XDG_RUNTIME_DIR}/containers/auth.json 2>/dev/null | python3 -m json.tool

# Attempt to pull a private image (should fail after logout)
podman pull docker.io/myorg/private-image:latest 2>&1
# Expected: authentication required
```

## Logout with Custom Auth File

If you stored credentials in a custom auth file, specify it during logout.

```bash
# Log out from a registry using a specific auth file
podman logout --authfile /path/to/custom-auth.json docker.io

# Log out from all registries in the custom auth file
podman logout --all --authfile /path/to/custom-auth.json

# Verify the custom auth file is cleaned up
cat /path/to/custom-auth.json | python3 -m json.tool
```

## Cleaning Up Auth Files Manually

Sometimes you need to manually clean up credential files.

```bash
# Find all auth files on the system
find / -name "auth.json" -path "*/containers/*" 2>/dev/null

# View the contents of the default auth file
cat ${XDG_RUNTIME_DIR}/containers/auth.json 2>/dev/null

# Manually remove the auth file (nuclear option)
rm -f ${XDG_RUNTIME_DIR}/containers/auth.json

# Remove user-level auth file
rm -f ~/.config/containers/auth.json
```

## CI/CD Cleanup Script

Always clean up credentials at the end of CI/CD pipelines.

```bash
#!/bin/bash
# ci-cleanup.sh - Clean up registry credentials after CI/CD jobs

set -euo pipefail

echo "Cleaning up registry credentials..."

# Log out from all registries
podman logout --all 2>/dev/null || true

# Remove the default Linux auth file entirely for extra safety
if [ -n "${XDG_RUNTIME_DIR:-}" ]; then
    AUTH_FILE="${XDG_RUNTIME_DIR}/containers/auth.json"
    if [ -f "$AUTH_FILE" ]; then
        # Securely overwrite before deleting
        shred -u "$AUTH_FILE" 2>/dev/null || rm -f "$AUTH_FILE"
        echo "Auth file removed: $AUTH_FILE"
    fi
fi

# Clean up any custom auth files used in the pipeline
if [ -f "/tmp/ci-auth.json" ]; then
    shred -u /tmp/ci-auth.json 2>/dev/null || rm -f /tmp/ci-auth.json
    echo "Custom auth file removed"
fi

echo "Credential cleanup complete."
```

## Selective Logout

When logged in to multiple registries, you can selectively log out.

```bash
# View which registries you are logged in to
cat ${XDG_RUNTIME_DIR}/containers/auth.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
auths = data.get('auths', {})
for registry in auths:
    print(f'Logged in to: {registry}')
"

# Log out from only one registry
podman logout quay.io

# Confirm the other logins are still active
podman login docker.io --get-login
# Should still show your username
```

## Logout on Shared Systems

On shared machines, take extra precautions.

```bash
# Log out from all registries
podman logout --all

# Reset all Podman storage for the current user
podman system reset --force 2>/dev/null || true

# Remove unused local images, if desired
podman image prune --all --force
```

## Automating Logout on Session End

Set up automatic logout when your shell session ends.

```bash
# Add to ~/.bash_logout or ~/.zlogout
cat >> ~/.bash_logout <<'EOF'
# Automatically log out from all container registries on session end
if command -v podman &>/dev/null; then
    podman logout --all 2>/dev/null || true
fi
EOF
```

## Summary

The `podman logout` command removes stored credentials for container registries. You can log out from a single registry or all registries at once. Always clean up credentials on shared systems and at the end of CI/CD pipelines. For extra security, remove the auth file entirely and consider automating logout on shell session end. Verify logout was successful by checking the auth file and attempting to pull a private image.
