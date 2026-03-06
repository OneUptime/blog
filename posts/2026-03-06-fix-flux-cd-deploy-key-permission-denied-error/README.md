# How to Fix Flux CD Deploy Key Permission Denied Error

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Deploy Keys, SSH, Permission Denied, GitOps, Kubernetes, Troubleshooting

Description: A hands-on guide to diagnosing and resolving SSH deploy key permission denied errors in Flux CD, covering key formats, access levels, and key management.

---

One of the most frustrating errors in Flux CD is the "permission denied" error when the source controller tries to clone or push to a Git repository. This almost always traces back to an SSH deploy key issue. This guide covers every angle of the problem.

## Understanding Deploy Keys in Flux CD

When Flux CD connects to a Git repository via SSH, it uses a deploy key stored as a Kubernetes secret. The source-controller reads this secret and uses it to authenticate with the Git provider.

Deploy keys can have two access levels:

- **Read-only** - can clone and pull
- **Read/write** - can also push (required for image automation)

## Step 1: Identify the Error

Check the GitRepository resource for authentication errors.

```bash
# Check GitRepository status
kubectl get gitrepositories -A

# Get detailed status with error messages
kubectl describe gitrepository flux-system -n flux-system

# Look for authentication-related conditions
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.status.conditions[*].message}'
```

Common error messages:

```bash
ssh: handshake failed: ssh: unable to authenticate
git clone: Permission denied (publickey)
authentication required but no callback set
```

## Step 2: Verify the SSH Secret Exists

```bash
# Check the secret referenced by the GitRepository
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.spec.secretRef.name}'

# Verify the secret exists
kubectl get secret flux-system -n flux-system

# Check the secret has the required keys
kubectl get secret flux-system -n flux-system -o json | \
  python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(list(d['data'].keys()))"
```

The SSH secret must contain these keys:

```yaml
# Required structure of an SSH secret
apiVersion: v1
kind: Secret
metadata:
  name: flux-system
  namespace: flux-system
type: Opaque
data:
  # The private key (base64 encoded)
  identity: <base64-encoded-private-key>
  # The public key (base64 encoded)
  identity.pub: <base64-encoded-public-key>
  # Known hosts entries (base64 encoded)
  known_hosts: <base64-encoded-known-hosts>
```

## Step 3: Verify the Key Format

Different key algorithms have different compatibility. Ensure your key format is supported by your Git provider.

```bash
# Extract and inspect the private key type
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.identity}' | base64 -d | head -1

# Expected outputs:
# -----BEGIN OPENSSH PRIVATE KEY-----   (ed25519 or ecdsa)
# -----BEGIN RSA PRIVATE KEY-----       (RSA PEM format)
# -----BEGIN EC PRIVATE KEY-----        (ECDSA PEM format)
```

### Regenerate with a Supported Algorithm

```bash
# Recommended: ECDSA P-521 (wide compatibility)
flux create secret git flux-system \
  --namespace=flux-system \
  --url=ssh://git@github.com/myorg/fleet-infra \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521

# Alternative: ED25519 (modern, compact)
flux create secret git flux-system \
  --namespace=flux-system \
  --url=ssh://git@github.com/myorg/fleet-infra \
  --ssh-key-algorithm=ed25519

# Alternative: RSA 4096 (maximum compatibility)
flux create secret git flux-system \
  --namespace=flux-system \
  --url=ssh://git@github.com/myorg/fleet-infra \
  --ssh-key-algorithm=rsa \
  --ssh-rsa-bits=4096
```

After creating the secret, Flux prints the public key. You must add this to your Git repository.

## Step 4: Add the Deploy Key to Your Repository

### Extract the Public Key

```bash
# Get the public key from the Kubernetes secret
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.identity\.pub}' | base64 -d
```

### Add to GitHub

```bash
# Using the GitHub CLI
PUBLIC_KEY=$(kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.identity\.pub}' | base64 -d)

# Add as read-only deploy key
gh repo deploy-key add - -R myorg/fleet-infra \
  --title "flux-system" <<< "$PUBLIC_KEY"

# Add as read/write deploy key (needed for image automation)
gh repo deploy-key add - -R myorg/fleet-infra \
  --title "flux-system" --allow-write <<< "$PUBLIC_KEY"
```

### Add to GitLab

```bash
# GitLab: Project Settings > Repository > Deploy Keys
# Paste the public key
# Check "Grant write permissions" if needed for image automation
```

## Step 5: Fix Read-Only vs Read/Write Access

If Flux can clone the repository but fails to push (for image automation), the deploy key is read-only.

```bash
# Check source-controller logs for push errors
kubectl logs -n flux-system deployment/source-controller | grep -i "push\|denied\|permission"

# Check image-automation-controller logs
kubectl logs -n flux-system deployment/image-automation-controller | grep -i "push\|denied\|permission"
```

### Upgrade to Read/Write Access

```bash
# On GitHub: Delete the existing key and re-add with write access
gh repo deploy-key list -R myorg/fleet-infra

# Note the key ID, then delete it
gh repo deploy-key delete <KEY_ID> -R myorg/fleet-infra

# Re-add with write access
PUBLIC_KEY=$(kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.identity\.pub}' | base64 -d)

gh repo deploy-key add - -R myorg/fleet-infra \
  --title "flux-system" --allow-write <<< "$PUBLIC_KEY"
```

## Step 6: Fix Known Hosts Issues

If the known_hosts entry is missing or incorrect, SSH will reject the connection.

```bash
# Check current known_hosts in the secret
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.known_hosts}' | base64 -d

# Scan for the correct host keys
ssh-keyscan github.com 2>/dev/null
ssh-keyscan gitlab.com 2>/dev/null
```

### Update Known Hosts

```bash
# Get fresh known hosts for GitHub
KNOWN_HOSTS=$(ssh-keyscan github.com 2>/dev/null)

# Patch the secret with updated known_hosts
kubectl patch secret flux-system -n flux-system \
  --type merge \
  -p "{\"data\":{\"known_hosts\":\"$(echo "$KNOWN_HOSTS" | base64)\"}}"

# Or recreate the entire secret
flux create secret git flux-system \
  --namespace=flux-system \
  --url=ssh://git@github.com/myorg/fleet-infra \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521
```

## Step 7: Fix GitHub SSH Key Rotation Issues

GitHub periodically rotates its SSH host keys. If your known_hosts is outdated, connections will fail.

```bash
# Check if your known_hosts matches current GitHub keys
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.known_hosts}' | base64 -d | grep github

# Compare with current GitHub host keys
ssh-keyscan github.com 2>/dev/null

# Update if they differ
ssh-keyscan github.com 2>/dev/null > /tmp/known_hosts
kubectl create secret generic flux-system \
  --namespace=flux-system \
  --from-file=identity=<(kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity}' | base64 -d) \
  --from-file=identity.pub=<(kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity\.pub}' | base64 -d) \
  --from-file=known_hosts=/tmp/known_hosts \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 8: Test SSH Connectivity from Inside the Cluster

Verify that SSH works from within the cluster network.

```bash
# Create a debug pod with SSH client
kubectl run -n flux-system ssh-test --rm -it --restart=Never \
  --image=alpine/git -- sh -c "
    mkdir -p ~/.ssh && \
    echo 'Testing SSH to GitHub...' && \
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null && \
    ssh -T git@github.com 2>&1 || true
  "
```

### Test with the Actual Deploy Key

```bash
# Extract the private key to a temp file
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.identity}' | base64 -d > /tmp/flux-key
chmod 600 /tmp/flux-key

# Test SSH with the deploy key
ssh -i /tmp/flux-key -T git@github.com

# Clean up
rm /tmp/flux-key
```

## Step 9: Fix Multiple Deploy Key Conflicts

GitHub does not allow the same SSH public key to be added as a deploy key to multiple repositories. Each repository needs a unique key.

```bash
# Create separate secrets for each repository
flux create secret git app-repo-auth \
  --namespace=flux-system \
  --url=ssh://git@github.com/myorg/app-repo \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521

flux create secret git infra-repo-auth \
  --namespace=flux-system \
  --url=ssh://git@github.com/myorg/infra-repo \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521
```

Reference the correct secret in each GitRepository:

```yaml
# GitRepository for app repo
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/myorg/app-repo
  ref:
    branch: main
  secretRef:
    # Each repo uses its own secret with a unique key
    name: app-repo-auth
---
# GitRepository for infra repo
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infra-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/myorg/infra-repo
  ref:
    branch: main
  secretRef:
    name: infra-repo-auth
```

## Step 10: Use HTTPS as an Alternative

If SSH deploy keys continue to cause issues, switch to HTTPS with a personal access token.

```bash
# Create an HTTPS secret
flux create secret git flux-system \
  --namespace=flux-system \
  --url=https://github.com/myorg/fleet-infra \
  --username=git \
  --password=${GITHUB_TOKEN}
```

Update the GitRepository to use HTTPS:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  # Use HTTPS URL instead of SSH
  url: https://github.com/myorg/fleet-infra.git
  ref:
    branch: main
  secretRef:
    name: flux-system
```

## Step 11: Full Debugging Checklist

```bash
# 1. Check GitRepository status
kubectl get gitrepositories -A -o wide

# 2. Verify secret exists and has correct keys
kubectl get secret flux-system -n flux-system -o json | \
  python3 -c "import sys,json; print(list(json.loads(sys.stdin.read())['data'].keys()))"

# 3. Extract and verify public key
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.identity\.pub}' | base64 -d

# 4. Check deploy keys on the repository
gh repo deploy-key list -R myorg/fleet-infra

# 5. Verify known_hosts is current
kubectl get secret flux-system -n flux-system \
  -o jsonpath='{.data.known_hosts}' | base64 -d

# 6. Check source-controller logs
kubectl logs -n flux-system deployment/source-controller --tail=50

# 7. Force reconciliation
flux reconcile source git flux-system
```

## Summary

Deploy key permission denied errors in Flux CD typically stem from:

- **Key not added to repository** - the public key must be registered as a deploy key
- **Read-only access** - write access is needed for image automation push operations
- **Wrong key format** - some providers require specific algorithms
- **Stale known_hosts** - host key rotation causes verification failures
- **Duplicate key conflict** - same public key cannot be used across multiple GitHub repos

Always extract the public key from the Kubernetes secret and verify it matches what is registered in your Git provider.
