# How to Configure Git SSH over IPv6 for GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Git, SSH, GitOps, Authentication, OpenSSH

Description: Configure Git SSH connections over IPv6 for GitOps workflows, including SSH config for IPv6 hosts, host key verification, known_hosts formatting, and ArgoCD/Flux SSH key configuration.

## Introduction

SSH is the most common protocol for Git authentication in GitOps pipelines. Connecting to Git servers over IPv6 via SSH requires proper URL formatting, SSH config adjustments for IPv6 hosts, and correctly formatted `known_hosts` entries. ArgoCD stores repository SSH private keys in repository secrets and SSH host keys in `argocd-ssh-known-hosts-cm`; Flux CD stores SSH private keys and `known_hosts` data in Kubernetes secrets.

## SSH URL Format for IPv6 Git Servers

```bash
# Standard SSH Git URL formats for IPv6:

# Format 1: SCP-like (works with current Git/OpenSSH clients on port 22)
git clone "git@[2001:db8::10]:org/repo.git"

# A hostname with an AAAA record also works:
git clone git@gitserver.example.com:org/repo.git

# Format 2: Full SSH URL (supports IPv6 literal and explicit ports)
git clone "ssh://git@[2001:db8::10]:22/org/repo.git"

# Format 3: SSH URL without port (port 22)
git clone "ssh://git@[2001:db8::10]/org/repo.git"

# Flux GitRepository URLs must use the ssh:// form

# Test SSH connection to IPv6 Git server
ssh -6 -T git@[2001:db8::10]
# Expected: authentication succeeds or the Git server returns its Git-shell banner

# Test with explicit port
ssh -6 -v -p 22 git@[2001:db8::10]
```

## SSH Config for IPv6 Git Server

```bash
# ~/.ssh/config

# Git server on IPv6
Host gitserver-ipv6
    HostName 2001:db8::10
    User git
    Port 22
    IdentityFile ~/.ssh/id_ed25519_gitops
    # Force IPv6
    AddressFamily inet6

# Gitea on IPv6
Host gitea.example.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    # Hostname resolves to AAAA record - no AddressFamily needed
    # but forces IPv6:
    AddressFamily inet6

# Use the alias in Git commands
git clone "git@gitserver-ipv6:org/repo.git"
```

## known_hosts Format for IPv6

```bash
# Add IPv6 host key to known_hosts

# Standard known_hosts format:
# hostnames key-type key-data
# If you need to encode a port, use [host]:port key-type key-data

# Scan host keys from IPv6 Git server
ssh-keyscan -6 -H 2001:db8::10 >> ~/.ssh/known_hosts
# Adds: |1|hash|... ssh-ed25519 AAAAC3...

# Non-hashed format (easier to read/manage)
ssh-keyscan -6 2001:db8::10 >> ~/.ssh/known_hosts
# Adds: 2001:db8::10 ssh-ed25519 AAAAC3...

# With an explicit non-default port, output uses [host]:port
ssh-keyscan -6 -p 2222 2001:db8::10 >> ~/.ssh/known_hosts
# Adds: [2001:db8::10]:2222 ssh-ed25519 AAAAC3...

# Verify the known_hosts entry works
ssh -6 -o "StrictHostKeyChecking=yes" git@[2001:db8::10]
```

## ArgoCD: SSH Repository with IPv6

```yaml
# argocd-ssh-ipv6-repo.yaml

apiVersion: v1
kind: Secret
metadata:
  name: gitserver-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  # SSH URL with IPv6 literal
  url: "ssh://git@[2001:db8::10]/org/myrepo.git"

  # SSH private key
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQ...
    -----END OPENSSH PRIVATE KEY-----
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
  labels:
    app.kubernetes.io/name: argocd-ssh-known-hosts-cm
    app.kubernetes.io/part-of: argocd
data:
  # known_hosts for the IPv6 Git server
  # Get with: ssh-keyscan -6 2001:db8::10
  ssh_known_hosts: |
    2001:db8::10 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNo...
    2001:db8::10 ssh-rsa AAAAB3NzaC1yc2EAAAA...
    2001:db8::10 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...
```

## Flux CD: SSH Repository with IPv6

```yaml
# flux-ssh-ipv6.yaml

apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-key
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA...
    -----END OPENSSH PRIVATE KEY-----
  identity.pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... gitops-key"
  # known_hosts with IPv6 server entry
  known_hosts: |
    2001:db8::10 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...

---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  url: "ssh://git@[2001:db8::10]/org/myapp.git"
  ref:
    branch: main
  secretRef:
    name: git-ssh-key
```

## Get Host Keys for IPv6 Git Servers

```bash
#!/bin/bash
# get-ipv6-hostkeys.sh - Collect SSH host keys from IPv6 Git server

GIT_SERVER_IPV6="2001:db8::10"
OUTPUT="known_hosts_ipv6"

echo "Scanning SSH host keys from [$GIT_SERVER_IPV6]..."

# Get all key types
ssh-keyscan -6 -t rsa,ecdsa,ed25519 "$GIT_SERVER_IPV6" 2>/dev/null \
    > "$OUTPUT"

echo "Host keys written to $OUTPUT:"
cat "$OUTPUT"
echo ""
echo "Add to argocd-ssh-known-hosts-cm or the Flux known_hosts secret field."
```

## Test SSH over IPv6 from GitOps Pod

```bash
# Example: if the controller image includes OpenSSH, verify the Git server is reachable over IPv6
kubectl exec -n argocd deployment/argocd-repo-server -- \
    ssh-keyscan -6 2001:db8::10 2>&1

# Example: if the controller image includes OpenSSH, verify the Git server is reachable over IPv6
kubectl exec -n flux-system deployment/source-controller -- \
    ssh-keyscan -6 2001:db8::10 2>&1

# If SSH fails and the image includes iproute2: check if IPv6 is available in the pod
kubectl exec -n flux-system deployment/source-controller -- \
    ip -6 addr show
```

## Conclusion

Git SSH over IPv6 supports literal IPv6 addresses in both scp-like and `ssh://` forms on current Git/OpenSSH clients. Use the `ssh://` form when you need to encode a port (e.g., `ssh://git@[2001:db8::10]:22/repo.git`) and for Flux `GitRepository` URLs, which do not accept scp-like syntax. The `known_hosts` file must contain the IPv6 server's host keys in `host key-type data` format, or `[host]:port key-type data` when a port must be encoded, collected with `ssh-keyscan -6`. ArgoCD stores SSH host keys in `argocd-ssh-known-hosts-cm`; Flux stores them in the SSH secret's `known_hosts` field. Use `ssh-keyscan -6 -t rsa,ecdsa,ed25519` to collect all key types. Verify IPv6 reachability from inside the GitOps controller pod with `kubectl exec` before configuring the repository connection.
