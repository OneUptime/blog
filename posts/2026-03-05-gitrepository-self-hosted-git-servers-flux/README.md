# How to Set Up GitRepository with Self-Hosted Git Servers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Self-Hosted Git, Gitea, GitLab

Description: Learn how to configure Flux CD GitRepository resources to connect with self-hosted Git servers like Gitea, GitLab, and plain Git over SSH or HTTPS.

---

Many organizations run self-hosted Git servers for security, compliance, or cost reasons. Whether you use Gitea, self-hosted GitLab, or a bare Git server, Flux CD supports connecting to all of them through the GitRepository custom resource. This guide walks you through configuring Flux to pull manifests from your self-hosted Git infrastructure.

## Prerequisites

Before starting, ensure the following are in place:

- A running Kubernetes cluster with Flux CD installed
- A self-hosted Git server accessible from the cluster (Gitea, GitLab CE/EE, Gogs, or bare Git over SSH)
- `kubectl` and `flux` CLI tools installed locally

## Understanding the GitRepository CRD

The GitRepository resource tells Flux where to find your Git repository, how to authenticate, and how often to poll for changes. For self-hosted servers, the key differences from public GitHub/GitLab are:

- Custom URLs (not github.com or gitlab.com)
- Potentially self-signed TLS certificates
- Non-standard SSH host keys

## Step 1: Configure SSH Authentication

Most self-hosted setups use SSH for Git access. First, generate an SSH key pair or use an existing one.

Generate a new SSH key pair for Flux:

```bash
# Generate an ED25519 key pair without a passphrase
ssh-keygen -t ed25519 -f flux-git-key -N "" -C "flux@cluster"
```

Create a Kubernetes secret with the SSH private key and known hosts:

```bash
# Scan the SSH host key from your self-hosted Git server
ssh-keyscan your-git-server.example.com > known_hosts

# Create the secret in the flux-system namespace
kubectl create secret generic self-hosted-git-ssh \
  --from-file=identity=./flux-git-key \
  --from-file=known_hosts=./known_hosts \
  --namespace=flux-system
```

Add the public key (`flux-git-key.pub`) to your Git server as a deploy key with read access.

## Step 2: Create the GitRepository Resource (SSH)

Define the GitRepository resource pointing to your self-hosted server over SSH.

This manifest configures Flux to clone from a self-hosted Gitea instance using SSH:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: self-hosted-app
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@your-git-server.example.com:22/org/my-app.git
  ref:
    branch: main
  secretRef:
    # References the SSH secret created in Step 1
    name: self-hosted-git-ssh
```

Apply it to your cluster:

```bash
kubectl apply -f gitrepository.yaml
```

## Step 3: Configure HTTPS Authentication (Alternative)

If your self-hosted server uses HTTPS, create a secret with username and password or a personal access token.

Create a secret for HTTPS basic auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: self-hosted-git-https
  namespace: flux-system
type: Opaque
stringData:
  # Use a personal access token as the password for token-based auth
  username: flux-bot
  password: your-personal-access-token
```

Then reference it in the GitRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: self-hosted-app-https
  namespace: flux-system
spec:
  interval: 5m
  url: https://your-git-server.example.com/org/my-app.git
  ref:
    branch: main
  secretRef:
    # References the HTTPS credentials secret
    name: self-hosted-git-https
```

## Step 4: Handle Self-Signed Certificates

Self-hosted servers often use self-signed or internal CA certificates. You can embed the CA certificate in the HTTPS secret.

Add a CA certificate to the HTTPS auth secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: self-hosted-git-https-ca
  namespace: flux-system
type: Opaque
stringData:
  username: flux-bot
  password: your-personal-access-token
  # Include your internal CA certificate bundle
  caFile: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJALa...
    (your CA certificate content here)
    -----END CERTIFICATE-----
```

Reference this secret in the GitRepository resource just like the standard HTTPS secret using `secretRef`.

## Step 5: Configure for Gitea

Gitea is a popular lightweight self-hosted Git server. Here is a complete example for Gitea with SSH.

Full Gitea GitRepository configuration:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitea-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@gitea.internal.company.com:3022/devops/k8s-manifests.git
  ref:
    branch: main
  secretRef:
    name: gitea-ssh-credentials
  # Timeout for Git operations (clone, fetch)
  timeout: 60s
```

Note the non-standard port (3022) in the URL -- Gitea often runs SSH on a custom port.

## Step 6: Configure for Self-Hosted GitLab

Self-hosted GitLab instances work similarly but may use subgroups in their paths.

GitRepository for a self-hosted GitLab with nested subgroups:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitlab-self-hosted
  namespace: flux-system
spec:
  interval: 10m
  url: ssh://git@gitlab.internal.company.com/platform/team-a/kubernetes/manifests.git
  ref:
    branch: main
  secretRef:
    name: gitlab-ssh-credentials
```

## Step 7: Verify the GitRepository Status

After applying, check that Flux can successfully connect to your self-hosted server.

Verify the GitRepository resource is syncing:

```bash
# Check the status of the GitRepository
flux get sources git

# For more detail, inspect the Kubernetes resource directly
kubectl describe gitrepository self-hosted-app -n flux-system
```

A healthy GitRepository will show `Ready: True` and display the latest fetched revision.

## Troubleshooting Common Issues

**SSH host key verification failure:** Ensure the `known_hosts` file in your secret contains the correct host key. Re-scan it with `ssh-keyscan` if the server was recently reinstalled.

**Connection refused or timeout:** Verify network connectivity from inside the cluster. Create a debug pod and attempt to reach the Git server:

```bash
# Test connectivity from within the cluster
kubectl run -it --rm debug --image=alpine/git -n flux-system -- \
  git ls-remote ssh://git@your-git-server.example.com:22/org/my-app.git
```

**TLS certificate errors over HTTPS:** Make sure the `caFile` field in your secret contains the full certificate chain, including any intermediate certificates.

**Authentication failures:** Double-check that the deploy key has been added to the correct repository or organization on your Git server, and that it has at least read permissions.

## Summary

Setting up Flux CD with self-hosted Git servers requires attention to authentication secrets and network configuration, but the process is straightforward. The GitRepository CRD supports SSH and HTTPS with custom CAs, making it compatible with virtually any Git server. The key steps are creating proper authentication secrets, referencing them in the GitRepository resource, and verifying connectivity from within the cluster.
