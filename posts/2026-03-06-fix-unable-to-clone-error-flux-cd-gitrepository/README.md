# How to Fix "unable to clone" Error in Flux CD GitRepository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Troubleshooting, Git, SSH, Kubernetes

Description: A practical guide to diagnosing and fixing the "unable to clone" error in Flux CD GitRepository resources, covering SSH host keys, firewalls, and proxy configuration.

---

## Introduction

One of the most common errors Flux CD users encounter is the dreaded "unable to clone" error on their GitRepository resources. This error prevents Flux from pulling your manifests and applying changes to your cluster, effectively breaking your entire GitOps pipeline.

In this guide, we will walk through the most common causes of this error and provide step-by-step fixes for each scenario.

## Identifying the Error

First, check your GitRepository status to confirm the error:

```bash
# Check the status of all GitRepository resources
kubectl get gitrepositories -A

# Get detailed status for a specific GitRepository
kubectl describe gitrepository <name> -n flux-system
```

You will typically see a message like:

```
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: GitOperationFailed
      Message: "unable to clone 'ssh://git@github.com/myorg/myrepo.git': ssh: handshake failed"
```

You can also check the source-controller logs for more detail:

```bash
# View source-controller logs for clone errors
kubectl logs -n flux-system deployment/source-controller | grep "unable to clone"
```

## Cause 1: Missing or Incorrect SSH Host Keys

The most frequent cause of clone failures is missing SSH known_hosts configuration. Flux needs to verify the identity of the Git server before connecting.

### Step 1: Retrieve the SSH Host Key

```bash
# For GitHub
ssh-keyscan github.com > /tmp/known_hosts

# For GitLab
ssh-keyscan gitlab.com > /tmp/known_hosts

# For a self-hosted Git server
ssh-keyscan your-git-server.example.com > /tmp/known_hosts
```

### Step 2: Create or Update the Known Hosts Secret

```bash
# Create the known_hosts secret used by Flux
kubectl create secret generic ssh-known-hosts \
  --from-file=known_hosts=/tmp/known_hosts \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Update Your GitRepository to Reference Known Hosts

```yaml
# gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/myorg/myrepo.git
  ref:
    branch: main
  secretRef:
    # This secret must contain the SSH private key
    name: my-app-ssh-key
  verify:
    mode: HEAD
```

### Step 4: Create the SSH Key Secret

```bash
# Generate a new SSH key pair (if you do not already have one)
ssh-keygen -t ed25519 -C "flux-cd" -f /tmp/flux-key -N ""

# Create the Kubernetes secret with both the private key and known_hosts
kubectl create secret generic my-app-ssh-key \
  --from-file=identity=/tmp/flux-key \
  --from-file=identity.pub=/tmp/flux-key.pub \
  --from-file=known_hosts=/tmp/known_hosts \
  -n flux-system
```

## Cause 2: Firewall Blocking Git Traffic

If your cluster is behind a firewall or in a private network, outbound SSH (port 22) or HTTPS (port 443) traffic to your Git provider may be blocked.

### Diagnosing Firewall Issues

```bash
# Test connectivity from inside the cluster
kubectl run -it --rm debug-net \
  --image=busybox \
  --namespace=flux-system \
  --restart=Never \
  -- sh -c "nc -zv github.com 22 && echo 'SSH OK' || echo 'SSH BLOCKED'"
```

### Fix: Use HTTPS Instead of SSH

If SSH is blocked, switch to HTTPS:

```yaml
# gitrepository-https.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use HTTPS URL instead of SSH
  url: https://github.com/myorg/myrepo.git
  ref:
    branch: main
  secretRef:
    # This secret contains HTTPS credentials
    name: my-app-https-creds
```

Create the HTTPS credentials secret:

```bash
# Create secret with username and personal access token
kubectl create secret generic my-app-https-creds \
  --from-literal=username=git \
  --from-literal=password=ghp_your_personal_access_token \
  -n flux-system
```

### Fix: Use GitHub SSH on Port 443

GitHub supports SSH over port 443, which can bypass firewall restrictions:

```yaml
# gitrepository-ssh-443.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use the alternative SSH endpoint on port 443
  url: ssh://git@ssh.github.com:443/myorg/myrepo.git
  ref:
    branch: main
  secretRef:
    name: my-app-ssh-key
```

Remember to update your known_hosts for the alternative host:

```bash
# Scan the alternative SSH endpoint
ssh-keyscan -p 443 ssh.github.com > /tmp/known_hosts
```

## Cause 3: Proxy Configuration Required

If your cluster uses an HTTP/HTTPS proxy for outbound traffic, you need to configure the source-controller to use it.

### Step 1: Patch the Source Controller Deployment

```yaml
# proxy-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            # Configure HTTP proxy
            - name: HTTP_PROXY
              value: "http://proxy.example.com:3128"
            # Configure HTTPS proxy
            - name: HTTPS_PROXY
              value: "http://proxy.example.com:3128"
            # Exclude internal cluster traffic from proxy
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Apply the patch:

```bash
# Apply the proxy configuration to source-controller
kubectl patch deployment source-controller \
  -n flux-system \
  --patch-file proxy-patch.yaml
```

### Step 2: For Kustomize-Based Flux Setup

If you bootstrap Flux with Kustomize, add the proxy patch to your flux-system kustomization:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: "(source-controller|notification-controller)"
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: not-used
      spec:
        template:
          spec:
            containers:
              - name: manager
                env:
                  - name: HTTPS_PROXY
                    value: "http://proxy.example.com:3128"
                  - name: NO_PROXY
                    value: ".cluster.local,.svc,10.0.0.0/8"
```

## Cause 4: Incorrect Deploy Key or Token Permissions

Sometimes the clone fails because the SSH key or token lacks the necessary permissions.

### Verifying Deploy Key Access

```bash
# Test SSH access to the repository
ssh -T -i /path/to/deploy-key git@github.com

# For GitHub, verify the deploy key is listed on the repo
gh repo deploy-key list --repo myorg/myrepo
```

### Verifying Token Scopes

For HTTPS access, ensure your personal access token has the correct scopes:

- GitHub: `repo` scope (or `contents:read` for fine-grained tokens)
- GitLab: `read_repository` scope
- Bitbucket: `repository:read` permission

## Cause 5: Self-Signed TLS Certificates

If your Git server uses self-signed certificates, HTTPS clones will fail with certificate errors.

```yaml
# gitrepository-custom-ca.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/myorg/myrepo.git
  ref:
    branch: main
  secretRef:
    name: my-app-https-creds
  # Reference a secret containing your custom CA certificate
  certSecretRef:
    name: git-ca-cert
```

Create the CA certificate secret:

```bash
# Create secret with your custom CA certificate
kubectl create secret generic git-ca-cert \
  --from-file=ca.crt=/path/to/custom-ca.crt \
  -n flux-system
```

## Quick Troubleshooting Checklist

Use this checklist to systematically diagnose clone failures:

```bash
# 1. Check GitRepository status
kubectl get gitrepository -A -o wide

# 2. View detailed error message
kubectl describe gitrepository <name> -n flux-system

# 3. Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50

# 4. Verify the secret exists and has correct keys
kubectl get secret <secret-name> -n flux-system -o jsonpath='{.data}' | jq 'keys'

# 5. Test network connectivity from the cluster
kubectl run -it --rm debug \
  --image=alpine/git \
  --namespace=flux-system \
  --restart=Never \
  -- git ls-remote https://github.com/myorg/myrepo.git

# 6. Force reconciliation after applying fixes
flux reconcile source git <name>
```

## Summary

The "unable to clone" error in Flux CD usually comes down to one of five issues: missing SSH known_hosts, firewall restrictions, proxy configuration, incorrect credentials, or TLS certificate problems. By systematically checking each of these areas using the steps above, you can quickly identify and resolve the root cause. Always check the source-controller logs for the most detailed error information, and use `flux reconcile` to test your fixes immediately after applying them.
