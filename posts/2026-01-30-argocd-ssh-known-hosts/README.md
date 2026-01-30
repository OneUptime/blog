# How to Implement ArgoCD SSH Known Hosts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, SSH, Security

Description: Learn how to securely configure SSH known hosts in ArgoCD to prevent man-in-the-middle attacks when connecting to private Git repositories.

---

When ArgoCD connects to private Git repositories over SSH, it needs to verify the server's identity. Without proper SSH known hosts configuration, you are vulnerable to man-in-the-middle attacks. This guide shows you how to configure SSH known hosts correctly.

## Why SSH Known Hosts Matter

```mermaid
sequenceDiagram
    participant ArgoCD
    participant Attacker
    participant Git Server

    Note over ArgoCD,Git Server: Without Known Hosts Verification
    ArgoCD->>Attacker: SSH Connection
    Attacker->>ArgoCD: Fake Host Key
    ArgoCD->>Attacker: Credentials/Data
    Attacker->>Git Server: Forward Request
    Git Server->>Attacker: Response
    Attacker->>ArgoCD: Modified Response

    Note over ArgoCD,Git Server: With Known Hosts Verification
    ArgoCD->>Git Server: SSH Connection
    Git Server->>ArgoCD: Host Key
    ArgoCD->>ArgoCD: Verify Against Known Hosts
    ArgoCD->>Git Server: Secure Communication
```

SSH known hosts verification ensures that:
1. ArgoCD connects to the legitimate Git server
2. The connection cannot be intercepted by attackers
3. Host key changes are detected immediately
4. Your deployment pipeline maintains integrity

## Understanding ArgoCD Repository Configuration

ArgoCD stores SSH configuration in Kubernetes secrets and ConfigMaps. Here is how the components fit together:

```mermaid
flowchart TB
    subgraph ArgoCD Namespace
        CM[argocd-ssh-known-hosts-cm<br/>ConfigMap]
        Secret[argocd-repo-creds<br/>Secret]
        Repo[argocd-repo-server<br/>Pod]
    end

    subgraph External
        GitHub[GitHub]
        GitLab[GitLab]
        Bitbucket[Bitbucket]
        Private[Private Git Server]
    end

    CM -->|Mount| Repo
    Secret -->|Mount| Repo
    Repo -->|SSH| GitHub
    Repo -->|SSH| GitLab
    Repo -->|SSH| Bitbucket
    Repo -->|SSH| Private
```

## Getting SSH Host Keys

Before configuring ArgoCD, you need to obtain the SSH host keys for your Git servers. Here is how to get them for common providers.

### GitHub

```bash
ssh-keyscan github.com
```

This outputs the host keys in the known_hosts format:

```
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM4GC7uEnztnZyaVWQ7B381AK4Qdrwt51ZqExKbQpTUNn+EjqoTwvqNj4kqx5QUCI0ThS/YkOxJCXmPUWZbhjpCg56i+2aB6CmK2JGhn57K5mj0MNdBXA4/WnwH6XoPWJzK5Nyu2zB3nAZp+S5hpQs+p1vN1/wsjk=
```

### GitLab

```bash
ssh-keyscan gitlab.com
```

### Bitbucket

```bash
ssh-keyscan bitbucket.org
```

### Private Git Server

For self-hosted Git servers, replace the hostname with your server address:

```bash
ssh-keyscan git.yourcompany.com
```

### Verifying Host Keys

Always verify the host keys against the official documentation. For example, GitHub publishes their SSH key fingerprints at https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints.

You can verify fingerprints like this:

```bash
ssh-keyscan github.com 2>/dev/null | ssh-keygen -lf -
```

This outputs:

```
256 SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU github.com (ED25519)
256 SHA256:p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM github.com (ECDSA)
3072 SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s github.com (RSA)
```

## Configuring SSH Known Hosts in ArgoCD

### Method 1: Using the ArgoCD CLI

The simplest way to add SSH known hosts is through the ArgoCD CLI.

Add a known host entry:

```bash
argocd cert add-ssh --batch <<EOF
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
bitbucket.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIazEu89wgQZ4bqs3d63QSMzYVa0MuJ2e2gKTKqu+UUO
EOF
```

List configured known hosts:

```bash
argocd cert list --cert-type ssh
```

Remove a known host entry:

```bash
argocd cert rm --cert-type ssh github.com
```

### Method 2: Using the ConfigMap Directly

For declarative configuration, edit the argocd-ssh-known-hosts-cm ConfigMap.

First, get the current configuration:

```bash
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml
```

Create or update the ConfigMap with your known hosts:

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
    gitlab.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCsj2bNKTBSpIYDEGk9KxsGh3mySTRgMtXL583qmBpzeQ+jqCMRgBqB98u3z++J1sKlXHWfM9dyhSevkMwSbhoR8XIq/U0tCNyokEi/ueaBMCvbcTHhO7FcwzY92WK4Zt0aGGhCdeRhU0i7+MR5wWwIDAQAB
    # Bitbucket
    bitbucket.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIazEu89wgQZ4bqs3d63QSMzYVa0MuJ2e2gKTKqu+UUO
    bitbucket.org ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBPIQmuzMBuKdWeF4+a2sjSSpBK0iqitSQ+5BM9KhpexuGt20JpTVM7u5BDZngncgrqDMbWdxMWWOGtZ9UgbqgZE=
    bitbucket.org ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAubiN81eDcafrgMeLzaFPsw2kNvEcqTKl/VqLat/MaB33pZy0y3rJZtnqwR2qOOvbwKZYKiEO1O6VqNEBxKvJJelCq0dTXWT5pbO2gDXC6h6QDXCaHo6pOHGPUy+YBaGQRGuSusMEASYiWunYN0vCAI8QaXnWMXNMdFP3jHAJH0eDsoiGnLPBlBp4TNm6rYI74nMzgz3B9IikW4WVK+dc8KZJZWYjAuORU3jc1c/NPskD2ASinf8v3xnfXeukU0sJ5N6m5E8VLjObPEO+mN2t/FZTMZLiFqPWc/ALSqnMnnhwrNi2rbfg/rd/IpL8Le3pSBne8+seeFVBoGqzHM9yXw==
    # Private Git Server (example)
    # git.yourcompany.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

Apply the ConfigMap:

```bash
kubectl apply -f argocd-ssh-known-hosts-cm.yaml
```

### Method 3: Using Helm Values

If you installed ArgoCD with Helm, configure known hosts in your values file.

Create or update your values.yaml:

```yaml
configs:
  ssh:
    knownHosts: |
      github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
      gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
      bitbucket.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIazEu89wgQZ4bqs3d63QSMzYVa0MuJ2e2gKTKqu+UUO
```

Upgrade your Helm release:

```bash
helm upgrade argocd argo/argo-cd \
  --namespace argocd \
  -f values.yaml
```

## Adding SSH Private Keys for Repository Access

After configuring known hosts, you need to add SSH credentials for your repositories.

### Using the ArgoCD CLI

```bash
argocd repo add git@github.com:myorg/myrepo.git \
  --ssh-private-key-path ~/.ssh/argocd_deploy_key
```

### Using a Kubernetes Secret

Create a secret containing your SSH private key:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:myorg/myrepo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
    ... (your private key content) ...
    -----END OPENSSH PRIVATE KEY-----
```

Apply the secret:

```bash
kubectl apply -f repo-secret.yaml
```

### Using Credential Templates

For multiple repositories under the same organization, use credential templates:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:myorg
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ... (your private key content) ...
    -----END OPENSSH PRIVATE KEY-----
```

This template applies to all repositories matching `git@github.com:myorg/*`.

## Automating Known Hosts Updates

Host keys can change when providers rotate their keys. Here is how to automate updates.

### CronJob for Periodic Updates

Create a CronJob that periodically fetches and updates known hosts:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: update-ssh-known-hosts
  namespace: argocd
spec:
  schedule: "0 0 * * 0"  # Weekly on Sunday at midnight
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-server
          containers:
            - name: update-known-hosts
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Fetch current host keys
                  KNOWN_HOSTS=$(ssh-keyscan github.com gitlab.com bitbucket.org 2>/dev/null)

                  # Create ConfigMap patch
                  kubectl patch configmap argocd-ssh-known-hosts-cm -n argocd \
                    --type merge \
                    -p "{\"data\":{\"ssh_known_hosts\":\"$KNOWN_HOSTS\"}}"

                  # Restart repo-server to pick up changes
                  kubectl rollout restart deployment argocd-repo-server -n argocd
          restartPolicy: OnFailure
```

### Alert on Host Key Changes

Set up monitoring to detect unexpected host key changes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ssh-key-monitor
  namespace: argocd
data:
  check-keys.sh: |
    #!/bin/bash

    # Get current known hosts from ConfigMap
    CURRENT=$(kubectl get configmap argocd-ssh-known-hosts-cm -n argocd \
      -o jsonpath='{.data.ssh_known_hosts}')

    # Fetch fresh keys
    FRESH=$(ssh-keyscan github.com gitlab.com bitbucket.org 2>/dev/null)

    # Compare fingerprints
    CURRENT_FP=$(echo "$CURRENT" | ssh-keygen -lf - | sort)
    FRESH_FP=$(echo "$FRESH" | ssh-keygen -lf - | sort)

    if [ "$CURRENT_FP" != "$FRESH_FP" ]; then
      echo "WARNING: SSH host keys have changed!"
      echo "Current fingerprints:"
      echo "$CURRENT_FP"
      echo "Fresh fingerprints:"
      echo "$FRESH_FP"
      exit 1
    fi

    echo "SSH host keys match"
```

## Troubleshooting SSH Known Hosts Issues

### Error: Host Key Verification Failed

If you see this error when ArgoCD tries to connect to a repository:

```
Host key verification failed.
fatal: Could not read from remote repository.
```

Check that the host key is properly configured:

```bash
# List current known hosts
argocd cert list --cert-type ssh

# Verify the key matches what the server provides
ssh-keyscan github.com | ssh-keygen -lf -

# Add the missing key
argocd cert add-ssh --batch <<EOF
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
EOF
```

### Error: Known Host Entry Changed

If a host key has changed legitimately (provider rotated keys), update it:

```bash
# Remove the old key
argocd cert rm --cert-type ssh github.com

# Add the new key
ssh-keyscan github.com | argocd cert add-ssh --batch
```

### Debugging SSH Connections

Enable verbose SSH logging in the repo-server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            - name: GIT_SSH_COMMAND
              value: "ssh -vvv"
```

Check the logs:

```bash
kubectl logs -n argocd deployment/argocd-repo-server | grep -i ssh
```

### Verify ConfigMap is Mounted Correctly

Check that the known hosts ConfigMap is mounted in the repo-server pod:

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- cat /app/config/ssh/ssh_known_hosts
```

## Security Best Practices

```mermaid
flowchart TB
    subgraph Best Practices
        A[Use Ed25519 Keys] --> B[Verify Fingerprints]
        B --> C[Monitor for Changes]
        C --> D[Rotate Deploy Keys]
        D --> E[Use Credential Templates]
        E --> F[Audit Access Logs]
    end
```

### 1. Prefer Ed25519 Keys

Ed25519 is the most secure and efficient SSH key algorithm. Always prefer it when available:

```bash
# Only get Ed25519 keys
ssh-keyscan -t ed25519 github.com
```

### 2. Verify Keys Against Official Sources

Never blindly trust ssh-keyscan output. Always verify against official documentation:
- GitHub: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab: https://docs.gitlab.com/ee/user/gitlab_com/#ssh-known_hosts-entries
- Bitbucket: https://support.atlassian.com/bitbucket-cloud/docs/configure-ssh-and-two-step-verification/

### 3. Use Dedicated Deploy Keys

Create dedicated deploy keys for ArgoCD instead of using personal SSH keys:

```bash
# Generate a dedicated deploy key
ssh-keygen -t ed25519 -C "argocd-deploy-key" -f argocd_deploy_key -N ""

# Add the public key to your repository as a deploy key
# Add the private key to ArgoCD
```

### 4. Implement Key Rotation

Rotate deploy keys periodically:

```bash
# Generate new key
ssh-keygen -t ed25519 -C "argocd-deploy-key-$(date +%Y%m)" -f new_deploy_key -N ""

# Update ArgoCD with new key
argocd repo add git@github.com:myorg/myrepo.git \
  --ssh-private-key-path new_deploy_key \
  --upsert

# Remove old key from repository settings
```

### 5. Limit Repository Access

Use read-only deploy keys when possible and scope credential templates narrowly:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-readonly-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:myorg/config-repo  # Specific repo, not wildcard
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ... (read-only deploy key) ...
    -----END OPENSSH PRIVATE KEY-----
```

---

Properly configured SSH known hosts are essential for secure GitOps. Take the time to verify host keys, automate updates, and follow security best practices. Your deployment pipeline is only as secure as its weakest link, and SSH host verification is a critical first line of defense.
