# How to Configure Git Credentials for GitHub Enterprise in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub Enterprise, Authentication

Description: Learn how to configure ArgoCD to authenticate with GitHub Enterprise Server for accessing private repositories in on-premises and self-hosted GitHub installations.

---

GitHub Enterprise Server (GHE) is the self-hosted version of GitHub that many organizations run on their own infrastructure. Connecting ArgoCD to GHE requires some additional configuration compared to connecting to GitHub.com, mainly around custom URLs, TLS certificates, and authentication methods. This guide walks through every method available.

## Understanding GitHub Enterprise Server URLs

GitHub Enterprise Server uses your organization's domain instead of github.com. The URL patterns are different:

```text
# GitHub.com
https://github.com/org/repo.git

# GitHub Enterprise Server
https://github.company.com/org/repo.git
```

This distinction matters because ArgoCD needs to know where to send API requests for features like GitHub App authentication.

## Method 1: Personal Access Token (HTTPS)

The simplest approach is using a personal access token. On your GHE instance, go to Settings > Developer settings > Personal access tokens > Tokens (classic), and create a token with the `repo` scope.

```yaml
# ghe-repo-pat.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghe-repo-credentials
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.company.com/platform-team/k8s-manifests.git
  username: argocd-bot
  password: ghp_your_ghe_personal_access_token
```

Or use a credential template to cover all repositories:

```yaml
# ghe-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghe-credential-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.company.com
  username: argocd-bot
  password: ghp_your_ghe_personal_access_token
```

Apply with kubectl:

```bash
kubectl apply -f ghe-cred-template.yaml
```

## Method 2: SSH Keys

SSH authentication works identically to GitHub.com. Generate a dedicated key pair for ArgoCD:

```bash
# Generate an ED25519 key pair
ssh-keygen -t ed25519 -C "argocd@company.com" -f argocd-ghe-key -N ""

# Add the public key as a deploy key in your GHE repository
# Settings > Deploy keys > Add deploy key
cat argocd-ghe-key.pub
```

Configure ArgoCD with the private key:

```yaml
# ghe-ssh-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghe-ssh-credentials
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.company.com:platform-team
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

You also need to add the GHE server's SSH host key to ArgoCD's known hosts:

```bash
# Get the SSH host key from your GHE server
ssh-keyscan -t ed25519 github.company.com

# Add it to ArgoCD's known hosts ConfigMap
kubectl edit configmap argocd-ssh-known-hosts-cm -n argocd
```

Add the host key entry to the ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    github.company.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...your_ghe_host_key...
```

## Method 3: GitHub App (Recommended for Enterprise)

GitHub Apps are the best choice for enterprise environments because they offer scoped permissions, token rotation, and organizational audit trails.

Create a GitHub App on your GHE instance at `https://github.company.com/organizations/your-org/settings/apps/new` with these permissions:

- Repository contents: Read-only
- Repository metadata: Read-only

The critical difference from GitHub.com is specifying the Enterprise base URL:

```yaml
# ghe-github-app.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghe-github-app-credentials
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.company.com/your-org
  githubAppID: "42"
  githubAppInstallationID: "123"
  githubAppEnterpriseBaseUrl: "https://github.company.com/api/v3"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

The `githubAppEnterpriseBaseUrl` is essential. Without it, ArgoCD will try to contact api.github.com for token generation, which will fail.

```bash
kubectl apply -f ghe-github-app.yaml
```

## Handling Custom TLS Certificates

Most GHE installations use internal CA certificates. ArgoCD needs to trust your internal CA to establish HTTPS connections.

### Option 1: Add CA Certificate to ArgoCD TLS ConfigMap

```yaml
# argocd-tls-certs.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  github.company.com: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK... (your CA certificate)
    -----END CERTIFICATE-----
```

```bash
kubectl apply -f argocd-tls-certs.yaml
```

### Option 2: Skip TLS Verification (Not Recommended)

For testing only, you can disable TLS verification:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghe-insecure
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.company.com/team/repo.git
  username: argocd-bot
  password: ghp_token
  insecure: "true"
```

Never use this in production. It opens you up to man-in-the-middle attacks.

## Handling GHE Behind a Proxy

If your GHE instance is accessible only through a corporate proxy:

```yaml
# Configure proxy in the argocd-repo-server deployment
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
            - name: HTTPS_PROXY
              value: "http://proxy.company.com:8080"
            - name: HTTP_PROXY
              value: "http://proxy.company.com:8080"
            - name: NO_PROXY
              value: "kubernetes.default.svc,10.0.0.0/8"
```

## Testing the Connection

After configuring credentials, test the connection:

```bash
# Via CLI
argocd repo add https://github.company.com/platform-team/k8s-manifests.git \
  --username argocd-bot \
  --password ghp_your_token

# Check status
argocd repo list

# Create a test application
argocd app create test-ghe \
  --repo https://github.company.com/platform-team/k8s-manifests.git \
  --path test-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace test
```

## Troubleshooting GHE Connections

### TLS Certificate Errors

```bash
# Check if ArgoCD can reach the GHE server
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v https://github.company.com 2>&1 | head -30

# Verify the CA certificate is loaded
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml
```

### Authentication Failures

```bash
# Check repo-server logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=50

# Test credentials manually
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://argocd-bot:ghp_token@github.company.com/org/repo.git
```

### GitHub App Token Generation Failures

```bash
# Verify the Enterprise API endpoint is reachable
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v https://github.company.com/api/v3 2>&1

# Check that the App ID and Installation ID are correct
# Visit: https://github.company.com/organizations/org/settings/installations
```

## GHE Version Considerations

Different GHE versions have different API capabilities:

- GHE 3.0+: Full GitHub App support
- GHE 2.22+: GitHub App support with some limitations
- Older versions: Use PATs or SSH keys only

Check your GHE version at `https://github.company.com/enterprise/admin` and ensure your authentication method is compatible.

## Security Best Practices for GHE

Create a dedicated service account on GHE rather than using a personal account. Use GitHub Apps when possible for automatic token rotation. Store credentials using SealedSecrets or an external secrets manager. Regularly rotate PATs and SSH keys. Use the principle of least privilege - grant only `repo` read access. Monitor the GHE audit log for ArgoCD access patterns.

For more details on managing ArgoCD repository credentials, check out the comprehensive guide on [repository credentials in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view).
