# How to Use SCM Provider Generator for GitLab in ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSets, GitLab

Description: Learn how to use the ArgoCD ApplicationSet SCM provider generator with GitLab to automatically discover repositories in groups and create applications for each one.

---

The SCM provider generator for GitLab automatically discovers repositories within GitLab groups and creates ArgoCD Applications for each one. This means when a team creates a new repository that follows your naming conventions, ArgoCD picks it up and starts deploying it without anyone manually creating an Application resource. This guide walks through configuring the GitLab SCM provider generator from scratch.

## How the GitLab SCM Provider Generator Works

The generator queries the GitLab API to list repositories in a specified group (and optionally subgroups). For each discovered repository, it produces parameters like the repository URL, default branch, and repository name. These parameters feed into the ApplicationSet template to create Applications.

```mermaid
graph LR
    A[GitLab Group] --> B[SCM Provider Generator]
    B --> C[Repo: frontend-app]
    B --> D[Repo: backend-api]
    B --> E[Repo: payment-service]
    C --> F[Application: frontend-app]
    D --> G[Application: backend-api]
    E --> H[Application: payment-service]
```

## Prerequisites

You need:
- A GitLab personal access token or group access token with `read_api` scope
- The GitLab group ID where your repositories live
- ArgoCD v2.5 or later (earlier versions had limited SCM provider support)

### Creating a GitLab Access Token

Create a personal access token (or group access token for better security):

1. Go to GitLab Settings > Access Tokens
2. Create a token with `read_api` scope
3. Store the token in a Kubernetes secret:

```bash
kubectl create secret generic gitlab-token \
  -n argocd \
  --from-literal=token=glpat-xxxxxxxxxxxxxxxxxxxx
```

## Basic GitLab SCM Provider Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: gitlab-repos
  namespace: argocd
spec:
  generators:
    - scmProvider:
        gitlab:
          # GitLab group name or path
          group: "my-company/microservices"
          # Include subgroups
          includeSubgroups: true
          # Use self-hosted GitLab (omit for gitlab.com)
          api: https://gitlab.company.com/
          # Token reference
          tokenRef:
            secretName: gitlab-token
            key: token
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

## Available Parameters

The GitLab SCM provider generator produces these parameters for each repository:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `repository` | Repository name | `api-gateway` |
| `organization` | GitLab group path | `my-company/microservices` |
| `url` | Full clone URL (HTTPS) | `https://gitlab.com/my-company/microservices/api-gateway.git` |
| `branch` | Default branch | `main` |
| `sha` | HEAD commit SHA | `abc1234` |
| `short_sha` | Short HEAD commit SHA | `abc1234` |
| `labels` | Repository topics/labels | `production,backend` |

## Filtering Repositories

### Filter by Topic (Label)

GitLab repositories can have topics. Use them to filter:

```yaml
  generators:
    - scmProvider:
        gitlab:
          group: "my-company/microservices"
          includeSubgroups: true
          api: https://gitlab.company.com/
          tokenRef:
            secretName: gitlab-token
            key: token
        filters:
          - repositoryMatch: ".*"
            labelMatch: "argocd-managed"
```

Only repositories with the `argocd-managed` topic will generate Applications.

### Filter by Repository Name

Use regex to match repository names:

```yaml
  generators:
    - scmProvider:
        gitlab:
          group: "my-company"
          includeSubgroups: true
          api: https://gitlab.company.com/
          tokenRef:
            secretName: gitlab-token
            key: token
        filters:
          - repositoryMatch: "^service-.*"
```

This only matches repositories whose names start with `service-`.

### Filter by Branch

Only generate Applications for repositories that have a specific branch:

```yaml
  generators:
    - scmProvider:
        gitlab:
          group: "my-company/microservices"
          includeSubgroups: true
          api: https://gitlab.company.com/
          tokenRef:
            secretName: gitlab-token
            key: token
        filters:
          - branchMatch: "main"
```

### Combining Filters

```yaml
        filters:
          - repositoryMatch: "^service-.*"
            labelMatch: "production"
            branchMatch: "main"
```

All conditions in a single filter entry must match (AND logic). Multiple filter entries use OR logic:

```yaml
        filters:
          # Match production services
          - repositoryMatch: "^service-.*"
            labelMatch: "production"
          # OR match any repo with the 'deploy' topic
          - labelMatch: "deploy"
```

## Self-Hosted GitLab Configuration

For self-hosted GitLab instances, set the API URL and handle TLS:

```yaml
  generators:
    - scmProvider:
        gitlab:
          group: "platform-team"
          api: https://gitlab.internal.company.com/
          includeSubgroups: true
          tokenRef:
            secretName: gitlab-token
            key: token
          # Skip TLS verification for self-signed certs (not recommended for production)
          insecure: false
```

If your GitLab uses a self-signed certificate, add the CA certificate to ArgoCD:

```bash
# Add custom CA to ArgoCD
kubectl create configmap argocd-tls-certs-cm \
  -n argocd \
  --from-file=gitlab.internal.company.com=/path/to/ca-cert.pem
```

## Complete Example with Helm Applications

Deploy Helm-based applications from GitLab repositories that follow a convention of having a `charts/` directory:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: gitlab-helm-apps
  namespace: argocd
spec:
  generators:
    - scmProvider:
        gitlab:
          group: "my-company/services"
          includeSubgroups: true
          api: https://gitlab.company.com/
          tokenRef:
            secretName: gitlab-token
            key: token
        filters:
          - labelMatch: "helm-managed"
            branchMatch: "main"
  template:
    metadata:
      name: '{{repository}}'
      labels:
        managed-by: applicationset
        source: gitlab
      annotations:
        notifications.argoproj.io/subscribe.on-sync-failed.slack: deployments
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: charts/
        helm:
          valueFiles:
            - values.yaml
            - values-production.yaml
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

## Subgroup Mapping

When using `includeSubgroups: true`, the `organization` parameter includes the full group path. Use this for routing:

```yaml
  goTemplate: true
  template:
    metadata:
      name: '{{ .repository }}'
      labels:
        # Extract team name from subgroup path
        team: '{{ index (splitList "/" .organization) (sub (len (splitList "/" .organization)) 1) }}'
```

For a simpler approach, use the repository name directly and maintain a naming convention like `team-service-name`.

## Handling Large GitLab Groups

For groups with hundreds of repositories, be aware of:

**API rate limits**: GitLab enforces rate limits on API calls. The SCM provider generator makes one or more API calls per reconciliation. If you hit limits:

```yaml
# Increase ApplicationSet controller reconciliation period
kubectl patch deployment argocd-applicationset-controller -n argocd --type json -p '[
  {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--argocd-repo-server-plaintext"}
]'
```

**Use group access tokens instead of personal tokens**: Group tokens have separate rate limits and are not affected by the user's other API activity.

**Filter aggressively**: The more specific your filters, the fewer Applications are generated and the less API pressure on GitLab.

## Debugging GitLab SCM Provider Issues

```bash
# Check ApplicationSet controller logs
kubectl logs -n argocd -l app.kubernetes.io/component=applicationset-controller | \
  grep -i "gitlab\|scm\|error"

# Verify the token has the right permissions
curl --header "PRIVATE-TOKEN: $(kubectl get secret gitlab-token -n argocd -o jsonpath='{.data.token}' | base64 -d)" \
  "https://gitlab.company.com/api/v4/groups/my-company%2Fmicroservices/projects"

# Check if the group ID/path is correct
curl --header "PRIVATE-TOKEN: YOUR_TOKEN" \
  "https://gitlab.company.com/api/v4/groups?search=microservices"
```

Common issues:
- **Token lacks `read_api` scope**: The generator needs at minimum `read_api` to list repositories
- **Wrong group path**: Use the URL-encoded group path (replace `/` with `%2F` in API calls)
- **Subgroups not included**: Set `includeSubgroups: true` explicitly
- **Self-hosted GitLab TLS errors**: Add the CA certificate or set `insecure: true` for testing

## Repository Credential Configuration

The generated Applications need Git credentials to pull from GitLab. Configure repository credentials in ArgoCD:

```bash
# Add GitLab credentials using credential template
argocd repocreds add https://gitlab.company.com/ \
  --username git \
  --password glpat-xxxxxxxxxxxxxxxxxxxx
```

Or declaratively:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://gitlab.company.com/
  username: git
  password: glpat-xxxxxxxxxxxxxxxxxxxx
```

This credential template matches all repositories under `gitlab.company.com/`, so every generated Application can clone its repository.

The GitLab SCM provider generator is the best way to scale ArgoCD across a GitLab organization. Teams get automatic deployment pipelines just by creating repositories in the right group with the right topics. For GitHub integration, see the [SCM provider generator for GitHub](https://oneuptime.com/blog/post/2026-01-30-argocd-scm-provider-generator/view).
