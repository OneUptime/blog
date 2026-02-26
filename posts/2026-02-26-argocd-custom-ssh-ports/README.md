# How to Connect to Git Repos Over Custom SSH Ports in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, SSH, Networking

Description: Learn how to configure ArgoCD to connect to Git repositories over non-standard SSH ports, including Bitbucket Server, Gitea, and custom Git hosting setups.

---

Standard Git SSH connections use port 22, but many self-hosted Git servers run SSH on different ports. Bitbucket Server defaults to port 7999. Gitea and Gogs often use custom ports. Some organizations run Git SSH on non-standard ports for security reasons. Connecting ArgoCD to these servers requires understanding how to specify custom ports in repository URLs and known hosts configurations.

## Understanding SSH URL Formats with Custom Ports

Git supports two SSH URL formats, and the port specification differs between them:

```bash
# Standard SCP-style syntax (port 22 only - CANNOT specify port)
git@github.com:org/repo.git

# SSH URI syntax (can specify any port)
ssh://git@github.com:2222/org/repo.git

# Bitbucket Server default
ssh://git@bitbucket.company.com:7999/PROJECT/repo.git

# Gitea on custom port
ssh://git@gitea.company.com:3022/org/repo.git
```

The key distinction is that the SCP-style format (`git@host:path`) does not support port specification. You must use the `ssh://` URI format when the server runs on a non-standard port.

## Step 1: Add SSH Known Host with Custom Port

ArgoCD verifies SSH host keys before connecting. When using a custom port, the known hosts entry must include the port:

```bash
# Scan the host key on the custom port
ssh-keyscan -p 7999 -t ed25519,rsa bitbucket.company.com

# The output will look like:
# [bitbucket.company.com]:7999 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

Note the bracket notation `[host]:port`. This is essential - without it, ArgoCD will not match the known host entry to the connection.

Update ArgoCD's known hosts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    # Standard GitHub (port 22)
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    # Bitbucket Server on port 7999
    [bitbucket.company.com]:7999 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
    # Gitea on port 3022
    [gitea.company.com]:3022 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

```bash
kubectl apply -f argocd-ssh-known-hosts-cm.yaml
```

You can also add known hosts through the ArgoCD CLI:

```bash
# Add a host key for a custom port
ssh-keyscan -p 7999 bitbucket.company.com | argocd cert add-ssh --batch
```

## Step 2: Configure Repository Credentials

### Single Repository

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-ssh-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: ssh://git@bitbucket.company.com:7999/PROJECT/k8s-manifests.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

### Credential Template for All Repos on Custom Port

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-ssh-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: ssh://git@bitbucket.company.com:7999
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

Apply the credentials:

```bash
kubectl apply -f bitbucket-ssh-cred-template.yaml
```

## Step 3: Create an Application Using Custom SSH Port

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: ssh://git@bitbucket.company.com:7999/PROJECT/k8s-manifests.git
    targetRevision: main
    path: services/my-service
  destination:
    server: https://kubernetes.default.svc
    namespace: my-service
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Using the ArgoCD CLI with Custom Ports

```bash
# Add a repo on a custom SSH port
argocd repo add ssh://git@bitbucket.company.com:7999/PROJECT/k8s-manifests.git \
  --ssh-private-key-path ~/.ssh/argocd-key

# Add a credential template
argocd repocreds add ssh://git@bitbucket.company.com:7999 \
  --ssh-private-key-path ~/.ssh/argocd-key

# List repos to verify
argocd repo list
```

## Common Port Configurations

Here is a quick reference for common Git server default SSH ports:

| Git Server | Default SSH Port | URL Format |
|------------|-----------------|------------|
| GitHub.com | 22 | `git@github.com:org/repo.git` |
| GitLab.com | 22 | `git@gitlab.com:org/repo.git` |
| Bitbucket Cloud | 22 | `git@bitbucket.org:org/repo.git` |
| Bitbucket Server | 7999 | `ssh://git@host:7999/PROJECT/repo.git` |
| Gitea | Configurable (3022 common) | `ssh://git@host:3022/org/repo.git` |
| Gogs | Configurable (2222 common) | `ssh://git@host:2222/org/repo.git` |
| GitHub Enterprise | 22 or custom | `ssh://git@ghe:PORT/org/repo.git` |
| GitLab Self-Hosted | 22 or custom | `ssh://git@gitlab:PORT/org/repo.git` |

## Multiple Servers on Different Ports

If you have multiple Git servers on different ports, create separate credential templates and known host entries for each:

```yaml
# Known hosts for multiple servers
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    [bitbucket.company.com]:7999 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...bitbucket...
    [gitea.company.com]:3022 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...gitea...
    [gitlab.company.com]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...gitlab...
---
# Credential template for Bitbucket Server
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: ssh://git@bitbucket.company.com:7999
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    (bitbucket key)
    -----END OPENSSH PRIVATE KEY-----
---
# Credential template for Gitea
apiVersion: v1
kind: Secret
metadata:
  name: gitea-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: ssh://git@gitea.company.com:3022
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    (gitea key)
    -----END OPENSSH PRIVATE KEY-----
```

## Troubleshooting

### "Host key verification failed"

The most common error when using custom ports. The known hosts entry does not match:

```bash
# Verify the known hosts ConfigMap
kubectl get cm argocd-ssh-known-hosts-cm -n argocd -o yaml | grep -A1 "bitbucket"

# The entry MUST use bracket notation for non-standard ports
# Wrong: bitbucket.company.com ssh-ed25519 AAAA...
# Right: [bitbucket.company.com]:7999 ssh-ed25519 AAAA...

# Refresh the host key
ssh-keyscan -p 7999 -t ed25519 bitbucket.company.com
```

### "Connection refused" or "Connection timed out"

The SSH port is not reachable:

```bash
# Test from the repo-server pod
kubectl exec -n argocd deployment/argocd-repo-server -- \
  timeout 5 bash -c 'echo > /dev/tcp/bitbucket.company.com/7999' \
  && echo "Port open" || echo "Port closed"

# Check if a firewall or NetworkPolicy blocks the port
kubectl get networkpolicies -n argocd
```

Ensure your NetworkPolicy allows egress on the custom port:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-repo-server-ssh-egress
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-repo-server
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: TCP
          port: 22
        - protocol: TCP
          port: 7999
        - protocol: TCP
          port: 3022
```

### "Permission denied (publickey)"

The SSH key is rejected by the server:

```bash
# Test SSH authentication manually
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -p 7999 -i /tmp/test-key -o StrictHostKeyChecking=no git@bitbucket.company.com 2>&1

# Verify the key format
# Some servers require RSA keys, not ED25519
```

### Wrong URL Format

Using SCP-style syntax with a port does not work:

```bash
# Wrong - SCP syntax does not support port
git@bitbucket.company.com:7999/PROJECT/repo.git
# This treats "7999/PROJECT/repo.git" as the path, not the port

# Right - SSH URI syntax
ssh://git@bitbucket.company.com:7999/PROJECT/repo.git
```

Custom SSH ports are a common source of ArgoCD connection issues because three things must align: the URL format, the known hosts entry, and the network access. Get all three right and it works seamlessly. For more on SSH configuration in ArgoCD, see the guide on [ArgoCD SSH Known Hosts](https://oneuptime.com/blog/post/2026-01-25-private-git-repositories-argocd/view).
