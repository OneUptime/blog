# Understanding ArgoCD argocd-ssh-known-hosts-cm Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, SSH, Security

Description: A detailed guide to the ArgoCD argocd-ssh-known-hosts-cm ConfigMap, covering SSH host key verification, adding custom Git server keys, and troubleshooting SSH connectivity issues.

---

The `argocd-ssh-known-hosts-cm` ConfigMap stores SSH host keys that ArgoCD trusts when connecting to Git repositories over SSH. Without proper SSH known hosts configuration, ArgoCD cannot securely verify the identity of your Git servers, leaving you vulnerable to man-in-the-middle attacks. This guide explains every aspect of this ConfigMap.

## Why SSH Known Hosts Matter

When ArgoCD connects to a Git repository via SSH (e.g., `git@github.com:org/repo.git`), it performs a host key verification step - just like when you SSH into a server for the first time and see the "Are you sure you want to continue connecting?" prompt. The known hosts file tells ArgoCD which host keys to trust.

If the host key does not match any entry in the known hosts, ArgoCD refuses the connection. This is a security feature, not a bug.

## Default Contents

ArgoCD ships with pre-configured host keys for popular Git hosting services. Here is the default ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
  labels:
    app.kubernetes.io/name: argocd-ssh-known-hosts-cm
    app.kubernetes.io/part-of: argocd
data:
  ssh_known_hosts: |
    # GitHub
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
    github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM4GC7uEnztnZyaVWQ7B381AK4Qdrwt51ZqExKbQpTUNn+EjqoTwvqNj4kqx5QUCI0ThS/YkOxJCXmPUWZbhjpCg56i+2aB6CmK2JGhn57K5mj0MNdBXA4/WnwH6XoPWJzK5Nyu2zB3nAZp+S5hpQs+p1vN1/wsjk=

    # GitLab
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
    gitlab.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBFSMqzJeV9rUzU4kWitGjeR4PWSa29SPqJ1fVkhtj3Hw9xjLVXVYrU9QlYWrOLXBpQ6KWjbjTDTdDkoohFzgbEY=
    gitlab.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj...

    # Bitbucket
    bitbucket.org ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAubiN81eDcafrgMeLzaFPsw2kNvEcqTKl/VqLat/MaB33pZy0y3rJZtnqwR2qOOvbwKZYKiEO1O6VqNEBxKvJJelCq0dTXWT5pbO2gDXC6h6QDXCaHo6pOHGPUy+YBaGQRGuSusMEASYiWunYN0vCAI8QaXnWMXNMdFP3jHAJH0eDsoiGnLPBlBp4TNm6rYI74nMzgz3B9IikW4WVK+dc8KZJZWYjAuORU3jc1c/NPskD2ASinf8v3xnfXeukU0sJ5N6m5E8VLjObPEO+mN2t/FZTMZLiFqPWc/ALSqnMnnhwrNi2rbfg/rd/IpL8Le3pSBne8+seeFVBoGqzHM9yXw==

    # Azure DevOps
    ssh.dev.azure.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7Hr1oTWqNqOlzGJOfGJ4NakVyIzf1rXYd4d7wo6jBlkLvCA4odBlL0mDUyZ0/QUfTTqeu+tm22gOsv+VrVTMk6vwRU75gY/y9ut5Mb3bR5BV58dKXyq9A9UeB5Cakehn5Fgntc+kWC8gCTZdTea1uxGGrlGLrNFtoUjNiGkSR1A0KLbHga1ItZ8bMCaB+qkA2j0rl/6C/qaClATh7gcDA=

    # Bitbucket Cloud
    bitbucket.org ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBPIQmuzMBuKdWeF4+a2sjSSpBK0iqitSQ+5BM9KhpexuGt20JpTVM7u5BDZngncgrqDMbWdxMWWOGtZ9UgbqgZE=
    bitbucket.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIazEu89wgQZ4bqs3d63QSMzYVa0MuJ2e2gKTKqu+UUO
```

## Adding Custom SSH Host Keys

### For a Private Git Server

If you host your own Git server (Gitea, GitLab self-hosted, etc.), you need to add its host key:

```bash
# Step 1: Scan the host key from your Git server
ssh-keyscan -t ed25519,rsa,ecdsa git.internal.example.com 2>/dev/null

# Output example:
# git.internal.example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
# git.internal.example.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB...
```

Then add it to the ConfigMap:

```bash
# Get current known hosts
CURRENT=$(kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o jsonpath='{.data.ssh_known_hosts}')

# Append new host key
NEW_KEY=$(ssh-keyscan -t ed25519 git.internal.example.com 2>/dev/null)

kubectl patch configmap argocd-ssh-known-hosts-cm -n argocd --type merge -p "{
  \"data\": {
    \"ssh_known_hosts\": $(echo -e "${CURRENT}\n${NEW_KEY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"
```

### For Non-Standard SSH Ports

If your Git server uses a non-standard SSH port:

```bash
# Scan host key on a non-standard port
ssh-keyscan -p 2222 -t ed25519 git.example.com 2>/dev/null

# The output format includes the port
# [git.example.com]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
```

Add the output directly to the ConfigMap. ArgoCD handles the bracket-port notation.

### Declarative Configuration

For GitOps-managed ArgoCD, define the complete ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    # Public Git providers
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
    bitbucket.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIazEu89wgQZ4bqs3d63QSMzYVa0MuJ2e2gKTKqu+UUO

    # Internal Git servers
    git.internal.example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_your_key_here
    [git.internal.example.com]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_your_key_here
```

## Using the ArgoCD CLI

ArgoCD provides CLI commands for managing SSH known hosts:

```bash
# List current known hosts
argocd cert list --cert-type ssh

# Add a new host key
argocd cert add-ssh --batch <<EOF
git.internal.example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_key_here
EOF

# Remove a host key
argocd cert rm-ssh git.internal.example.com
```

## Troubleshooting SSH Connectivity

### "Host key verification failed" Error

This is the most common SSH error. It means the Git server's host key is not in the known hosts:

```bash
# Find the actual host key
ssh-keyscan -t ed25519 git.example.com

# Compare with what ArgoCD has
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o jsonpath='{.data.ssh_known_hosts}' | grep "git.example.com"
```

### Host Key Changed

If a Git server was rebuilt or migrated, its host key may have changed. You need to update the known hosts:

```bash
# Remove old key and add new one
CURRENT=$(kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o jsonpath='{.data.ssh_known_hosts}')
UPDATED=$(echo "${CURRENT}" | grep -v "git.example.com")
NEW_KEY=$(ssh-keyscan -t ed25519 git.example.com 2>/dev/null)

kubectl patch configmap argocd-ssh-known-hosts-cm -n argocd --type merge -p "{
  \"data\": {
    \"ssh_known_hosts\": $(echo -e "${UPDATED}\n${NEW_KEY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"
```

### Testing SSH Connectivity from the Repo Server

Debug SSH issues by exec-ing into the repo server pod:

```bash
# Find the repo server pod
kubectl exec -it -n argocd deployment/argocd-repo-server -- bash

# Test SSH connectivity
ssh -T -o StrictHostKeyChecking=yes git@github.com
# Should output: "Hi <user>! You've successfully authenticated..."

# Check what known hosts the pod sees
cat /app/config/ssh/ssh_known_hosts
```

## Skipping Host Key Verification

While strongly discouraged for production, you can disable SSH host key verification for a specific repository:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-git-example
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: "git@git.example.com:org/repo.git"
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
  insecure: "true"    # Skips host key verification - NOT recommended
```

## Monitoring Host Key Changes

Set up monitoring to detect unexpected host key changes:

```bash
#!/bin/bash
# check-ssh-hosts.sh - Verify SSH host keys haven't changed
KNOWN_HOSTS=$(kubectl get configmap argocd-ssh-known-hosts-cm -n argocd \
  -o jsonpath='{.data.ssh_known_hosts}')

echo "${KNOWN_HOSTS}" | grep -v "^#" | grep -v "^$" | while read -r line; do
  HOST=$(echo "${line}" | awk '{print $1}')

  # Skip bracketed hosts (custom ports)
  if [[ "${HOST}" == "["* ]]; then
    SCAN_HOST=$(echo "${HOST}" | tr -d '[]' | cut -d: -f1)
    SCAN_PORT=$(echo "${HOST}" | tr -d '[]' | cut -d: -f2)
    CURRENT_KEY=$(ssh-keyscan -p "${SCAN_PORT}" -t ed25519 "${SCAN_HOST}" 2>/dev/null | head -1)
  else
    CURRENT_KEY=$(ssh-keyscan -t ed25519 "${HOST}" 2>/dev/null | head -1)
  fi

  if [[ -z "${CURRENT_KEY}" ]]; then
    echo "WARNING: Cannot reach ${HOST}"
  elif echo "${KNOWN_HOSTS}" | grep -q "$(echo "${CURRENT_KEY}" | awk '{print $3}')"; then
    echo "OK: ${HOST}"
  else
    echo "ALERT: Host key changed for ${HOST}!"
  fi
done
```

## Summary

The `argocd-ssh-known-hosts-cm` ConfigMap is a critical security component that prevents man-in-the-middle attacks on Git SSH connections. Always add host keys explicitly rather than disabling verification. Keep the ConfigMap updated when you add new Git servers or when existing servers rotate their host keys. For monitoring SSH connectivity health across all your repository connections, consider setting up alerts with [OneUptime](https://oneuptime.com).
