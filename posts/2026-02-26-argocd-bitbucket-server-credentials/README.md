# How to Configure Git Credentials for Bitbucket Server in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Bitbucket, Repository Management

Description: Learn how to connect ArgoCD to Atlassian Bitbucket Server and Data Center for deploying Kubernetes applications from private Bitbucket repositories.

---

Bitbucket Server (now called Bitbucket Data Center) is Atlassian's self-hosted Git repository solution. Its URL structure and authentication mechanisms differ from GitHub and GitLab, which can cause confusion when setting up ArgoCD. This guide covers every authentication method and the quirks specific to Bitbucket Server.

## Understanding Bitbucket Server URL Structure

Bitbucket Server uses a different URL format than other Git providers. Understanding this is crucial for getting ArgoCD credential templates right:

```
# Bitbucket Server HTTPS clone URL
https://bitbucket.company.com/scm/PROJECT_KEY/repo-name.git

# Bitbucket Server SSH clone URL
ssh://git@bitbucket.company.com:7999/PROJECT_KEY/repo-name.git

# Bitbucket Cloud (different product entirely)
https://bitbucket.org/workspace/repo-name.git
```

Notice the `/scm/` in HTTPS URLs and the custom SSH port (7999 by default). These are Bitbucket Server-specific patterns.

## Method 1: HTTP Access Token (Recommended)

Bitbucket Server 7.6+ supports HTTP access tokens, which are the best option for ArgoCD because they are not tied to a user account and can be scoped to specific projects or repositories.

Create a token at Project Settings > HTTP access tokens > Create token with `Repository read` permission.

```yaml
# bitbucket-http-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-server-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://bitbucket.company.com/scm
  username: x-token-auth
  password: your_http_access_token_here
```

The username `x-token-auth` is the standard Bitbucket Server convention for token-based authentication.

```bash
kubectl apply -f bitbucket-http-token.yaml
```

For a project-specific template:

```yaml
# bitbucket-project-creds.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-platform-project
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://bitbucket.company.com/scm/PLATFORM
  username: x-token-auth
  password: project_scoped_http_token
```

## Method 2: Personal Access Token

If your Bitbucket Server version does not support HTTP access tokens, you can use personal access tokens. Create one at your Bitbucket user profile > Manage account > Personal access tokens.

```yaml
# bitbucket-pat.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-pat-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://bitbucket.company.com/scm
  username: argocd-service-user
  password: your_personal_access_token
```

Create a dedicated service account in Bitbucket Server rather than using a personal account. This prevents access from breaking when someone leaves the organization.

## Method 3: SSH Keys

SSH is commonly used with Bitbucket Server. The default SSH port is 7999, which requires special handling in ArgoCD.

Generate an SSH key pair:

```bash
ssh-keygen -t ed25519 -C "argocd@company.com" -f argocd-bitbucket-key -N ""
```

Add the public key as an SSH access key in Bitbucket:
- For a specific repository: Repository Settings > Access keys
- For all repos in a project: Project Settings > Access keys

Configure ArgoCD with the private key:

```yaml
# bitbucket-ssh-creds.yaml
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
    b3BlbnNzaC1rZXktdjEAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

Notice the URL includes the custom port `7999`. You also need to add the Bitbucket Server's SSH host key:

```bash
# Scan the host key on the custom port
ssh-keyscan -p 7999 -t ed25519 bitbucket.company.com
```

Update the ArgoCD SSH known hosts ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    [bitbucket.company.com]:7999 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

Note the bracket notation `[host]:port` for non-standard SSH ports.

## Method 4: Username and Password

Basic username/password authentication works but is the least preferred method:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-basic-auth
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://bitbucket.company.com/scm
  username: argocd-service
  password: the_password
```

This method is not recommended because passwords are harder to rotate and audit compared to tokens.

## Handling TLS Certificates

Like most self-hosted tools, Bitbucket Server often uses internal CA certificates:

```yaml
# argocd-tls-certs-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  bitbucket.company.com: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK...
    -----END CERTIFICATE-----
```

```bash
kubectl apply -f argocd-tls-certs-cm.yaml
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

## Using the CLI

```bash
# Add a specific Bitbucket Server repo
argocd repo add https://bitbucket.company.com/scm/PLATFORM/k8s-manifests.git \
  --username x-token-auth \
  --password your_http_token

# Add a credential template for all repos
argocd repocreds add https://bitbucket.company.com/scm \
  --username x-token-auth \
  --password your_http_token

# Add with SSH
argocd repo add ssh://git@bitbucket.company.com:7999/PLATFORM/k8s-manifests.git \
  --ssh-private-key-path ./argocd-bitbucket-key

# Verify
argocd repo list
```

## Creating an Application from Bitbucket Server

```yaml
# app-from-bitbucket.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://bitbucket.company.com/scm/PLATFORM/k8s-manifests.git
    targetRevision: main
    path: services/my-service
  destination:
    server: https://kubernetes.default.svc
    namespace: my-service
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Configuring Webhooks

Bitbucket Server supports webhooks that can notify ArgoCD of repository changes:

```yaml
# In argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  webhook.bitbucketserver.secret: your-webhook-secret
```

In Bitbucket Server, go to Repository Settings > Webhooks > Create webhook:
- URL: `https://argocd.company.com/api/webhook`
- Secret: Same as above
- Events: Repository push

## Bitbucket Data Center Specifics

If you are running Bitbucket Data Center (the clustered version), there are additional considerations:

```mermaid
graph LR
    A[ArgoCD] --> B[Load Balancer]
    B --> C[Bitbucket Node 1]
    B --> D[Bitbucket Node 2]
    B --> E[Bitbucket Node 3]
    C --> F[Shared Git Storage]
    D --> F
    E --> F
```

The load balancer URL should be used in ArgoCD configuration. Individual node URLs should not be used as they may not be consistently available.

## Troubleshooting

### "Could not read from remote repository" Error

```bash
# Check if the URL format is correct
# Bitbucket Server uses /scm/ in the path
argocd repo get https://bitbucket.company.com/scm/PROJECT/repo.git

# Verify connectivity from the repo-server pod
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://x-token-auth:token@bitbucket.company.com/scm/PROJECT/repo.git
```

### SSH Connection Refused

```bash
# Verify the SSH port (default 7999)
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -T -p 7999 git@bitbucket.company.com

# Check known hosts include the port
kubectl get cm argocd-ssh-known-hosts-cm -n argocd -o yaml | grep bitbucket
```

### Permission Denied

Ensure the token or SSH key has the correct access level. Bitbucket Server has separate permissions for projects and repositories. The ArgoCD credentials need at least `Repository read` permission on the target repositories.

For more on managing repository credentials in ArgoCD, see the [repository credentials guide](https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view).
