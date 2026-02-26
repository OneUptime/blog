# How to Use argocd repo Commands for Repository Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Repository Management

Description: A complete guide to argocd repo commands for adding, managing, and troubleshooting Git and Helm repository connections in ArgoCD.

---

ArgoCD needs access to your Git repositories and Helm chart repositories to fetch manifests and deploy applications. The `argocd repo` command family handles the full lifecycle of repository connections - adding repositories with various authentication methods, listing them, testing connections, and removing them when no longer needed.

## Listing Repositories

```bash
# List all configured repositories
argocd repo list

# Output:
# TYPE  NAME  REPO                                        INSECURE  OCI    LFS    CREDS  STATUS      MESSAGE
# git         https://github.com/my-org/manifests.git     false     false  false  false  Successful
# git         git@github.com:my-org/private-repo.git      false     false  false  true   Successful
# helm        https://charts.example.com                  false     false  false  true   Successful
```

The STATUS column is key - "Successful" means ArgoCD can connect. "Failed" means there is a connection problem.

## Adding a Public Git Repository

```bash
# Add a public repository (no credentials needed)
argocd repo add https://github.com/my-org/public-manifests.git
```

## Adding Private Git Repositories

### HTTPS with Username/Password

```bash
# Add with username and password
argocd repo add https://github.com/my-org/private-repo.git \
  --username myuser \
  --password mytoken
```

For GitHub, GitLab, and most Git providers, use a personal access token as the password:

```bash
# GitHub with personal access token
argocd repo add https://github.com/my-org/private-repo.git \
  --username oauth2 \
  --password ghp_xxxxxxxxxxxx

# GitLab with deploy token
argocd repo add https://gitlab.com/my-org/private-repo.git \
  --username deploy-token-user \
  --password gldt-xxxxxxxxxxxx
```

### SSH Key Authentication

```bash
# Add with SSH key
argocd repo add git@github.com:my-org/private-repo.git \
  --ssh-private-key-path ~/.ssh/id_ed25519

# Add with SSH key from a specific file
argocd repo add git@github.com:my-org/private-repo.git \
  --ssh-private-key-path /path/to/deploy-key
```

### GitHub App Authentication

```bash
# Add with GitHub App credentials
argocd repo add https://github.com/my-org/private-repo.git \
  --github-app-id 12345 \
  --github-app-installation-id 67890 \
  --github-app-private-key-path /path/to/private-key.pem
```

For GitHub Enterprise:

```bash
argocd repo add https://github.mycompany.com/my-org/repo.git \
  --github-app-id 12345 \
  --github-app-installation-id 67890 \
  --github-app-private-key-path /path/to/private-key.pem \
  --github-app-enterprise-base-url https://github.mycompany.com/api/v3
```

### Google Cloud Source Repositories

```bash
argocd repo add https://source.developers.google.com/p/my-project/r/my-repo \
  --username oauth2 \
  --password "$(gcloud auth print-access-token)"
```

### Azure DevOps Repos

```bash
argocd repo add https://dev.azure.com/my-org/my-project/_git/my-repo \
  --username oauth2 \
  --password <personal-access-token>
```

## Adding Helm Repositories

### Public Helm Repository

```bash
# Add a public Helm repository
argocd repo add https://charts.bitnami.com/bitnami \
  --type helm \
  --name bitnami
```

### Private Helm Repository

```bash
# Add with basic auth
argocd repo add https://charts.mycompany.com \
  --type helm \
  --name internal \
  --username admin \
  --password secret123

# Add with TLS client certificates
argocd repo add https://charts.mycompany.com \
  --type helm \
  --name internal \
  --tls-client-cert-path /path/to/cert.pem \
  --tls-client-key-path /path/to/key.pem
```

### OCI Helm Registry

```bash
# Add an OCI registry for Helm charts
argocd repo add registry.example.com \
  --type helm \
  --name my-oci-registry \
  --enable-oci \
  --username admin \
  --password secret123
```

## Repository Credential Templates

Instead of adding credentials per-repository, you can create templates that match multiple repositories:

```bash
# Create a credential template for all repos under an org
argocd repocreds add https://github.com/my-org/ \
  --username oauth2 \
  --password ghp_xxxxxxxxxxxx

# Now any repository under https://github.com/my-org/ will use these creds
argocd repo add https://github.com/my-org/repo1.git
argocd repo add https://github.com/my-org/repo2.git
# Both automatically use the template credentials
```

### SSH Credential Template

```bash
# Create SSH credential template
argocd repocreds add git@github.com:my-org/ \
  --ssh-private-key-path ~/.ssh/id_ed25519
```

### Listing Credential Templates

```bash
argocd repocreds list
```

### Removing Credential Templates

```bash
argocd repocreds rm https://github.com/my-org/
```

## Testing Repository Connection

After adding a repository, verify the connection:

```bash
# The add command itself tests the connection
# If it succeeds, the repository is accessible

# Check the status of all repositories
argocd repo list

# For a specific repository, check its status
argocd repo get https://github.com/my-org/manifests.git
```

## Removing a Repository

```bash
# Remove a repository
argocd repo rm https://github.com/my-org/old-repo.git
```

Note: You cannot remove a repository that is actively used by applications. Remove or update the applications first.

## TLS Configuration

### Insecure (Skip TLS Verification)

```bash
# Skip TLS verification (not recommended for production)
argocd repo add https://self-signed-git.example.com/repo.git \
  --insecure-skip-server-verification \
  --username admin \
  --password secret
```

### Custom CA Certificate

```bash
# Add repository with custom CA
argocd cert add-tls git.mycompany.com --from /path/to/ca-cert.pem

# Then add the repo (it will use the custom CA)
argocd repo add https://git.mycompany.com/repo.git \
  --username admin \
  --password secret
```

## Proxy Configuration

```bash
# Add repository through a proxy
argocd repo add https://github.com/my-org/repo.git \
  --proxy https://proxy.mycompany.com:8080
```

## Bulk Repository Setup

```bash
#!/bin/bash
# setup-repos.sh - Set up multiple repositories

GITHUB_TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN environment variable}"

# Create credential template for GitHub org
argocd repocreds add https://github.com/my-org/ \
  --username oauth2 \
  --password "$GITHUB_TOKEN"

# Add all team repositories
REPOS=(
  "https://github.com/my-org/backend-manifests.git"
  "https://github.com/my-org/frontend-manifests.git"
  "https://github.com/my-org/infrastructure.git"
  "https://github.com/my-org/shared-charts.git"
)

for repo in "${REPOS[@]}"; do
  echo "Adding repository: $repo"
  argocd repo add "$repo" 2>/dev/null && echo "  Success" || echo "  Already exists or error"
done

# Add Helm repositories
echo "Adding Helm repositories..."
argocd repo add https://charts.bitnami.com/bitnami --type helm --name bitnami
argocd repo add https://prometheus-community.github.io/helm-charts --type helm --name prometheus
argocd repo add https://grafana.github.io/helm-charts --type helm --name grafana

echo ""
echo "Repository setup complete:"
argocd repo list
```

## Troubleshooting Repository Issues

### Connection Failed

```bash
# Check repo status
argocd repo list

# Look for error messages
argocd repo get https://github.com/my-org/repo.git

# Check repo server logs
kubectl logs deployment/argocd-repo-server -n argocd | tail -50
```

### Authentication Failed

```bash
# Test credentials manually
git clone https://github.com/my-org/repo.git /tmp/test-clone
# If this fails, the credentials are wrong

# For SSH:
ssh -T git@github.com
# Should show your authentication status

# Re-add with correct credentials
argocd repo rm https://github.com/my-org/repo.git
argocd repo add https://github.com/my-org/repo.git \
  --username oauth2 \
  --password <correct-token>
```

### SSH Host Key Issues

```bash
# List known SSH hosts
argocd cert list --cert-type ssh

# Add a host key
ssh-keyscan github.com | argocd cert add-ssh --batch

# For custom Git servers
ssh-keyscan git.mycompany.com | argocd cert add-ssh --batch
```

### Credential Rotation

```bash
#!/bin/bash
# rotate-creds.sh - Rotate repository credentials

REPO_URL="${1:?Usage: rotate-creds.sh <repo-url> <new-token>}"
NEW_TOKEN="${2:?Usage: rotate-creds.sh <repo-url> <new-token>}"

echo "Rotating credentials for: $REPO_URL"

# Remove and re-add with new credentials
argocd repo rm "$REPO_URL"
argocd repo add "$REPO_URL" \
  --username oauth2 \
  --password "$NEW_TOKEN"

# Verify connection
STATUS=$(argocd repo list -o json | jq -r ".[] | select(.repo == \"$REPO_URL\") | .connectionState.status")
echo "Connection status: $STATUS"
```

## Repository Audit

```bash
#!/bin/bash
# audit-repos.sh - Audit repository connections

echo "=== Repository Audit ==="
echo ""

argocd repo list -o json | jq -r '.[] | "\(.type)\t\(.repo)\t\(.connectionState.status)\t\(.connectionState.message // "OK")"' | \
  column -t -s $'\t' -N "TYPE,REPOSITORY,STATUS,MESSAGE"

echo ""
echo "Failed Connections:"
argocd repo list -o json | jq -r '.[] | select(.connectionState.status != "Successful") | "  \(.repo): \(.connectionState.message)"'
```

## Summary

The `argocd repo` command family handles all repository management for ArgoCD. Start with credential templates for organization-wide access, add individual repositories as needed, and use `argocd repo list` to monitor connection health. For production environments, use SSH keys or GitHub App credentials instead of personal access tokens, and implement credential rotation scripts to maintain security. Always test connections after adding repositories and monitor the STATUS column for early warning of authentication issues.
