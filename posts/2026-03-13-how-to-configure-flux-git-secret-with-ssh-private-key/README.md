# How to Configure Flux Git Secret with SSH Private Key

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, SSH, Git

Description: A step-by-step guide to configuring Flux CD Source Controller to authenticate with Git repositories using an SSH private key.

---

## Introduction

Flux CD is a powerful GitOps tool that continuously reconciles the state of your Kubernetes cluster with configuration stored in Git repositories. When your Git repository is private, Flux needs credentials to pull your manifests. One of the most common and secure methods is using an SSH private key.

In this guide, you will learn how to create a Kubernetes Secret containing an SSH private key and configure a Flux `GitRepository` resource to use it for authentication.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- `ssh-keygen` available on your local machine
- Access to add deploy keys to your Git repository

## Step 1: Generate an SSH Key Pair

If you do not already have a dedicated SSH key pair for Flux, generate one. It is best practice to use a dedicated key rather than your personal SSH key.

```bash
ssh-keygen -t ed25519 -C "flux-deploy-key" -f flux-deploy-key -N ""
```

This creates two files:

- `flux-deploy-key` (private key)
- `flux-deploy-key.pub` (public key)

## Step 2: Add the Public Key to Your Git Provider

Copy the contents of the public key:

```bash
cat flux-deploy-key.pub
```

Then add this public key as a deploy key in your Git provider:

- **GitHub**: Go to your repository, navigate to Settings > Deploy keys > Add deploy key.
- **GitLab**: Go to your project, navigate to Settings > Repository > Deploy Keys.
- **Bitbucket**: Go to your repository, navigate to Repository settings > Access keys > Add key.

If Flux needs to push changes (for example, for image automation), make sure to grant write access to the deploy key.

## Step 3: Create the Kubernetes Secret

Create a Kubernetes Secret in the namespace where Flux is running (typically `flux-system`) with the SSH private key:

```bash
kubectl create secret generic git-ssh-credentials \
  --namespace=flux-system \
  --from-file=identity=./flux-deploy-key \
  --from-literal=identity.pub="$(cat flux-deploy-key.pub)"
```

Alternatively, you can define the Secret as a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key-content-here>
    -----END OPENSSH PRIVATE KEY-----
  identity.pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... flux-deploy-key"
```

Apply the manifest:

```bash
kubectl apply -f git-ssh-secret.yaml
```

## Step 4: Configure the GitRepository Resource

Create or update your `GitRepository` resource to reference the Secret:

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
    name: git-ssh-credentials
```

Apply the resource:

```bash
kubectl apply -f gitrepository.yaml
```

Make sure the `url` field uses the SSH protocol format (`ssh://git@...` or `git@...`).

## Verification

Check that the `GitRepository` resource has been reconciled successfully:

```bash
kubectl get gitrepository my-app -n flux-system
```

You should see `True` under the `READY` column. To get more details:

```bash
kubectl describe gitrepository my-app -n flux-system
```

You can also use the Flux CLI:

```bash
flux get sources git my-app
```

## Troubleshooting

### Authentication Failed

If you see an error like `ssh: handshake failed: ssh: unable to authenticate`, verify:

1. The private key in the Secret matches the public key added to your Git provider.
2. The key format is correct (no extra whitespace or missing newlines).

```bash
kubectl get secret git-ssh-credentials -n flux-system -o jsonpath='{.data.identity}' | base64 -d
```

### Repository Not Found

If Flux reports that the repository cannot be found:

1. Confirm the repository URL uses SSH format.
2. Make sure the deploy key has access to the correct repository.
3. Check that the repository exists and the URL is spelled correctly.

### Secret Not Found

If Flux cannot find the Secret:

1. Verify the Secret exists in the same namespace as the `GitRepository` resource.
2. Check the `secretRef.name` matches the Secret name exactly.

```bash
kubectl get secrets -n flux-system | grep git-ssh
```

## Cleaning Up

To remove the SSH credentials from your cluster:

```bash
kubectl delete secret git-ssh-credentials -n flux-system
```

Remember to also remove the deploy key from your Git provider if it is no longer needed.

## Summary

Configuring Flux to authenticate with SSH private keys is straightforward. You generate a key pair, add the public key to your Git provider, create a Kubernetes Secret with the private key, and reference it in your `GitRepository` resource. This approach is widely supported and keeps your credentials secure within Kubernetes Secrets.
