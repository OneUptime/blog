# How to Use Repository Credential Templates in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Credentials

Description: Learn how to use repository credential templates in ArgoCD to automatically apply authentication to multiple repositories without configuring each one individually.

---

Managing Git credentials for dozens or hundreds of repositories in ArgoCD gets tedious quickly. Repository credential templates solve this problem by letting you define credentials once for a URL prefix, and ArgoCD automatically applies those credentials to any repository that matches the prefix. This is how teams at scale manage repository access.

## How Credential Templates Work

Credential templates use URL prefix matching. When ArgoCD needs to access a repository, it checks if any credential template's URL is a prefix of the repository URL. If a match is found, ArgoCD uses those credentials. If no template matches, ArgoCD falls back to any repository-specific credentials or attempts unauthenticated access.

```mermaid
flowchart TD
    A[ArgoCD needs repo access] --> B{Specific repo creds exist?}
    B -->|Yes| C[Use specific credentials]
    B -->|No| D{Credential template matches URL prefix?}
    D -->|Yes| E[Use template credentials]
    D -->|No| F[Unauthenticated access]
```

The key distinction is that credential templates use the label `argocd.argoproj.io/secret-type: repo-creds` while individual repository secrets use `argocd.argoproj.io/secret-type: repository`.

## Creating a Credential Template with HTTPS

The most common setup is an HTTPS credential template for an entire Git organization:

```yaml
# github-org-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  password: ghp_your_personal_access_token_here
  username: my-github-username
```

Apply the template:

```bash
kubectl apply -f github-org-cred-template.yaml
```

Now any ArgoCD Application pointing to a repository under `https://github.com/my-org/` will automatically use these credentials. You do not need to register each repository individually.

## Creating a Credential Template with SSH

For SSH-based access, provide the SSH private key:

```yaml
# github-ssh-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:my-org
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

This template will match any SSH repository URL starting with `git@github.com:my-org`.

## Creating a Credential Template with GitHub App

GitHub App credentials work well with templates since one app installation can access multiple repositories:

```yaml
# github-app-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

## Using the CLI to Create Credential Templates

You can also manage credential templates through the ArgoCD CLI:

```bash
# HTTPS credential template
argocd repocreds add https://github.com/my-org \
  --username my-username \
  --password ghp_your_token

# SSH credential template
argocd repocreds add git@github.com:my-org \
  --ssh-private-key-path ~/.ssh/argocd_key

# GitHub App credential template
argocd repocreds add https://github.com/my-org \
  --github-app-id 123456 \
  --github-app-installation-id 12345678 \
  --github-app-private-key-path /path/to/private-key.pem

# List all credential templates
argocd repocreds list

# Remove a credential template
argocd repocreds rm https://github.com/my-org
```

## URL Prefix Matching Rules

Understanding how prefix matching works is critical to avoiding credential conflicts:

```yaml
# Template 1: Matches all repos under my-org on GitHub
url: https://github.com/my-org

# Template 2: More specific - matches only repos under my-org/infra-*
url: https://github.com/my-org/infra-

# Template 3: Matches all repos on a self-hosted GitLab
url: https://gitlab.internal.company.com
```

When multiple templates match, ArgoCD uses the most specific match (longest prefix). So if you have templates for both `https://github.com/my-org` and `https://github.com/my-org/infra-`, a repository at `https://github.com/my-org/infra-configs.git` will use Template 2.

## Multi-Provider Setup

In enterprise environments, you often have repositories spread across multiple Git providers. Credential templates make this manageable:

```yaml
# GitHub organization
apiVersion: v1
kind: Secret
metadata:
  name: github-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  username: bot-user
  password: ghp_github_token
---
# GitLab self-hosted
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.company.com
  username: argocd-bot
  password: glpat-gitlab_token
---
# Bitbucket Server
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://bitbucket.company.com/scm
  username: argocd-service
  password: bitbucket_http_token
```

## Credential Template Priority Over Repository-Specific Creds

Repository-specific credentials always take priority over credential templates. This is useful when most repos use the same credentials but a few need different access:

```yaml
# Template: Covers most repos in the org
apiVersion: v1
kind: Secret
metadata:
  name: default-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  username: read-only-bot
  password: ghp_read_only_token
---
# Override: This specific repo needs a different token with write access
apiVersion: v1
kind: Secret
metadata:
  name: special-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/my-org/config-management.git
  username: admin-bot
  password: ghp_admin_token
```

## Automatic Repository Registration

One powerful feature of credential templates is that ArgoCD can automatically connect to repositories without explicitly registering them. When you create an Application pointing to a repository URL that matches a credential template, ArgoCD automatically uses the template credentials to access it. There is no need to run `argocd repo add` first.

This is particularly useful with ApplicationSets that dynamically generate applications across many repositories:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/my-org/app-registry.git
        revision: HEAD
        directories:
          - path: "apps/*"
  template:
    metadata:
      name: "{{path.basename}}"
    spec:
      project: default
      source:
        # Each app might be in a different repo - credential template handles auth
        repoURL: "https://github.com/my-org/{{path.basename}}.git"
        targetRevision: HEAD
        path: deploy
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}"
```

## Troubleshooting Credential Templates

### Template Not Being Applied

If your credential template is not being picked up:

```bash
# Verify the template exists
argocd repocreds list

# Check the label is correct
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repo-creds

# Verify the URL prefix matches
# The template URL must be a prefix of the repository URL
```

### Wrong Template Being Used

If the wrong credentials are being applied:

```bash
# Check for conflicting templates
argocd repocreds list

# Verify which template has the longest matching prefix
# More specific URL prefixes take priority
```

### Debugging in Repo Server Logs

```bash
# Check the repo-server logs for credential resolution
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "cred"
```

Credential templates are fundamental to scaling ArgoCD across an organization. Combined with tools like SealedSecrets or external secret managers, they provide a secure and maintainable way to manage repository access. For more on connecting ArgoCD to private repositories, see our guide on [private Git repositories](https://oneuptime.com/blog/post/2026-01-25-private-git-repositories-argocd/view).
