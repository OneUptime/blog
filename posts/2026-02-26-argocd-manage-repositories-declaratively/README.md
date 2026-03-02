# How to Manage ArgoCD Repositories Declaratively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repository Management, Secret

Description: Learn how to define and manage ArgoCD repository connections declaratively using Kubernetes secrets for reproducible and version-controlled Git and Helm repository configurations.

---

Every ArgoCD application needs a source repository, whether that is a Git repo or a Helm chart registry. When you add repositories through the ArgoCD UI or CLI, the configuration is stored as Kubernetes secrets in the argocd namespace. Managing these declaratively means defining those secrets as YAML manifests, which gives you the same version control and reproducibility benefits as declarative applications and projects.

## How ArgoCD Stores Repository Configuration

ArgoCD stores repository connection information as Kubernetes secrets with the label `argocd.argoproj.io/secret-type: repository`. Each secret contains the repository URL, authentication credentials, and connection settings.

```mermaid
flowchart LR
    Secret["K8s Secret<br/>type: repository"] --> ArgoCD["ArgoCD Repo Server"]
    ArgoCD --> Git["Git Repository"]
    ArgoCD --> Helm["Helm Registry"]
    ArgoCD --> OCI["OCI Registry"]
```

## Declaring a Public Git Repository

For public repositories, you only need the URL:

```yaml
# repositories/public-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-public-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/public-app.git
```

Apply it:

```bash
kubectl apply -f repositories/public-repo.yaml
```

ArgoCD automatically detects the new secret and makes the repository available for applications.

## Declaring a Private Git Repository with HTTPS

For private repositories using username and password (or personal access token):

```yaml
# repositories/private-https-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-private-backend
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/private-backend.git
  username: argocd-bot
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

For GitHub, use a personal access token or GitHub App installation token as the password. For GitLab, use a deploy token or project access token.

## Declaring a Private Git Repository with SSH

For SSH-based authentication:

```yaml
# repositories/private-ssh-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-private-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: git@github.com:myorg/private-app.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

Make sure the SSH key has read access to the repository and that the known hosts for the Git server are configured in ArgoCD.

## Declaring a Helm Chart Repository

For Helm chart repositories:

```yaml
# repositories/helm-bitnami.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-helm-bitnami
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: bitnami
  url: https://charts.bitnami.com/bitnami
```

For private Helm repositories with basic auth:

```yaml
# repositories/helm-private.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-helm-private
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: internal-charts
  url: https://charts.internal.example.com
  username: admin
  password: secretpassword
```

## Declaring an OCI Registry

For OCI-based registries (used for Helm charts stored as OCI artifacts):

```yaml
# repositories/oci-registry.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-oci-ecr
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: ecr-charts
  url: 123456789012.dkr.ecr.us-east-1.amazonaws.com
  enableOCI: "true"
  username: AWS
  password: <ecr-token>
```

## Using Repository Credential Templates

Instead of defining credentials for each repository individually, you can use credential templates that apply to all repositories matching a URL pattern:

```yaml
# repositories/cred-template-github.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cred-template-github
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg
  username: argocd-bot
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Note the label value: `repo-creds` instead of `repository`. This template matches any repository URL that starts with `https://github.com/myorg`. Now individual repository secrets do not need credentials:

```yaml
# repositories/app-repos.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-backend-api
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/backend-api.git
  # No credentials needed - inherited from template
---
apiVersion: v1
kind: Secret
metadata:
  name: repo-frontend-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/frontend-app.git
  # No credentials needed - inherited from template
```

## Using GitHub App Authentication

For organizations using GitHub Apps for authentication:

```yaml
# repositories/cred-template-github-app.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cred-template-github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

## Handling Credentials Securely

Storing credentials in plain YAML files in Git defeats the purpose of security. Here are better approaches.

### Using Sealed Secrets

Encrypt the secret with Sealed Secrets before committing to Git:

```bash
# Create the secret YAML
cat <<EOF > repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-private-backend
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/private-backend.git
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EOF

# Seal it
kubeseal --format yaml < repo-secret.yaml > repositories/repo-private-backend-sealed.yaml

# Remove the unencrypted file
rm repo-secret.yaml
```

### Using External Secrets Operator

Define an ExternalSecret that creates the repository secret from a vault:

```yaml
# repositories/repo-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: repo-private-backend
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: repo-private-backend
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: git
        url: https://github.com/myorg/private-backend.git
        password: "{{ .token }}"
        username: argocd-bot
  data:
    - secretKey: token
      remoteRef:
        key: argocd/github-token
```

## Organizing Repository Manifests

```
argocd-config/
  repositories/
    credential-templates/
      github-org.yaml
      gitlab-internal.yaml
      helm-private.yaml
    git/
      backend-api.yaml
      frontend-app.yaml
      infrastructure.yaml
    helm/
      bitnami.yaml
      grafana.yaml
      prometheus-community.yaml
    oci/
      ecr-charts.yaml
```

## Managing Repositories with ArgoCD

Have ArgoCD manage its own repository configurations:

```yaml
# root-repos.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-repositories
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/argocd-config.git
    targetRevision: main
    path: repositories
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
```

## Verifying Repository Configuration

After applying your declarative repository secrets, verify they are working:

```bash
# List all configured repositories
argocd repo list

# Test a specific repository connection
argocd repo get https://github.com/myorg/backend-api.git

# Check for connection errors
kubectl get secrets -n argocd \
  -l argocd.argoproj.io/secret-type=repository \
  -o custom-columns='NAME:.metadata.name,URL:.data.url'
```

## Common Issues

**Repository not appearing in ArgoCD** - Check that the secret has the correct label `argocd.argoproj.io/secret-type: repository` and is in the `argocd` namespace.

**Authentication failures** - Verify the credentials work by testing them outside ArgoCD first (e.g., `git clone` with the same credentials).

**Credential template not matching** - The template URL must be a prefix of the repository URL. `https://github.com/myorg` matches `https://github.com/myorg/app.git` but not `git@github.com:myorg/app.git`.

Declarative repository management, combined with [declarative applications](https://oneuptime.com/blog/post/2026-02-26-argocd-manage-applications-declaratively/view) and [declarative projects](https://oneuptime.com/blog/post/2026-02-26-argocd-manage-projects-declaratively/view), gives you a fully reproducible ArgoCD configuration that can be rebuilt from Git at any time.
