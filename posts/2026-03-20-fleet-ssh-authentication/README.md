# How to Configure Fleet SSH Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, SSH

Description: A detailed guide to configuring SSH key authentication for Fleet to securely access private Git repositories using deploy keys and SSH key pairs.

## Introduction

SSH key authentication is the most secure and commonly used method for Fleet to access private Git repositories. Unlike HTTP credentials that could be exposed through proxy logs or network captures, SSH keys use asymmetric cryptography - the private key never leaves your Kubernetes cluster, and only the public key is registered with your Git provider.

This guide provides a comprehensive walkthrough of SSH authentication setup for Fleet, including key generation, secret management, known hosts configuration, and troubleshooting.

## Prerequisites

- Fleet installed in Rancher
- `kubectl` access to the Fleet workspace namespace where the `GitRepo` and secret will live (for example `fleet-default` or `fleet-local`)
- OpenSSH tools (`ssh-keygen`, `ssh-keyscan`)
- A private Git repository

## Understanding SSH Authentication in Fleet

Fleet's SSH authentication works as follows:

1. You generate an SSH key pair
2. The **public key** is registered as a deploy key on your Git repository
3. The **private key** is stored as a Kubernetes secret
4. Fleet uses the private key when cloning/pulling the repository
5. Git provider verifies the connection using the public key

## Step 1: Generate a Dedicated SSH Key Pair

Generate a separate PEM-formatted key specifically for this Fleet GitRepo (do not reuse personal keys):

```bash
# Fleet expects an unencrypted PEM-formatted private key
ssh-keygen \
  -t rsa \
  -b 4096 \
  -m PEM \
  -C "fleet-gitops@$(date +%Y-%m-%d)" \
  -f /tmp/fleet_rsa4096 \
  -N ""

# View the generated public key
cat /tmp/fleet_rsa4096.pub
```

## Step 2: Register the Public Key with Your Git Provider

### GitHub Deploy Key

```bash
# Display the public key for copying
echo "=== Add this public key to GitHub Deploy Keys ==="
cat /tmp/fleet_rsa4096.pub
```

GitHub registration steps:
1. Go to your repository on GitHub
2. Navigate to **Settings > Security > Deploy keys**
3. Click **Add deploy key**
4. Title: `fleet-gitops-production`
5. Paste the contents of `fleet_rsa4096.pub`
6. Check **Allow write access** only if Fleet needs to write back
7. Click **Add key**

### GitLab Deploy Key

1. Go to **Settings > Repository > Deploy keys**
2. Enter a title: `fleet-gitops`
3. Paste the public key content
4. Click **Add key**

### Bitbucket Access Key

1. Go to **Repository settings > Access keys**
2. Click **Add key**
3. Enter the label and public key
4. Repository access keys are read-only, which is sufficient for Fleet

## Step 3: Collect the SSH Known Hosts

To prevent man-in-the-middle attacks, include known host keys:

```bash
# Collect GitHub's host key
ssh-keyscan -H github.com 2>/dev/null

# Collect GitLab's host key
ssh-keyscan -H gitlab.com 2>/dev/null

# Collect Bitbucket's host key
ssh-keyscan -H bitbucket.org 2>/dev/null

# For a self-hosted Git server
ssh-keyscan -H git.internal.example.com 2>/dev/null
```

## Step 4: Create the Kubernetes Secret

Fleet expects the SSH secret to be in the same namespace as the `GitRepo` and to use the `kubernetes.io/ssh-auth` type:

```bash
# Method 1: Create secret from files
kubectl create secret generic fleet-ssh-github \
  --type=kubernetes.io/ssh-auth \
  --from-file=ssh-privatekey=/tmp/fleet_rsa4096 \
  -n fleet-default

# Method 2: Create a complete secret with known hosts
kubectl create secret generic fleet-ssh-github-complete \
  --type=kubernetes.io/ssh-auth \
  --from-file=ssh-privatekey=/tmp/fleet_rsa4096 \
  --from-literal=known_hosts="$(ssh-keyscan -H github.com 2>/dev/null)" \
  -n fleet-default
```

### Using a YAML Manifest for the Secret

```yaml
# fleet-ssh-secret.yaml (DO NOT commit to Git with real keys)
apiVersion: v1
kind: Secret
metadata:
  name: fleet-ssh-github
  namespace: fleet-default
type: kubernetes.io/ssh-auth
stringData:
  # The private SSH key (keep this confidential!)
  ssh-privatekey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
  # Known hosts to prevent MITM attacks
  known_hosts: |
    |1|YJr1VZoi6dM0oE+zkM0do3Z04TQ=|7MclCn1fLROZG+BgR4m1r8TLwWc= ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM4GC7uEnztnZyaVWQ7B381AK4Qdrwt51ZqExKbQpTUNn+EjqoTwvqNj4kqx5QUCI0ThS/YkOxJCXmPUWZbhjpCg56i+2aB6CmK2JGhn57K5mj0MNdBXA4/WnwH6XoPWJzK5Nyu2zB3nAZp+S5hpQs+p1vN1/wsjk=
```

## Step 5: Configure Fleet GitRepo with SSH

```yaml
# gitrepo-ssh.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: private-repo-ssh
  namespace: fleet-default
spec:
  # IMPORTANT: Use SSH URL format, not HTTPS
  # GitHub:    git@github.com:org/repo.git
  # GitLab:    git@gitlab.com:org/repo.git
  # Bitbucket: git@bitbucket.org:org/repo.git
  repo: git@github.com:my-org/my-private-app.git

  branch: main

  # Reference the SSH key secret
  clientSecretName: fleet-ssh-github

  paths:
    - /

  targets:
    - clusterSelector: {}
```

```bash
# Apply the GitRepo
kubectl apply -f gitrepo-ssh.yaml

# Verify the connection
kubectl describe gitrepo private-repo-ssh -n fleet-default
```

## Testing SSH Connectivity

Before creating the GitRepo, test that the key works:

```bash
# Test SSH connection to GitHub with the Fleet key
ssh -i /tmp/fleet_rsa4096 \
  -o IdentitiesOnly=yes \
  -T git@github.com

# Expected output:
# Hi my-org/my-private-app! You've successfully authenticated, but GitHub does not provide shell access.
```

## Rotating SSH Keys

When rotating SSH keys, update the secret without downtime:

```bash
# Generate a new SSH key pair
ssh-keygen -t rsa -b 4096 -m PEM -C "fleet-gitops-new" -f /tmp/fleet_new_key -N ""

# Step 1: Add new public key to Git provider (keep old one too)
cat /tmp/fleet_new_key.pub

# Step 2: Update the Kubernetes secret
kubectl create secret generic fleet-ssh-github \
  --type=kubernetes.io/ssh-auth \
  --from-file=ssh-privatekey=/tmp/fleet_new_key \
  --from-literal=known_hosts="$(ssh-keyscan -H github.com 2>/dev/null)" \
  -n fleet-default \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Verify Fleet reconnects successfully
kubectl get gitrepo private-repo-ssh -n fleet-default -w

# Step 4: Remove the old public key from Git provider
```

## Troubleshooting SSH Authentication

```bash
# Check for SSH authentication errors in Fleet logs
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  --tail=100 \
  | grep -i "ssh\|auth\|key\|permission"

# If the checkout fails inside a GitJob pod, inspect that pod directly
kubectl logs -f <gitjob-pod-name> -n cattle-fleet-system

# Check the GitRepo status for error conditions
kubectl describe gitrepo private-repo-ssh -n fleet-default \
  | grep -A 20 "Conditions:"

# Verify the secret has the correct key
kubectl get secret fleet-ssh-github -n fleet-default \
  -o jsonpath='{.data.ssh-privatekey}' | base64 -d | head -3
```

## Conclusion

SSH key authentication for Fleet provides a secure, token-free way to access private Git repositories. By using dedicated deploy keys with read-only access, you follow the principle of least privilege and limit the blast radius if credentials are ever compromised. Regular key rotation and proper known hosts configuration ensure your Fleet deployment remains secure over time.
