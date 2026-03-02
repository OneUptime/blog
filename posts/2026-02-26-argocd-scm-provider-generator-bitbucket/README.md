# How to Use SCM Provider Generator for Bitbucket in ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet, Bitbucket

Description: Learn how to configure the ArgoCD ApplicationSet SCM provider generator for Bitbucket Server and Bitbucket Cloud to automatically discover repositories and create applications.

---

The SCM provider generator for Bitbucket lets ArgoCD automatically discover repositories in your Bitbucket projects and create Applications for each one. This works with both Bitbucket Cloud (bitbucket.org) and Bitbucket Server (self-hosted). When teams create new repositories following your conventions, ArgoCD picks them up automatically without manual Application creation.

## Bitbucket Cloud vs Bitbucket Server

ArgoCD supports two distinct Bitbucket configurations because the APIs are completely different:

- **Bitbucket Cloud** (bitbucket.org) - uses the `bitbucket` configuration with workspace-based access
- **Bitbucket Server** (self-hosted, formerly Stash) - uses the `bitbucketServer` configuration with project-based access

Make sure you use the right configuration block for your Bitbucket variant.

## Bitbucket Cloud Configuration

### Prerequisites

For Bitbucket Cloud, you need:
- A Bitbucket workspace
- An app password with `repository:read` permission
- The username associated with the app password

Create an app password:
1. Go to Bitbucket Settings > Personal settings > App passwords
2. Create a new app password with `Repositories: Read` permission

Store the credentials in a Kubernetes secret:

```bash
kubectl create secret generic bitbucket-creds \
  -n argocd \
  --from-literal=username=your-username \
  --from-literal=password=your-app-password
```

### Basic Bitbucket Cloud ApplicationSet

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: bitbucket-cloud-apps
  namespace: argocd
spec:
  generators:
    - scmProvider:
        bitbucket:
          # Your Bitbucket workspace name
          owner: my-workspace
          # Credentials
          user: your-username
          appPasswordRef:
            secretName: bitbucket-creds
            key: password
          # Only scan repos matching this pattern
          allBranches: false
        filters:
          - repositoryMatch: "^service-.*"
  template:
    metadata:
      name: '{{repository}}'
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: 'deploy/k8s'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{repository}}'
```

### Available Parameters for Bitbucket Cloud

| Parameter | Description | Example |
|-----------|-------------|---------|
| `repository` | Repository slug | `service-api` |
| `organization` | Workspace name | `my-workspace` |
| `url` | Clone URL | `https://bitbucket.org/my-workspace/service-api.git` |
| `branch` | Default branch | `main` |
| `sha` | HEAD commit SHA | `abc1234...` |

## Bitbucket Server Configuration

### Prerequisites

For Bitbucket Server, you need:
- The API URL for your Bitbucket Server instance
- A personal access token with project read permissions
- The project key where your repositories live

Create a personal access token:
1. Go to your Bitbucket Server profile > Personal access tokens
2. Create a token with `Project read` and `Repository read` permissions

Store the token:

```bash
kubectl create secret generic bitbucket-server-token \
  -n argocd \
  --from-literal=token=your-personal-access-token
```

### Basic Bitbucket Server ApplicationSet

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: bitbucket-server-apps
  namespace: argocd
spec:
  generators:
    - scmProvider:
        bitbucketServer:
          # Your Bitbucket Server API URL
          api: https://bitbucket.company.com
          # Project key
          project: PLATFORM
          # Authentication
          basicAuth:
            username: argocd-service
            passwordRef:
              secretName: bitbucket-server-token
              key: token
          # Include all repos in the project
          allBranches: false
  template:
    metadata:
      name: '{{repository}}'
      labels:
        project: '{{organization}}'
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: 'kubernetes/'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{repository}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

### Available Parameters for Bitbucket Server

| Parameter | Description | Example |
|-----------|-------------|---------|
| `repository` | Repository slug | `api-gateway` |
| `organization` | Project key | `PLATFORM` |
| `url` | Clone URL (HTTPS) | `https://bitbucket.company.com/scm/PLATFORM/api-gateway.git` |
| `branch` | Default branch | `main` |
| `sha` | HEAD commit SHA | `abc1234...` |

## Filtering Repositories

### Filter by Repository Name

```yaml
  generators:
    - scmProvider:
        bitbucketServer:
          api: https://bitbucket.company.com
          project: PLATFORM
          basicAuth:
            username: argocd-service
            passwordRef:
              secretName: bitbucket-server-token
              key: token
        filters:
          # Only repos starting with 'svc-'
          - repositoryMatch: "^svc-.*"
```

### Filter by Branch

```yaml
        filters:
          # Only repos that have a 'main' branch
          - branchMatch: "main"
```

### Combine Filters

```yaml
        filters:
          # Repos matching name AND branch (AND logic within a filter)
          - repositoryMatch: "^svc-.*"
            branchMatch: "main"
          # OR repos matching this pattern (OR logic between filters)
          - repositoryMatch: "^infra-.*"
            branchMatch: "main"
```

## Handling TLS for Self-Hosted Bitbucket Server

If your Bitbucket Server uses a self-signed certificate:

```bash
# Add the CA certificate to ArgoCD
kubectl create configmap argocd-tls-certs-cm \
  -n argocd \
  --from-file=bitbucket.company.com=/path/to/ca-cert.pem
```

Or if you need to skip TLS verification temporarily (not recommended for production):

```yaml
  generators:
    - scmProvider:
        bitbucketServer:
          api: https://bitbucket.company.com
          project: PLATFORM
          basicAuth:
            username: argocd-service
            passwordRef:
              secretName: bitbucket-server-token
              key: token
          insecure: true
```

## Multi-Project Setup

Scan multiple Bitbucket Server projects by using multiple generators:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-projects
  namespace: argocd
spec:
  generators:
    # Backend team's project
    - scmProvider:
        bitbucketServer:
          api: https://bitbucket.company.com
          project: BACKEND
          basicAuth:
            username: argocd-service
            passwordRef:
              secretName: bitbucket-server-token
              key: token
        filters:
          - repositoryMatch: ".*"
    # Frontend team's project
    - scmProvider:
        bitbucketServer:
          api: https://bitbucket.company.com
          project: FRONTEND
          basicAuth:
            username: argocd-service
            passwordRef:
              secretName: bitbucket-server-token
              key: token
        filters:
          - repositoryMatch: ".*"
  template:
    metadata:
      name: '{{organization}}-{{repository}}'
      labels:
        team: '{{organization}}'
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: 'deploy/'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{repository}}'
```

Prefixing the Application name with `{{organization}}` (the project key) prevents name collisions if both projects have a repo with the same name.

## Repository Credentials for Generated Applications

The generated Applications need credentials to clone from Bitbucket. Set up credential templates:

### For Bitbucket Cloud

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-cloud-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://bitbucket.org/my-workspace/
  username: your-username
  password: your-app-password
```

### For Bitbucket Server

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-server-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://bitbucket.company.com/
  username: argocd-service
  password: your-access-token
```

The credential template URL prefix must match the clone URLs that the SCM provider generator produces.

## Complete Production Example

Here is a full setup for a Bitbucket Server organization:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-services
  namespace: argocd
spec:
  generators:
    - scmProvider:
        bitbucketServer:
          api: https://bitbucket.company.com
          project: PLATFORM
          basicAuth:
            username: argocd-service
            passwordRef:
              secretName: bitbucket-server-token
              key: token
        filters:
          - repositoryMatch: "^svc-.*"
            branchMatch: "main"
  template:
    metadata:
      name: '{{repository}}'
      labels:
        managed-by: applicationset
        project: platform
      annotations:
        notifications.argoproj.io/subscribe.on-sync-failed.slack: platform-alerts
        notifications.argoproj.io/subscribe.on-deployed.slack: platform-deployments
    spec:
      project: platform
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: 'deploy/k8s'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{repository}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - PruneLast=true
```

## Debugging Bitbucket SCM Provider Issues

```bash
# Check ApplicationSet controller logs
kubectl logs -n argocd -l app.kubernetes.io/component=applicationset-controller | \
  grep -i "bitbucket\|scm\|error"

# Test Bitbucket Server API connectivity
# Replace with your actual values
curl -u "argocd-service:$(kubectl get secret bitbucket-server-token -n argocd -o jsonpath='{.data.token}' | base64 -d)" \
  "https://bitbucket.company.com/rest/api/1.0/projects/PLATFORM/repos?limit=100"

# Test Bitbucket Cloud API
curl -u "username:app-password" \
  "https://api.bitbucket.org/2.0/repositories/my-workspace?pagelen=100"
```

Common issues:
- **Wrong API URL for Bitbucket Server**: The API URL should not include `/rest/api/1.0/` - ArgoCD appends that automatically
- **Token permissions**: Ensure the token has project and repository read access
- **Using Cloud config for Server**: `bitbucket` is for Cloud, `bitbucketServer` is for self-hosted. Using the wrong one produces cryptic errors
- **Repository clone URL mismatch**: Make sure your repo credential template URL matches the clone URLs produced by the generator

The Bitbucket SCM provider generator is the fastest path to GitOps adoption for Bitbucket-based organizations. For GitLab integration, see the [SCM provider generator for GitLab](https://oneuptime.com/blog/post/2026-02-26-argocd-scm-provider-generator-gitlab/view). For GitHub, see the [SCM provider generator for GitHub](https://oneuptime.com/blog/post/2026-01-30-argocd-scm-provider-generator/view).
