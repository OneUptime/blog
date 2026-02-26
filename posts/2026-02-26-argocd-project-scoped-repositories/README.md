# How to Use Project Scoped Repositories in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Multi-Tenancy

Description: Learn how to configure project-scoped repositories in ArgoCD to provide per-project repository credentials, keeping team credentials isolated and following the principle of least privilege.

---

By default, ArgoCD repository credentials are global - any project can use any configured repository. This creates two problems in multi-tenant environments: teams can see each other's repository credentials, and repository access is not scoped to the teams that need it. Project-scoped repositories solve this by associating repository credentials with specific projects.

This guide covers how to configure and use project-scoped repositories for proper multi-tenant credential isolation.

## The Problem with Global Repositories

In a standard ArgoCD setup, repositories are added globally:

```bash
argocd repo add https://github.com/my-org/payments.git \
  --username deploy-bot \
  --password ghp_secret_token
```

This credential is stored in a Secret in the `argocd` namespace and is available to all projects. That means:

- Any project's application can reference this repository
- Users in any project can see that this repository is configured
- A compromise in one project could expose another project's repository credentials

## How Project-Scoped Repositories Work

Project-scoped repositories are repository credentials that are associated with a specific ArgoCD project. Only applications within that project can use the credentials.

```mermaid
flowchart TD
    subgraph "Global Repositories"
        GR1[public-charts repo]
    end

    subgraph "Project: Payments"
        PR1[payments repo credentials]
        PA1[payments-api app]
        PA2[payments-worker app]
    end

    subgraph "Project: Frontend"
        FR1[frontend repo credentials]
        FA1[frontend-web app]
    end

    GR1 --> PA1
    GR1 --> PA2
    GR1 --> FA1

    PR1 --> PA1
    PR1 --> PA2

    FR1 --> FA1
```

## Enabling Project-Scoped Repositories

Project-scoped repositories are created by adding the `project` field to the repository Secret.

### Using Kubernetes Secrets

```yaml
# project-scoped-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: payments-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: "https://github.com/my-org/payments-service.git"
  username: "payments-deploy-bot"
  password: "ghp_payments_specific_token"
  # This is the key field - scopes the repo to the payments project
  project: "payments"
```

```bash
kubectl apply -f project-scoped-repo.yaml
```

### Using the ArgoCD CLI

```bash
# Add a project-scoped repository
argocd repo add https://github.com/my-org/payments-service.git \
  --username payments-deploy-bot \
  --password ghp_payments_specific_token \
  --project payments
```

## Configuring Multiple Teams

Here is a complete example with three teams, each with their own scoped repository credentials:

### Payments Team Repositories

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payments-git-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: "https://github.com/my-org/payments-service.git"
  username: "payments-bot"
  password: "ghp_payments_token"
  project: "payments"
---
apiVersion: v1
kind: Secret
metadata:
  name: payments-config-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: "https://github.com/my-org/payments-config.git"
  username: "payments-bot"
  password: "ghp_payments_token"
  project: "payments"
```

### Frontend Team Repositories

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: frontend-git-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: "https://github.com/my-org/frontend-app.git"
  username: "frontend-bot"
  password: "ghp_frontend_token"
  project: "frontend"
```

### Shared Repositories (Global)

Some repositories should be accessible to all projects, like shared Helm chart repositories:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: shared-helm-charts
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  url: "https://charts.bitnami.com/bitnami"
  name: "bitnami"
  # No 'project' field = global repository
```

## Project-Scoped Repository Credential Templates

Similar to global credential templates, you can create project-scoped credential templates that automatically apply to any matching URL:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payments-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: "https://github.com/my-org/payments-"
  username: "payments-bot"
  password: "ghp_payments_token"
  project: "payments"
```

With this template, any application in the `payments` project that references a repository matching `https://github.com/my-org/payments-*` will automatically use these credentials.

## Using SSH Keys with Project-Scoped Repos

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payments-ssh-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: "git@github.com:my-org/payments-service.git"
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmU...
    -----END OPENSSH PRIVATE KEY-----
  project: "payments"
```

## Using OCI Registries with Project Scope

For OCI-based Helm charts:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payments-oci-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  url: "ghcr.io/my-org/payments-charts"
  enableOCI: "true"
  username: "payments-bot"
  password: "ghp_payments_token"
  project: "payments"
```

## Interaction with sourceRepos

Project-scoped repositories work alongside the project's `sourceRepos` restriction. Both must allow the repository:

1. The repository must have credentials configured (either global or project-scoped)
2. The repository URL must be in the project's `sourceRepos` allow list

```yaml
# AppProject
spec:
  sourceRepos:
    - "https://github.com/my-org/payments-*"

# Repository credential (must match a sourceRepos pattern)
stringData:
  url: "https://github.com/my-org/payments-service.git"
  project: "payments"
```

## Credential Precedence

When multiple credentials could match a repository URL, ArgoCD uses this precedence:

1. Project-scoped repository credentials (exact URL match)
2. Project-scoped repository credential templates (pattern match)
3. Global repository credentials (exact URL match)
4. Global repository credential templates (pattern match)

This means project-scoped credentials always take priority over global ones for applications in that project.

## Managing with External Secrets

For production environments, integrate with External Secrets Operator to manage repository credentials:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-repo-creds
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: payments-git-repo
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: git
        url: "https://github.com/my-org/payments-service.git"
        username: "payments-bot"
        password: "{{ .password }}"
        project: "payments"
  data:
    - secretKey: password
      remoteRef:
        key: argocd/payments-repo
        property: token
```

## Verifying Configuration

### List Repositories and Their Project Scope

```bash
# List all repositories
argocd repo list

# Look for the PROJECT column
# Global repos show "-" and project-scoped repos show the project name
```

### Test Repository Access

```bash
# Verify connectivity from ArgoCD
argocd repo get https://github.com/my-org/payments-service.git
```

### Check That Scoping Works

Create an application in a different project and verify it cannot use the scoped credentials:

```bash
# This should fail if the frontend project does not have its own credentials
# for the payments repository
argocd app create test-access \
  --project frontend \
  --repo https://github.com/my-org/payments-service.git \
  --path k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace frontend-dev
```

## Troubleshooting

**Repository not found for project**: Ensure the Secret has the correct `project` field and the `argocd.argoproj.io/secret-type: repository` label:

```bash
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository \
  -o custom-columns=NAME:.metadata.name,PROJECT:.data.project
```

**Application can access repo from wrong project**: Check if there is also a global credential for the same URL that is not project-scoped. Global credentials are accessible from any project.

**Credential template not matching**: Verify the URL pattern in the credential template matches the repository URLs your applications use. The template URL is a prefix match, not a glob pattern.

## Summary

Project-scoped repositories isolate repository credentials between teams in a multi-tenant ArgoCD setup. Each team gets its own credentials that only work within their project, preventing cross-team credential leakage. Use credential templates for teams with many repositories sharing the same authentication, and integrate with External Secrets Operator for production credential management. Remember that both the project's `sourceRepos` and the scoped credentials must align for applications to access a repository.
