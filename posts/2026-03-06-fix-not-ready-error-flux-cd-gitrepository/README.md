# How to Fix 'not ready' Error in Flux CD GitRepository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitRepository, Not Ready, Troubleshooting, Kubernetes, GitOps

Description: A practical guide to diagnosing and fixing the 'not ready' error in Flux CD GitRepository resources with step-by-step solutions.

---

## Introduction

When working with Flux CD, one of the most common errors you will encounter is the GitRepository resource stuck in a "not ready" state. This error prevents Flux from pulling your manifests and applying them to your cluster. In this guide, we will walk through the common causes and provide actionable fixes for each scenario.

## Understanding the Error

The "not ready" error appears when you inspect your GitRepository resource and see a status condition like:

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: GitOperationFailed
      message: "failed to checkout and determine revision: ..."
```

You can check the status of your GitRepository with:

```bash
# Get the status of all GitRepository resources
kubectl get gitrepositories -A

# Get detailed information about a specific GitRepository
kubectl describe gitrepository <name> -n flux-system
```

## Cause 1: Wrong Repository URL

One of the most frequent causes is a typo or incorrect format in the repository URL.

### Diagnosing

```bash
# Check the current URL configured
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.url}'
```

Look for common mistakes such as:
- Using `git@` prefix with HTTPS authentication
- Missing `.git` suffix
- Incorrect hostname

### Fix

Update the GitRepository resource with the correct URL:

```yaml
# git-repository-fix.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  # For HTTPS access
  url: https://github.com/my-org/my-repo.git
  # For SSH access, use:
  # url: ssh://git@github.com/my-org/my-repo.git
  ref:
    branch: main
```

Apply the fix:

```bash
kubectl apply -f git-repository-fix.yaml
```

## Cause 2: Authentication Issues

If the repository is private, Flux needs valid credentials to access it.

### Diagnosing

```bash
# Check if a secret is referenced
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.secretRef}'

# Check if the secret exists
kubectl get secret <secret-name> -n flux-system

# Look for auth-related error messages
kubectl describe gitrepository <name> -n flux-system | grep -i "auth\|credential\|permission"
```

### Fix for HTTPS Token Authentication

```yaml
# Create or update the secret with a valid token
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <your-personal-access-token>
```

```bash
# Apply the secret
kubectl apply -f git-credentials.yaml

# Make sure the GitRepository references the secret
kubectl patch gitrepository <name> -n flux-system \
  --type merge \
  -p '{"spec":{"secretRef":{"name":"git-credentials"}}}'
```

### Fix for SSH Key Authentication

```bash
# Generate a new SSH key pair if needed
ssh-keygen -t ed25519 -f identity -C "flux" -q -N ""

# Create the secret from the key files
kubectl create secret generic git-ssh-credentials \
  --from-file=identity=./identity \
  --from-file=identity.pub=./identity.pub \
  --from-file=known_hosts=./known_hosts \
  -n flux-system
```

Then update the GitRepository to reference the SSH secret:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: ssh://git@github.com/my-org/my-repo.git
  secretRef:
    name: git-ssh-credentials
  ref:
    branch: main
```

## Cause 3: Branch Not Found

If the specified branch does not exist in the remote repository, Flux cannot check it out.

### Diagnosing

```bash
# Check which branch is configured
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.ref}'

# Look for "reference not found" in the error message
kubectl describe gitrepository <name> -n flux-system | grep -i "reference not found"
```

### Fix

Update the branch reference to match an existing branch:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/my-org/my-repo.git
  ref:
    # Change to the correct branch name
    branch: main  # was previously "master" or a typo
```

You can also use a tag or semver instead of a branch:

```yaml
spec:
  ref:
    # Use a specific tag
    tag: v1.0.0
    # Or use semver range
    # semver: ">=1.0.0 <2.0.0"
```

## Cause 4: Network Connectivity Issues

The source-controller pod may not be able to reach the Git server due to network policies, proxy settings, or DNS issues.

### Diagnosing

```bash
# Check the source-controller pod logs
kubectl logs -n flux-system deploy/source-controller | grep -i "error\|fail\|timeout"

# Check if the pod can resolve the Git server hostname
kubectl exec -n flux-system deploy/source-controller -- nslookup github.com

# Check network policies that might block egress
kubectl get networkpolicies -n flux-system
```

### Fix for Proxy Configuration

If your cluster is behind a proxy, configure the source-controller to use it:

```bash
# Patch the source-controller deployment with proxy settings
kubectl set env deployment/source-controller \
  -n flux-system \
  HTTP_PROXY=http://proxy.example.com:3128 \
  HTTPS_PROXY=http://proxy.example.com:3128 \
  NO_PROXY=.cluster.local,.svc,10.0.0.0/8
```

### Fix for Self-Signed Certificates

If your Git server uses a self-signed certificate:

```bash
# Create a secret with the CA certificate
kubectl create secret generic git-ca-cert \
  --from-file=caFile=./ca.crt \
  -n flux-system
```

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://git.internal.example.com/my-org/my-repo.git
  # Reference the CA certificate secret
  certSecretRef:
    name: git-ca-cert
  ref:
    branch: main
```

## Cause 5: Resource Suspension

The GitRepository might be suspended, which prevents reconciliation.

### Diagnosing

```bash
# Check if the resource is suspended
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.suspend}'
```

### Fix

```bash
# Resume the GitRepository reconciliation
flux resume source git <name>

# Or using kubectl
kubectl patch gitrepository <name> -n flux-system \
  --type merge \
  -p '{"spec":{"suspend":false}}'
```

## Forcing Reconciliation

After applying any fix, you can force Flux to immediately reconcile:

```bash
# Force reconciliation using flux CLI
flux reconcile source git <name>

# Or using kubectl annotation
kubectl annotate gitrepository <name> -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite
```

## Monitoring Recovery

After applying your fix, monitor the GitRepository status:

```bash
# Watch the status in real time
kubectl get gitrepository <name> -n flux-system -w

# Check events for the resource
kubectl events -n flux-system --for gitrepository/<name>
```

A healthy GitRepository should show:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: Succeeded
      message: "stored artifact for revision 'main@sha1:abc123...'"
```

## Summary

The "not ready" error in Flux CD GitRepository resources can stem from several causes. Here is a quick reference for diagnosing the issue:

1. Check the repository URL for typos or format issues
2. Verify authentication credentials are correct and the secret exists
3. Confirm the branch, tag, or semver reference exists in the remote repository
4. Investigate network connectivity from the source-controller pod
5. Ensure the GitRepository is not suspended

By methodically working through these checks, you can quickly identify and resolve the root cause of the "not ready" error.
