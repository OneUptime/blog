# How to Use ArgoCD with Private Git Repos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, SSH, DevOps, CI/CD, Security

Description: A complete guide to configuring ArgoCD to work with private Git repositories using SSH keys, HTTPS credentials, GitHub Apps, and credential templates for secure GitOps workflows.

---

ArgoCD needs access to your Git repositories to sync Kubernetes manifests. When those repositories are private, you need to configure authentication properly. Let me walk you through every method available.

## Authentication Methods Overview

ArgoCD supports multiple ways to authenticate with private Git repositories. Each method has different security characteristics and use cases.

```mermaid
flowchart TB
    ArgoCD[ArgoCD Controller]

    subgraph "Authentication Methods"
        SSH[SSH Keys]
        HTTPS[HTTPS Credentials]
        GHA[GitHub App]
        GCM[Git Credential Manager]
    end

    subgraph "Git Providers"
        GitHub[GitHub]
        GitLab[GitLab]
        Bitbucket[Bitbucket]
        Azure[Azure DevOps]
    end

    ArgoCD --> SSH
    ArgoCD --> HTTPS
    ArgoCD --> GHA
    ArgoCD --> GCM

    SSH --> GitHub
    SSH --> GitLab
    SSH --> Bitbucket
    HTTPS --> GitHub
    HTTPS --> GitLab
    HTTPS --> Azure
    GHA --> GitHub
```

Choose based on your security requirements:
- **SSH Keys** - Most common, works everywhere
- **HTTPS with PAT** - Simple but tokens can be broad
- **GitHub Apps** - Best for GitHub, fine-grained permissions
- **Credential Templates** - Scale across many repos

## Method 1: SSH Key Authentication

SSH keys provide secure, passwordless authentication. Generate a deploy key specifically for ArgoCD.

### Generate an SSH Key Pair

Run the following command to create a new SSH key pair dedicated to ArgoCD. Using a dedicated key per repository improves security through isolation.

```bash
# Generate an ED25519 key pair for better security
ssh-keygen -t ed25519 -C "argocd@example.com" -f ~/.ssh/argocd-deploy-key -N ""

# View the public key to add to your Git provider
cat ~/.ssh/argocd-deploy-key.pub

# View the private key (keep this secret!)
cat ~/.ssh/argocd-deploy-key
```

### Add Deploy Key to GitHub

Navigate to your repository settings and add the public key as a deploy key.

```mermaid
sequenceDiagram
    participant Admin as Repository Admin
    participant GitHub as GitHub Settings
    participant ArgoCD as ArgoCD
    participant Repo as Private Repo

    Admin->>GitHub: Add deploy key (public)
    Admin->>ArgoCD: Configure repository (private key)
    ArgoCD->>Repo: Clone using SSH
    Repo-->>ArgoCD: Authenticated access granted
```

Steps in GitHub:
1. Go to Repository > Settings > Deploy keys
2. Click "Add deploy key"
3. Paste the public key content
4. Enable "Allow write access" only if needed

### Configure ArgoCD with SSH Key

Create a Kubernetes Secret containing the private key. ArgoCD watches for secrets with the correct label and uses them for repository authentication.

```yaml
# argocd-repo-secret-ssh.yaml
# Stores SSH credentials for private repository access
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-ssh
  namespace: argocd
  labels:
    # Required label for ArgoCD to recognize this as a repository secret
    argocd.argoproj.io/secret-type: repository
stringData:
  # Repository type - must be "git"
  type: git
  # Repository URL using SSH format
  url: git@github.com:myorg/private-repo.git
  # Private SSH key (the entire key content including headers)
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
    QyNTUxOQAAACBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    -----END OPENSSH PRIVATE KEY-----
```

Apply the secret to your cluster with kubectl.

```bash
kubectl apply -f argocd-repo-secret-ssh.yaml
```

### Add Repository via CLI

Alternatively, use the ArgoCD CLI to add the repository. The CLI handles secret creation automatically.

```bash
# Add repository using SSH key file
argocd repo add git@github.com:myorg/private-repo.git \
  --ssh-private-key-path ~/.ssh/argocd-deploy-key \
  --name private-repo

# Verify the repository was added successfully
argocd repo list
```

## Method 2: HTTPS with Personal Access Token

HTTPS authentication uses username and token credentials. While simpler to set up, tokens often have broader permissions than deploy keys.

### Create a Personal Access Token

For GitHub, create a fine-grained token with minimal permissions.

```mermaid
flowchart LR
    subgraph "Token Permissions"
        Read[Contents: Read]
        Meta[Metadata: Read]
    end

    Token[Personal Access Token] --> Read
    Token --> Meta

    Read --> Repo[Private Repository]
    Meta --> Repo
```

Required GitHub permissions:
- **Contents**: Read (to clone and pull)
- **Metadata**: Read (required for API access)

### Configure ArgoCD with HTTPS

Create a secret with your username and token. Never commit tokens to Git - always use sealed secrets or external secret management in production.

```yaml
# argocd-repo-secret-https.yaml
# Stores HTTPS credentials for private repository access
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-https
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  # HTTPS URL format
  url: https://github.com/myorg/private-repo.git
  # GitHub username or "x-access-token" for tokens
  username: your-username
  # Personal access token or app token
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Apply the credentials to your ArgoCD namespace.

```bash
kubectl apply -f argocd-repo-secret-https.yaml
```

### Add via CLI with Token

The CLI provides a convenient way to add HTTPS repositories interactively.

```bash
# Add repository with HTTPS credentials
argocd repo add https://github.com/myorg/private-repo.git \
  --username your-username \
  --password ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --name private-repo-https

# List all configured repositories
argocd repo list
```

## Method 3: GitHub App Authentication

GitHub Apps provide the most granular permissions and better audit trails. Apps can be installed on specific repositories and generate short-lived tokens.

```mermaid
flowchart TB
    subgraph "GitHub App Flow"
        App[GitHub App]
        Install[App Installation]
        Token[Installation Token]
    end

    subgraph "ArgoCD"
        Config[App Configuration]
        Controller[ArgoCD Controller]
    end

    App -->|Installed on| Install
    Install -->|Generates| Token
    Config -->|App ID + Private Key| Controller
    Controller -->|Requests| Token
    Token -->|Authenticates| Repo[Private Repository]
```

### Create a GitHub App

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Create a new app with these permissions:
   - Repository permissions: Contents (Read)
   - Repository permissions: Metadata (Read)
3. Generate and download a private key
4. Install the app on your repositories

### Configure ArgoCD with GitHub App

Store the GitHub App credentials in a Kubernetes secret. The app ID and installation ID are integers found in your GitHub App settings.

```yaml
# argocd-repo-secret-github-app.yaml
# Uses GitHub App for fine-grained repository access
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/private-repo.git
  # GitHub App ID from app settings page
  githubAppID: "123456"
  # Installation ID from the app installation URL
  githubAppInstallationID: "12345678"
  # Private key downloaded when creating the app
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA2Z3qX2BTLS4e...
    -----END RSA PRIVATE KEY-----
```

Apply and verify the configuration.

```bash
kubectl apply -f argocd-repo-secret-github-app.yaml

# Check that ArgoCD can connect to the repository
argocd repo list
```

## Method 4: Credential Templates

Credential templates apply authentication to multiple repositories matching a URL pattern. Perfect for organizations with many private repos under the same owner.

```mermaid
flowchart TB
    Template[Credential Template<br/>https://github.com/myorg/*]

    Repo1[myorg/app-frontend]
    Repo2[myorg/app-backend]
    Repo3[myorg/app-shared]
    Repo4[myorg/infrastructure]

    Template --> Repo1
    Template --> Repo2
    Template --> Repo3
    Template --> Repo4
```

### Create a Credential Template

Define a template that matches all repositories under your organization. Use wildcards in the URL to match multiple repositories.

```yaml
# argocd-cred-template.yaml
# Credential template for all repositories under myorg
apiVersion: v1
kind: Secret
metadata:
  name: myorg-creds
  namespace: argocd
  labels:
    # Note: "repo-creds" not "repository" for templates
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  # URL pattern with wildcard - matches any repo under myorg
  url: https://github.com/myorg
  username: x-access-token
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Apply the credential template.

```bash
kubectl apply -f argocd-cred-template.yaml
```

### SSH Credential Template

SSH-based credential templates work the same way. All repositories matching the pattern will use the configured SSH key.

```yaml
# argocd-cred-template-ssh.yaml
# SSH credential template for GitLab group
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-group-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  # Matches all repos in the mygroup namespace
  url: git@gitlab.com:mygroup
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

## GitLab Configuration

GitLab uses similar patterns but with different URL formats and token types.

### GitLab Deploy Token

Deploy tokens in GitLab are scoped to specific repositories or groups. Create one in Settings > Repository > Deploy tokens.

```yaml
# argocd-gitlab-deploy-token.yaml
# GitLab deploy token configuration
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://gitlab.com/mygroup/private-repo.git
  # Deploy token username (auto-generated by GitLab)
  username: gitlab+deploy-token-12345
  # Deploy token password
  password: gldt-xxxxxxxxxxxxxxxxxxxx
```

### GitLab Group Access Token

For multiple repositories in a group, use a group access token with credential templates.

```yaml
# argocd-gitlab-group-creds.yaml
# Credential template for entire GitLab group
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-group-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.com/mygroup
  username: oauth2
  # Group access token with read_repository scope
  password: glpat-xxxxxxxxxxxxxxxxxxxx
```

## Bitbucket Configuration

Bitbucket supports both app passwords and repository access keys.

### Bitbucket App Password

Create an app password in Personal settings > App passwords with repository read permission.

```yaml
# argocd-bitbucket-secret.yaml
# Bitbucket app password configuration
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://bitbucket.org/myworkspace/private-repo.git
  # Bitbucket username
  username: your-username
  # App password (not your account password)
  password: xxxxxxxxxxxxxxxxxxxx
```

## Self-Hosted Git Servers

Private Git servers require additional configuration for TLS certificates and custom URLs.

### Configure Custom TLS Certificate

When your Git server uses a self-signed certificate or private CA, provide the certificate to ArgoCD.

```yaml
# argocd-self-hosted-repo.yaml
# Self-hosted Git server with custom CA
apiVersion: v1
kind: Secret
metadata:
  name: internal-git-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://git.internal.company.com/team/repo.git
  username: service-account
  password: xxxxxxxxxxxx
  # Skip TLS verification (not recommended for production)
  # insecure: "true"
  # Or provide CA certificate (recommended)
  tlsClientCertData: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAJC1...
    -----END CERTIFICATE-----
  tlsClientCertKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEowIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

### Configure Known Hosts for SSH

For SSH connections to non-standard hosts, add the host key to ArgoCD's known hosts.

```bash
# Get the SSH host key from your server
ssh-keyscan -t ed25519 git.internal.company.com

# Add to ArgoCD's known hosts ConfigMap
kubectl edit configmap argocd-ssh-known-hosts-cm -n argocd
```

Update the ConfigMap with your server's host key.

```yaml
# argocd-ssh-known-hosts-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    # GitHub
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    # GitLab
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
    # Your internal server
    git.internal.company.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIYourServerKeyHere
```

## Creating Applications from Private Repos

Once credentials are configured, create applications normally. ArgoCD automatically matches repository URLs to configured credentials.

```yaml
# application.yaml
# Application using private repository
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-private-app
  namespace: argocd
spec:
  project: default
  source:
    # URL must match a configured repository or credential template
    repoURL: git@github.com:myorg/private-repo.git
    targetRevision: HEAD
    path: kubernetes/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Troubleshooting

### Repository Connection Failed

Verify credentials and network connectivity with these commands.

```bash
# Check repository status in ArgoCD
argocd repo list

# Get detailed error message
argocd repo get git@github.com:myorg/private-repo.git

# Test SSH connectivity manually
ssh -T git@github.com -i ~/.ssh/argocd-deploy-key

# Check ArgoCD repo server logs for errors
kubectl logs -n argocd deployment/argocd-repo-server | grep -i error
```

### Permission Denied Errors

SSH permission errors usually indicate key or known hosts issues.

```bash
# Verify the key format is correct
ssh-keygen -l -f ~/.ssh/argocd-deploy-key

# Check if the public key matches what's in GitHub
ssh-keygen -y -f ~/.ssh/argocd-deploy-key

# Ensure known hosts includes the Git provider
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml
```

### Certificate Errors

HTTPS certificate errors require CA configuration.

```bash
# Test HTTPS connectivity
curl -v https://git.internal.company.com/

# Check if insecure flag is needed (temporary testing only)
argocd repo add https://git.internal.company.com/repo.git \
  --username user \
  --password pass \
  --insecure-skip-server-verification
```

### Refresh Repository Credentials

Force ArgoCD to reload credentials after updates.

```bash
# Refresh a specific application
argocd app get my-app --refresh

# Hard refresh clears cache
argocd app get my-app --hard-refresh

# Restart repo server to reload all credentials
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

## Security Best Practices

```mermaid
flowchart TB
    subgraph "Best Practices"
        Rotate[Rotate Keys Regularly]
        Minimal[Minimal Permissions]
        Audit[Audit Access Logs]
        Encrypt[Encrypt Secrets]
    end

    subgraph "Tools"
        Sealed[Sealed Secrets]
        ESO[External Secrets Operator]
        Vault[HashiCorp Vault]
    end

    Rotate --> Schedule[90-day rotation]
    Minimal --> ReadOnly[Read-only access]
    Audit --> Logs[Git provider audit logs]
    Encrypt --> Sealed
    Encrypt --> ESO
    Encrypt --> Vault
```

### Use External Secret Management

Store credentials in a secret manager rather than raw Kubernetes secrets.

```yaml
# external-secret.yaml
# Pull credentials from Vault using External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: argocd-repo-creds
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: private-repo-creds
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: git
        url: git@github.com:myorg/private-repo.git
        sshPrivateKey: "{{ .sshKey }}"
  data:
    - secretKey: sshKey
      remoteRef:
        key: secret/argocd/repo-keys
        property: private-key
```

### Rotate Credentials Automatically

Set up a CronJob to rotate deploy keys periodically.

```yaml
# key-rotation-cronjob.yaml
# Rotates SSH keys every 90 days
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-argocd-keys
  namespace: argocd
spec:
  # Run at midnight on the 1st of every 3rd month
  schedule: "0 0 1 */3 *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: key-rotator
          containers:
            - name: rotator
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Generate new key
                  ssh-keygen -t ed25519 -f /tmp/new-key -N ""
                  # Update secret with new key
                  kubectl create secret generic private-repo-ssh \
                    --from-file=sshPrivateKey=/tmp/new-key \
                    --dry-run=client -o yaml | kubectl apply -f -
                  # Restart repo server
                  kubectl rollout restart deployment/argocd-repo-server
          restartPolicy: OnFailure
```

---

Configuring ArgoCD with private repositories requires choosing the right authentication method for your security requirements. Start with SSH deploy keys for simplicity, then consider GitHub Apps for better audit trails. Always use external secret management in production and rotate credentials regularly.
