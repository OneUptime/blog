# How to Fix 'repository not accessible' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Git

Description: Fix the ArgoCD repository not accessible error by troubleshooting Git credentials, SSH keys, network connectivity, proxy settings, and repository URL configurations.

---

The "repository not accessible" error in ArgoCD means the repo server cannot connect to or authenticate with your Git repository. This error blocks everything - ArgoCD cannot fetch manifests, compare states, or sync applications if it cannot reach the source repository.

The error typically appears as:

```
repository not accessible: failed to ls-remote https://github.com/org/repo.git:
authentication required
```

Or:

```
repository not accessible: failed to ls-remote ssh://git@github.com/org/repo.git:
dial tcp: lookup github.com: no such host
```

This guide covers every common cause and provides tested solutions.

## Quick Diagnostic Steps

Before diving into specific fixes, run these diagnostic commands:

```bash
# List all configured repositories
argocd repo list

# Test a specific repository
argocd repo get https://github.com/org/repo

# Check the repo server logs for detailed error messages
kubectl logs -n argocd deployment/argocd-repo-server --tail=100
```

## Cause 1: Missing or Invalid Credentials

The most common cause. The repository is private but ArgoCD does not have valid credentials configured.

**For HTTPS repositories:**

```bash
# Add repository with HTTPS credentials
argocd repo add https://github.com/org/private-repo \
  --username your-username \
  --password your-token
```

For GitHub, use a Personal Access Token (PAT) instead of a password:

```bash
# GitHub PAT-based authentication
argocd repo add https://github.com/org/private-repo \
  --username x-access-token \
  --password ghp_your_personal_access_token
```

For GitLab, use a deploy token or project access token:

```bash
# GitLab deploy token
argocd repo add https://gitlab.com/org/private-repo \
  --username deploy-token-username \
  --password deploy-token-password
```

**For SSH repositories:**

```bash
# Add repository with SSH key
argocd repo add git@github.com:org/private-repo.git \
  --ssh-private-key-path ~/.ssh/id_ed25519
```

**Declaratively using a Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/org/private-repo
  username: x-access-token
  password: ghp_your_personal_access_token
```

## Cause 2: Expired Credentials

Credentials can expire, especially:
- GitHub PATs with expiration dates
- GitLab deploy tokens
- Azure DevOps PATs (default 1 year)
- AWS CodeCommit temporary credentials

**Check if credentials are the issue:**

```bash
# Try cloning manually with the same credentials
git clone https://x-access-token:ghp_your_token@github.com/org/repo.git /tmp/test-clone
```

**Rotate credentials:**

```bash
# Update repository credentials
argocd repo add https://github.com/org/repo \
  --username x-access-token \
  --password ghp_new_token \
  --upsert
```

Or update the Secret directly:

```bash
kubectl edit secret private-repo-creds -n argocd
# Update the password field with the new token (base64 encoded)
```

## Cause 3: SSH Host Key Not Trusted

If using SSH and the Git host's SSH key is not in ArgoCD's known hosts:

```
repository not accessible: Host key verification failed
```

**Add the SSH known host:**

```bash
# Get the host key
ssh-keyscan github.com

# Add it to ArgoCD
argocd cert add-ssh --batch --from /path/to/known_hosts
```

**Or add it to the ConfigMap:**

```bash
# Get current SSH known hosts
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
    bitbucket.org ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIazEu89wgQZ4bqs3d63QSMzYVa0MuJ2e2gKTKqu+UUO
```

## Cause 4: Network Connectivity Issues

The ArgoCD repo server pod might not be able to reach the Git server.

**Test connectivity from the repo server:**

```bash
# Test HTTPS connectivity
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -sSf https://github.com -o /dev/null && echo "OK" || echo "FAILED"

# Test SSH connectivity
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -T git@github.com 2>&1
```

**If behind a corporate firewall or proxy:**

```yaml
# Set proxy settings on the repo server deployment
containers:
  - name: argocd-repo-server
    env:
      - name: HTTP_PROXY
        value: "http://proxy.corp.example.com:8080"
      - name: HTTPS_PROXY
        value: "http://proxy.corp.example.com:8080"
      - name: NO_PROXY
        value: "kubernetes.default.svc,10.0.0.0/8"
```

**If using a custom SSH port:**

```bash
# Add repo with custom SSH port
argocd repo add ssh://git@gitlab.internal.com:2222/org/repo.git \
  --ssh-private-key-path ~/.ssh/id_ed25519
```

## Cause 5: URL Mismatch

The URL in the application spec does not match the URL configured in ArgoCD's repository list.

```bash
# Check what URLs are registered
argocd repo list

# Compare with the application source
argocd app get my-app -o yaml | grep repoURL
```

**Common mismatches:**

```
# These are treated as different repositories:
https://github.com/org/repo          # no .git suffix
https://github.com/org/repo.git      # with .git suffix
git@github.com:org/repo.git          # SSH format
ssh://git@github.com/org/repo.git    # SSH URL format
```

Ensure the URL in your Application spec matches exactly what is registered in ArgoCD.

## Cause 6: Credential Templates Not Matching

If you use repository credential templates (patterns), the URL pattern might not match:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/org  # Template matches all repos under this prefix
  username: x-access-token
  password: ghp_your_token
```

**Make sure the template URL is a prefix of the actual repo URL:**

```
Template URL: https://github.com/org
Repo URL:     https://github.com/org/my-repo  # Matches!
Repo URL:     https://github.com/other-org/repo  # Does NOT match
```

## Cause 7: Self-Hosted Git with Custom TLS Certificates

If your Git server uses a self-signed or corporate CA certificate:

```
x509: certificate signed by unknown authority
```

**Add the CA certificate to ArgoCD:**

```bash
# Add TLS certificate
argocd cert add-tls git.internal.com --from /path/to/ca-cert.pem
```

**Or configure it via ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  git.internal.com: |
    -----BEGIN CERTIFICATE-----
    MIIFqzCCA5OgAwIBAgI...
    -----END CERTIFICATE-----
```

## Cause 8: GitHub App Authentication

If using GitHub App authentication:

```bash
argocd repo add https://github.com/org/repo \
  --github-app-id 12345 \
  --github-app-installation-id 67890 \
  --github-app-private-key-path ./private-key.pem
```

Make sure:
- The app is installed on the organization/repository
- The private key is valid and not expired
- The installation ID is correct
- The app has the required permissions (Contents: Read)

## Debugging Checklist

1. Check `argocd repo list` - is the repo registered?
2. Check `argocd repo get <url>` - does it show any connection status?
3. Check repo server logs - `kubectl logs -n argocd deployment/argocd-repo-server`
4. Test Git connectivity from the repo server pod
5. Verify credentials work by cloning manually
6. Check URL format matches between app spec and repo config
7. Verify SSH known hosts if using SSH
8. Check TLS certificates if using self-hosted Git

## Summary

The "repository not accessible" error is always a connectivity or authentication issue between the ArgoCD repo server and your Git provider. Start by verifying credentials are correct and not expired, then check network connectivity from the repo server pod, and finally verify URL formats match across all configurations. Using `argocd repo list` and the repo server logs will give you the most actionable information for diagnosing the specific failure.
