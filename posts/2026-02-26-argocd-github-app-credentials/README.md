# How to Add a Private Git Repository Using GitHub App Credentials in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub, Authentication

Description: Learn how to configure ArgoCD to access private Git repositories using GitHub App credentials for secure, scoped, and auditable authentication.

---

GitHub App credentials offer a superior alternative to personal access tokens and deploy keys when connecting ArgoCD to private repositories. They provide fine-grained permissions, automatic token rotation, and better audit trails. If you are running ArgoCD in a production environment with GitHub, this is the authentication method you should be using.

## Why GitHub Apps Over Personal Access Tokens

Personal access tokens (PATs) are tied to individual user accounts. If that user leaves the organization or their token gets compromised, every system depending on it breaks. GitHub Apps, on the other hand, are organization-level entities. They have scoped permissions, generate short-lived tokens, and their access is visible in the organization's installed apps list.

Here is a comparison of authentication methods:

```mermaid
graph LR
    A[PAT] -->|Tied to user| B[User leaves = broken]
    C[Deploy Key] -->|Per repo| D[Hard to scale]
    E[GitHub App] -->|Org-level| F[Scoped + Auditable]
    E -->|Auto-rotation| G[Short-lived tokens]
```

## Step 1: Create a GitHub App

Navigate to your GitHub organization settings, then Developer settings, then GitHub Apps. Click "New GitHub App" and configure it:

- **GitHub App name**: Something descriptive like `argocd-gitops-production`
- **Homepage URL**: Your ArgoCD server URL
- **Webhook**: Uncheck "Active" (ArgoCD handles its own polling)
- **Permissions**:
  - Repository permissions:
    - Contents: Read-only
    - Metadata: Read-only
  - Organization permissions: None needed
- **Where can this GitHub App be installed**: Only on this account

Click "Create GitHub App". Note the App ID shown on the next page - you will need it.

## Step 2: Generate a Private Key

On the GitHub App settings page, scroll down to the "Private keys" section and click "Generate a private key". Your browser will download a PEM file. Keep this file secure.

```bash
# The downloaded file will look something like this
ls ~/Downloads/argocd-gitops-production.2026-02-26.private-key.pem
```

## Step 3: Install the GitHub App

Still on the GitHub App settings page, click "Install App" in the left sidebar. Choose your organization and select which repositories ArgoCD should have access to. You can grant access to all repositories or select specific ones.

After installation, note the Installation ID from the URL. It will be in the URL bar as something like `https://github.com/settings/installations/12345678`. That number at the end is your Installation ID.

## Step 4: Configure ArgoCD with GitHub App Credentials

Now you need to provide ArgoCD with three pieces of information: the App ID, the Installation ID, and the private key.

### Using the CLI

```bash
# Add the repository using GitHub App credentials
argocd repo add https://github.com/your-org/your-private-repo.git \
  --github-app-id 123456 \
  --github-app-installation-id 12345678 \
  --github-app-private-key-path ~/Downloads/argocd-gitops-production.2026-02-26.private-key.pem
```

### Using a Declarative Secret

For a GitOps approach, create a Kubernetes Secret:

```yaml
# github-app-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/your-org/your-private-repo.git
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA... (your full private key here)
    -----END RSA PRIVATE KEY-----
```

Apply it:

```bash
kubectl apply -f github-app-repo-secret.yaml
```

### Using SealedSecrets for Production

In production, you should not store private keys in plain-text YAML files. Use SealedSecrets or an external secrets manager:

```bash
# Create the secret normally, then seal it
kubectl create secret generic private-repo-github-app \
  --namespace argocd \
  --from-literal=type=git \
  --from-literal=url=https://github.com/your-org/your-private-repo.git \
  --from-literal=githubAppID=123456 \
  --from-literal=githubAppInstallationID=12345678 \
  --from-file=githubAppPrivateKey=~/Downloads/argocd-gitops-production.2026-02-26.private-key.pem \
  --dry-run=client -o yaml | kubeseal --format yaml > sealed-github-app-repo.yaml
```

## Step 5: Using Credential Templates for Multiple Repos

If your GitHub App has access to multiple repositories in the same organization, you can use a credential template instead of registering each repository individually:

```yaml
# github-app-credential-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/your-org
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

Notice the label uses `repo-creds` instead of `repository`, and the URL is the organization prefix without a specific repo path. Now any application pointing to a repository under `https://github.com/your-org/` will automatically use these credentials.

```bash
kubectl apply -f github-app-credential-template.yaml
```

## Step 6: Verify the Connection

After configuring the credentials, verify ArgoCD can access the repository:

```bash
# List repositories and check status
argocd repo list

# You should see something like:
# TYPE  NAME  REPO                                            INSECURE  OCI    LFS    CREDS  STATUS      MESSAGE
# git         https://github.com/your-org/your-private-repo   false     false  false  true   Successful
```

The `CREDS` column should show `true`, confirming that ArgoCD is using credentials to access this repository.

## How GitHub App Authentication Works in ArgoCD

Understanding the flow helps with troubleshooting:

```mermaid
sequenceDiagram
    participant ArgoCD as ArgoCD Repo Server
    participant GitHub as GitHub API
    participant Repo as Git Repository

    ArgoCD->>GitHub: POST /app/installations/{id}/access_tokens
    Note over ArgoCD,GitHub: Signs JWT with private key
    GitHub-->>ArgoCD: Returns installation access token (valid 1hr)
    ArgoCD->>Repo: Clone/fetch using token
    Repo-->>ArgoCD: Repository contents
    Note over ArgoCD: Token cached until expiry
```

ArgoCD uses the private key to sign a JWT, exchanges it for a short-lived installation access token from GitHub's API, and uses that token to authenticate Git operations. Tokens expire after one hour and ArgoCD handles renewal automatically.

## Troubleshooting Common Issues

### "Could not refresh installation id" Error

This usually means the Installation ID is wrong or the app has been uninstalled:

```bash
# Verify the installation exists
# Check in GitHub: Organization Settings > Installed GitHub Apps

# Re-check the installation ID from the URL
# https://github.com/organizations/your-org/settings/installations/INSTALLATION_ID
```

### "Could not generate token" Error

This typically indicates a problem with the private key:

```bash
# Verify the private key format
openssl rsa -in private-key.pem -check

# Make sure the key matches the app
# Regenerate the key in GitHub App settings if needed
```

### Repository Not Showing as Accessible

If the repository is not accessible even though credentials are configured:

```bash
# Check the ArgoCD repo-server logs
kubectl logs -n argocd deployment/argocd-repo-server | grep "github"

# Verify the app has access to the specific repo
# GitHub > Organization Settings > Installed GitHub Apps > Configure > Repository access
```

## GitHub Enterprise Server Support

For GitHub Enterprise Server (self-hosted), you need to specify the API endpoint:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghe-repo-github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.example.com/your-org/your-repo.git
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppEnterpriseBaseUrl: "https://github.example.com/api/v3"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

The `githubAppEnterpriseBaseUrl` field tells ArgoCD where to make API calls for token generation.

## Security Best Practices

First, grant the minimum required permissions. ArgoCD only needs read access to repository contents. Second, scope the app installation to only the repositories ArgoCD needs. Third, rotate the private key periodically by generating a new one in GitHub App settings and updating the ArgoCD Secret. Fourth, monitor the GitHub App's activity in the organization's audit log. Fifth, use separate GitHub Apps for different environments - one for production, one for staging.

GitHub App authentication is the recommended way to connect ArgoCD to GitHub repositories. For more on managing repository credentials across your ArgoCD setup, see [repository credential templates](https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view).
