# How to Fix 'Custom Registry Credentials Ignored' in Portainer - Ignored

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Registry, Troubleshooting, Authentication, DevOps

Description: Learn how to diagnose and fix the common Portainer issue where custom registry credentials are ignored during image pulls.

## Introduction

A common frustration with Portainer is configuring a custom private registry and then finding that images fail to pull because the credentials are seemingly ignored. This can happen for several reasons: a mismatch between the registry configuration and the image reference, Docker credential helper precedence during testing, or Portainer configuration issues. This guide covers systematic diagnosis and fixes.

## Common Symptoms

```bash
# Pull fails even though registry is configured

Error: pull access denied for registry.company.com/myimage,
repository does not exist or may require 'docker login'

# Or authentication still fails
Error: unauthorized: authentication required

# Or wrong registry used
Pulling from docker.io instead of registry.company.com
```

## Root Cause Analysis

### Cause 1: URL Mismatch

The most common cause - the image reference is not written for the same registry host and port configured in Portainer.

```text
Portainer registry URL:  https://registry.company.com
Image in stack:          https://registry.company.com/myimage:latest  ← Invalid image reference

Portainer registry URL:  registry.company.com:5000
Image in stack:          registry.company.com/myimage:latest  ← Missing port
```

Docker image references use the registry host and optional port, not a URL scheme. Portainer can store the registry URL with or without a protocol, and if you omit it, Portainer assumes `https://` by default.

**Fix:**

```yaml
# If Portainer registry URL is: registry.company.com
# Or: https://registry.company.com
# Image in Compose must be:
services:
  app:
    image: registry.company.com/myimage:latest   # No https://, correct port
```

### Cause 2: Docker Credential Helper Precedence

Docker CLI credentials live in `~/.docker/config.json` or an external credential store. Docker resolves credentials using `credHelpers` and `credsStore` before inline auth entries, which can confuse manual testing. This does not directly replace the credentials saved in Portainer.

```bash
# Inspect Docker CLI credential configuration used for manual testing
cat ~/.docker/config.json

# Remove CLI credentials for a specific registry before retesting
docker logout registry.company.com

# If you're using a credential helper, inspect or clear that store as well
```

### Cause 3: Portainer Agent vs Direct Connection

For remote environments using the Portainer Agent, credentials are passed from the Portainer server to the agent. If the agent can't reach the registry, image pulls fail.

```bash
# Test connectivity from the Docker host (where agent runs), not from Portainer server
curl -u user:pass https://registry.company.com/v2/
```

### Cause 4: Kubernetes Namespace Access

For Kubernetes environments, registry access is namespace-scoped in Portainer. Make sure the registry is granted to the target namespace. When you assign registry access, Portainer creates the Kubernetes registry secret and adds it as an `imagePullSecret` on the default ServiceAccount for that namespace.

## Step 1: Verify the Registry URL Configuration

```bash
# In Portainer, go to Registries and check the URL
# The image reference must use the same registry host and port

# Example image: harbor.company.com/prod/myapp:latest
# Registry URL can be: harbor.company.com or https://harbor.company.com
# The image reference itself should never include https://
```

## Step 2: Test Credentials from the Docker Host

```bash
# SSH into the Docker host
ssh user@docker-host

# Test the exact credentials configured in Portainer
echo 'mypassword' | docker login harbor.company.com \
  --username portainer-user \
  --password-stdin

# If this fails, the credentials are wrong - fix them in Portainer
```

## Step 3: Clear Docker Credential Cache

```bash
# View Docker CLI credential configuration on the host you are testing from
cat ~/.docker/config.json

# Remove stale CLI credentials
docker logout harbor.company.com

# Verify the registry entry is removed or that the configured credential helper is expected
cat ~/.docker/config.json
```

## Step 4: Verify Portainer Version and Registry Support

```bash
# Portainer versions have different registry handling
docker exec portainer /portainer --version
```

Known issues:
- Agent and server versions should match
- If you are upgrading from Portainer 1.x, follow the official upgrade path and update to 2.0.0 before a current release

## Step 5: Use Docker Config Secret (Kubernetes)

For Kubernetes environments, first make sure the registry has been granted access to the target namespace in Portainer. If you are deploying outside Portainer or need a manual fallback, create an image pull secret in the namespace:

```bash
# Create image pull secret in the target namespace
kubectl create secret docker-registry regcred \
  --docker-server=registry.company.com \
  --docker-username=portainer-user \
  --docker-password=mypassword \
  --namespace=production

# Reference in deployment
```

```yaml
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: app
      image: registry.company.com/myapp:latest
```

## Step 6: Force Re-authentication

Sometimes resetting the registry configuration in Portainer helps:

1. Go to **Registries**
2. Delete the failing registry
3. Re-add it with fresh credentials
4. Test a deployment immediately

## Step 7: Check Portainer Agent Version

If using remote agents, ensure the agent and server versions match:

```bash
# Check the deployed Portainer and Agent image tags
docker inspect --format '{{.Config.Image}}' portainer
docker inspect --format '{{.Config.Image}}' portainer_agent

# Agent and server should be on the same Portainer release
# Mismatched versions can cause credential passing failures
```

## Step 8: Enable Debug Logging

For deeper investigation:

```bash
# Start Portainer with debug logging
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --log-level DEBUG

# Check logs
docker logs -f portainer | grep -Ei 'registry|credential|auth'
```

## Step 9: Manual Docker Login as Diagnostic Check

If Portainer credentials still aren't working, test the registry manually from the Docker host:

```bash
# This updates the Docker CLI's local credential store for the current user
echo 'password' | docker login registry.company.com \
  --username user \
  --password-stdin

# It can confirm host reachability and account validity
# It does not update Portainer's saved registry credentials
```

Use this to validate the host and account, not as a permanent Portainer fix.

## Prevention Checklist

```bash
[ ] Image references use the correct registry host and port
[ ] No https:// prefix appears in the image reference
[ ] Port number included if non-standard (e.g., :5000)
[ ] Credentials tested directly on the Docker host
[ ] Docker CLI credential helper / cache checked during manual testing
[ ] For Kubernetes: registry access granted to the target namespace in Portainer, or image pull secrets created manually if deploying outside Portainer
[ ] Portainer agent and server versions match
```

## Conclusion

The "custom registry credentials ignored" issue almost always comes down to an image reference mismatch, namespace access on Kubernetes, or confusion between Portainer's saved credentials and the Docker CLI's own credential store. Verify that the image points to the same registry host and port configured in Portainer, test authentication directly on the Docker host, and if you're troubleshooting with `docker login`, clear stale CLI credentials so the test is repeatable. For Kubernetes deployments, ensure the registry is granted to the target namespace in Portainer or create the image pull secret manually when deploying outside Portainer.
