# How to Fix 'authentication required' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Authentication

Description: Resolve the ArgoCD authentication required error for Git repositories by configuring HTTPS credentials, SSH keys, deploy tokens, and GitHub App authentication properly.

---

The "authentication required" error in ArgoCD appears when the repo server tries to access a Git repository but the server rejects the connection because no valid credentials were provided. This error is specifically about Git authentication - not about ArgoCD user login.

The error typically looks like:

```text
rpc error: code = Unknown desc = authentication required for
https://github.com/org/private-repo
```

Or when trying to create or refresh an application:

```text
Unable to create application: authentication required
```

This guide walks through every scenario that causes this error and the corresponding fix.

## Why This Happens

ArgoCD stores repository credentials separately from application definitions. When you create an application that points to a Git repo, ArgoCD looks up the credentials for that repo URL in its credential store. If no matching credentials are found, or if the credentials are invalid, you get the "authentication required" error.

```mermaid
graph TD
    A[Application Created] -->|source: repo URL| B{Credentials Lookup}
    B -->|Found valid creds| C[Git Clone Success]
    B -->|No creds found| D[authentication required]
    B -->|Invalid/expired creds| D
```

## Fix 1: Add Repository Credentials

The simplest fix - the repository credentials were never added to ArgoCD.

**Using the CLI:**

```bash
# For HTTPS with username/password (or token)
argocd repo add https://github.com/org/private-repo \
  --username your-username \
  --password your-token

# For SSH
argocd repo add git@github.com:org/private-repo.git \
  --ssh-private-key-path ~/.ssh/id_ed25519
```

**Using the ArgoCD UI:**

1. Go to Settings (gear icon) in the left sidebar
2. Click "Repositories"
3. Click "Connect Repo"
4. Fill in the URL and credentials
5. Click "Connect"

**Using a Kubernetes Secret (declarative):**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/org/private-repo
  username: x-access-token
  password: ghp_xxxxxxxxxxxxxxxxxxxx
```

Apply the Secret:

```bash
kubectl apply -f repo-secret.yaml
```

## Fix 2: Update Expired Credentials

Tokens and passwords expire. This is the second most common cause.

**Check when your credentials were last updated:**

```bash
# List repos and their connection status
argocd repo list

# Get details for a specific repo
argocd repo get https://github.com/org/private-repo
```

**Update credentials:**

```bash
# The --upsert flag updates existing credentials
argocd repo add https://github.com/org/private-repo \
  --username x-access-token \
  --password ghp_new_token_here \
  --upsert
```

**If using Secrets, update the password field:**

```bash
# Encode the new token
echo -n "ghp_new_token_here" | base64

# Patch the secret
kubectl patch secret my-repo-creds -n argocd \
  -p '{"stringData":{"password":"ghp_new_token_here"}}'
```

## Fix 3: Configure Credential Templates

If you have many repositories under the same organization, use credential templates instead of per-repo credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/org
  username: x-access-token
  password: ghp_xxxxxxxxxxxxxxxxxxxx
```

This template will match any repository URL that starts with `https://github.com/org`. Note the label is `repo-creds` (not `repository`) for templates.

**Using the CLI:**

```bash
argocd repocreds add https://github.com/org \
  --username x-access-token \
  --password ghp_xxxxxxxxxxxxxxxxxxxx
```

## Fix 4: GitHub-Specific Authentication

**Personal Access Token (PAT):**

For GitHub, generate a PAT with the `repo` scope:

1. Go to GitHub Settings > Developer Settings > Personal Access Tokens
2. Generate a new token with `repo` scope (for private repos)
3. Use the token as the password:

```bash
argocd repo add https://github.com/org/repo \
  --username x-access-token \
  --password ghp_your_pat_here
```

**GitHub App:**

For organizations, GitHub Apps provide better security and granular permissions:

```bash
argocd repo add https://github.com/org/repo \
  --github-app-id 12345 \
  --github-app-installation-id 67890 \
  --github-app-private-key-path /path/to/private-key.pem
```

Declaratively:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/org/repo
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

## Fix 5: GitLab-Specific Authentication

**Deploy Token:**

```bash
argocd repo add https://gitlab.com/org/repo \
  --username deploy-token-user \
  --password gldt-xxxxxxxxxxxxxxxxxxxx
```

**Project Access Token:**

```bash
argocd repo add https://gitlab.com/org/repo \
  --username project-token-user \
  --password glpat-xxxxxxxxxxxxxxxxxxxx
```

**Self-hosted GitLab with custom CA:**

```bash
argocd repo add https://gitlab.internal.com/org/repo \
  --username deploy-user \
  --password token \
  --insecure-skip-server-verification
```

## Fix 6: Azure DevOps Authentication

```bash
# Use a PAT for Azure DevOps
argocd repo add https://dev.azure.com/org/project/_git/repo \
  --username anything \
  --password your-azure-pat
```

Note: For Azure DevOps, the username can be any non-empty string.

## Fix 7: SSH Key Issues

If using SSH authentication:

**Wrong key format:**

```bash
# Generate an ed25519 key (recommended)
ssh-keygen -t ed25519 -f ~/.ssh/argocd_deploy_key -N ""

# Add the public key to your Git provider as a deploy key
cat ~/.ssh/argocd_deploy_key.pub

# Add the private key to ArgoCD
argocd repo add git@github.com:org/repo.git \
  --ssh-private-key-path ~/.ssh/argocd_deploy_key
```

**Passphrase-protected keys:**

ArgoCD does not support passphrase-protected SSH keys. Generate a key without a passphrase:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/argocd_key -N ""
```

**Deploy key vs user key:**

Deploy keys give access to a single repository. If you need access to multiple repos, either:
- Add separate deploy keys for each repo
- Use a machine user with SSH key access to all repos
- Use credential templates with HTTPS authentication

## Fix 8: Bitbucket Server Authentication

```bash
# App Password authentication
argocd repo add https://bitbucket.org/org/repo \
  --username your-username \
  --password app-password-here

# For Bitbucket Server (self-hosted)
argocd repo add https://bitbucket.internal.com/scm/project/repo.git \
  --username service-account \
  --password http-access-token
```

## Verifying the Fix

After adding or updating credentials:

```bash
# Check repository connection status
argocd repo list

# The STATUS column should show "Successful"
# TYPE    NAME  REPO                                    STATUS      MESSAGE
# git           https://github.com/org/private-repo     Successful

# If the application was stuck, refresh it
argocd app get my-app --refresh
```

## Common Mistakes

1. **Using HTTPS URL with SSH credentials (or vice versa)**: The URL scheme must match the credential type
2. **Forgetting to URL-encode special characters in passwords**: If your token contains special characters, they need to be URL-encoded when used in some contexts
3. **Using an expired token**: Check token expiration dates
4. **Wrong scope on the token**: GitHub PATs need the `repo` scope for private repositories
5. **Credential template URL too specific or too broad**: The template URL must be a prefix of the repo URL
6. **Repository was public, now private**: An application that worked before will break when the repo visibility changes

## Summary

The "authentication required" error means ArgoCD cannot authenticate with your Git repository. Add or update credentials using `argocd repo add` with the `--upsert` flag, ensure the URL format matches between the application spec and the credential configuration, and verify tokens are not expired. For organizations with many repos, use credential templates to apply a single set of credentials to all repositories under a common URL prefix.
