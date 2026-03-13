# How to Configure Flux Git Secret with SSH Private Key and Known Hosts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, SSH, Known Hosts, Git, Security

Description: Learn how to configure Flux CD with SSH authentication including known_hosts verification for secure Git repository access.

---

## Introduction

When Flux CD connects to a Git repository over SSH, it performs a host key verification step to ensure it is communicating with the legitimate server. By default, Flux may not have the host keys for your Git provider, which can lead to connection failures or security warnings.

By including a `known_hosts` entry in your authentication Secret, you enable strict host key checking. This prevents man-in-the-middle attacks and ensures Flux only connects to verified Git servers.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- `ssh-keygen` and `ssh-keyscan` available on your local machine
- Access to add deploy keys to your Git repository

## Step 1: Generate an SSH Key Pair

Generate a dedicated SSH key pair for Flux:

```bash
ssh-keygen -t ed25519 -C "flux-deploy-key" -f flux-deploy-key -N ""
```

## Step 2: Retrieve the Known Hosts Entry

Use `ssh-keyscan` to retrieve the host key for your Git provider:

For **GitHub**:

```bash
ssh-keyscan github.com > known_hosts
```

For **GitLab**:

```bash
ssh-keyscan gitlab.com > known_hosts
```

For **Bitbucket**:

```bash
ssh-keyscan bitbucket.org > known_hosts
```

For a **self-hosted** Git server:

```bash
ssh-keyscan -p 22 git.example.com > known_hosts
```

You can verify the scanned keys against the officially published fingerprints from your Git provider for added security.

## Step 3: Add the Public Key to Your Git Provider

Copy the contents of the public key and add it as a deploy key:

```bash
cat flux-deploy-key.pub
```

Add the key to your Git provider as described in their documentation.

## Step 4: Create the Kubernetes Secret

Create a Secret that includes the private key, public key, and known_hosts file:

```bash
kubectl create secret generic git-ssh-known-hosts \
  --namespace=flux-system \
  --from-file=identity=./flux-deploy-key \
  --from-file=identity.pub=./flux-deploy-key.pub \
  --from-file=known_hosts=./known_hosts
```

You can also define this as a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-known-hosts
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key-content-here>
    -----END OPENSSH PRIVATE KEY-----
  identity.pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... flux-deploy-key"
  known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
```

Apply the manifest:

```bash
kubectl apply -f git-ssh-known-hosts-secret.yaml
```

## Step 5: Configure the GitRepository Resource

Reference the Secret in your `GitRepository` resource:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/your-org/your-repo.git
  ref:
    branch: main
  secretRef:
    name: git-ssh-known-hosts
```

Apply the resource:

```bash
kubectl apply -f gitrepository.yaml
```

## Verification

Check that the `GitRepository` resource reconciles successfully:

```bash
flux get sources git my-app
```

Expected output should show `True` in the READY column and display the latest revision:

```bash
kubectl get gitrepository my-app -n flux-system -o wide
```

To inspect events:

```bash
kubectl describe gitrepository my-app -n flux-system
```

## Troubleshooting

### Host Key Verification Failed

If you see `ssh: handshake failed: knownhosts: key is unknown`:

1. Regenerate the known_hosts file using `ssh-keyscan`.
2. Verify the host key matches your Git provider's published fingerprints.
3. Update the Secret with the new known_hosts data.

```bash
ssh-keyscan github.com 2>/dev/null | ssh-keygen -lf -
```

Compare the output against your Git provider's documented fingerprints.

### Host Key Changed

If your Git provider rotated their host keys:

1. Fetch the new host keys:

```bash
ssh-keyscan github.com > known_hosts_new
```

2. Update the Secret:

```bash
kubectl create secret generic git-ssh-known-hosts \
  --namespace=flux-system \
  --from-file=identity=./flux-deploy-key \
  --from-file=identity.pub=./flux-deploy-key.pub \
  --from-file=known_hosts=./known_hosts_new \
  --dry-run=client -o yaml | kubectl apply -f -
```

3. Trigger a reconciliation:

```bash
flux reconcile source git my-app
```

### Self-Hosted Git Server with Custom Port

If your Git server runs on a non-standard port, adjust the `ssh-keyscan` command and the repository URL:

```bash
ssh-keyscan -p 2222 git.example.com > known_hosts
```

```yaml
spec:
  url: ssh://git@git.example.com:2222/your-org/your-repo.git
```

## Summary

Adding known_hosts to your Flux SSH Secret provides an extra layer of security by ensuring Flux only connects to verified Git servers. This is a recommended best practice especially in production environments where man-in-the-middle protection is critical.
