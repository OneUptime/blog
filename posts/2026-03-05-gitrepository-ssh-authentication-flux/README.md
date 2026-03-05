# How to Configure GitRepository with SSH Authentication in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Source Controller, GitRepository, SSH, Authentication

Description: Learn how to configure Flux CD GitRepository sources to authenticate with private Git repositories using SSH keys.

---

## Introduction

Most production Git repositories are private and require authentication. SSH key-based authentication is one of the most common and secure methods for granting Flux CD access to your repositories. With SSH authentication, Flux uses a private key stored in a Kubernetes Secret to authenticate against the Git server.

This guide walks you through generating an SSH key pair, creating the Kubernetes Secret, configuring the GitRepository resource, and verifying the setup.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and the `flux` CLI installed locally
- Access to a private Git repository (GitHub, GitLab, Bitbucket, or self-hosted)
- `ssh-keygen` available on your local machine

## Step 1: Generate an SSH Key Pair

First, generate a dedicated SSH key pair for Flux. It is best practice to use a separate key pair rather than reusing your personal SSH key.

```bash
# Generate an Ed25519 SSH key pair for Flux (no passphrase)
ssh-keygen -t ed25519 -C "flux-readonly" -f ./flux-deploy-key -N ""
```

This creates two files:
- `flux-deploy-key` (private key)
- `flux-deploy-key.pub` (public key)

## Step 2: Add the Public Key to Your Git Provider

You need to register the public key with your Git hosting provider. The exact steps depend on the provider.

For GitHub, add it as a deploy key on your repository.

```bash
# Display the public key to copy it
cat flux-deploy-key.pub
```

In GitHub, navigate to your repository, then go to **Settings > Deploy keys > Add deploy key**. Paste the public key content. If Flux only needs to read, leave "Allow write access" unchecked.

For GitLab, navigate to your project, then go to **Settings > Repository > Deploy Keys** and add the key there.

## Step 3: Obtain the Host Key of Your Git Server

Flux needs the known hosts entry for the Git server to verify the server identity and prevent man-in-the-middle attacks.

```bash
# Scan the Git server for its host keys
ssh-keyscan github.com > ./known_hosts 2>/dev/null
```

For other providers, replace `github.com` with the appropriate hostname (e.g., `gitlab.com`, `bitbucket.org`, or your self-hosted Git server hostname).

## Step 4: Create the Kubernetes Secret

Now create a Kubernetes Secret in the `flux-system` namespace containing the private key and the known hosts file. Flux expects specific key names in the Secret data.

```bash
# Create the SSH authentication Secret for Flux
kubectl create secret generic my-app-git-ssh \
  --namespace=flux-system \
  --from-file=identity=./flux-deploy-key \
  --from-file=known_hosts=./known_hosts
```

The Secret must contain:
- `identity`: The SSH private key
- `known_hosts`: The SSH known hosts entries for the Git server

You can also create the Secret declaratively with a YAML manifest. Note that in this case, the values must be base64-encoded.

```yaml
# git-ssh-secret.yaml - Declarative SSH Secret (values must be base64-encoded)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-git-ssh
  namespace: flux-system
type: Opaque
data:
  # Base64-encoded private key
  identity: <BASE64_ENCODED_PRIVATE_KEY>
  # Base64-encoded known_hosts content
  known_hosts: <BASE64_ENCODED_KNOWN_HOSTS>
```

Alternatively, the Flux CLI can create the Secret for you in one step.

```bash
# Use the Flux CLI to create the Secret
flux create secret git my-app-git-ssh \
  --namespace=flux-system \
  --url=ssh://git@github.com/my-org/my-app \
  --private-key-file=./flux-deploy-key
```

## Step 5: Configure the GitRepository Resource

Now create the GitRepository resource that uses the SSH Secret for authentication. Note that the URL must use the SSH protocol format.

```yaml
# gitrepository-ssh.yaml - GitRepository with SSH authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # SSH URL format - must start with ssh://
  url: ssh://git@github.com/my-org/my-app
  ref:
    branch: main
  # Reference the Secret containing SSH credentials
  secretRef:
    name: my-app-git-ssh
```

Apply the resources to your cluster.

```bash
# Apply the GitRepository manifest
kubectl apply -f gitrepository-ssh.yaml
```

## Step 6: Verify the Configuration

Check that the GitRepository source reconciles successfully.

```bash
# Verify the GitRepository is ready
flux get sources git my-app -n flux-system
```

If everything is configured correctly, you should see `READY: True` and a stored artifact revision.

```bash
# Get detailed information about the GitRepository status
kubectl get gitrepository my-app -n flux-system -o yaml | grep -A 10 "status:"
```

## Using Alternative SSH URL Formats

Different Git providers may use slightly different URL formats. Here are common variations.

```yaml
# GitHub SSH URL
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: github-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: github-ssh-secret
```

```yaml
# GitLab SSH URL (with custom port)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitlab-repo
  namespace: flux-system
spec:
  interval: 5m
  # Custom SSH port specified in the URL
  url: ssh://git@gitlab.example.com:2222/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: gitlab-ssh-secret
```

## Security Best Practices

When working with SSH authentication in Flux, follow these best practices:

1. **Use read-only deploy keys**: Grant the minimum permissions necessary. If Flux only needs to pull manifests, do not enable write access on the deploy key.
2. **Use Ed25519 keys**: Ed25519 keys are shorter and more secure than RSA keys. Flux supports Ed25519 natively.
3. **Rotate keys periodically**: Establish a key rotation schedule. When rotating, update the Kubernetes Secret and the deploy key on your Git provider.
4. **Seal or encrypt Secrets**: In a GitOps workflow, use tools like Sealed Secrets or SOPS to encrypt the Secret before storing it in Git.
5. **Always specify known_hosts**: Without known hosts verification, the connection is vulnerable to man-in-the-middle attacks.

## Troubleshooting

If the GitRepository fails to reconcile, check the following.

```bash
# Check the Source Controller logs for SSH errors
kubectl logs -n flux-system deployment/source-controller | grep -i "ssh\|auth\|key"
```

Common issues include:

- **Host key verification failed**: Ensure the `known_hosts` entry in the Secret matches the Git server. Re-run `ssh-keyscan` to get updated host keys.
- **Permission denied (publickey)**: Verify that the public key is added to the correct repository as a deploy key and that the private key in the Secret matches.
- **Incorrect URL format**: The URL must use the `ssh://` prefix. URLs in the format `git@github.com:org/repo.git` are not supported; use `ssh://git@github.com/org/repo` instead.

## Cleaning Up Local Key Files

After creating the Secret, remove the local key files for security.

```bash
# Remove local copies of the SSH keys
rm -f ./flux-deploy-key ./flux-deploy-key.pub ./known_hosts
```

## Conclusion

SSH authentication is a reliable and secure way to grant Flux CD access to private Git repositories. By generating a dedicated key pair, registering the public key with your Git provider, and storing the private key in a Kubernetes Secret, you establish a secure connection between Flux and your repository. Combined with known hosts verification, this approach provides strong protection against unauthorized access and man-in-the-middle attacks.
