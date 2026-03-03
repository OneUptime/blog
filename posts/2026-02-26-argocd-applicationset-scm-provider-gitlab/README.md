# How to Use SCM Provider Generator for GitLab

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet, GitLab

Description: Learn how to use the ArgoCD ApplicationSet SCM Provider generator for GitLab to automatically discover projects in groups and create Kubernetes applications from your GitLab organization structure.

---

If your organization uses GitLab for source code management, the ArgoCD ApplicationSet SCM Provider generator for GitLab lets you automatically discover projects within GitLab groups and create ArgoCD Applications for each one. No more manually adding Application manifests every time a team creates a new microservice repository.

This guide walks through configuring the GitLab SCM Provider generator, authentication setup, filtering strategies, and production deployment patterns.

## How the GitLab SCM Provider Works

The generator queries the GitLab API to list projects within a group (and optionally its subgroups). For each matching project, it produces a parameter set with repository metadata. The ApplicationSet template then uses those parameters to create Application resources.

```mermaid
graph TD
    A[SCM Provider Generator] --> B[GitLab API]
    B --> C[Group: myorg/services]
    C --> D[api-gateway project]
    C --> E[user-service project]
    C --> F[payment-service project]
    D --> G[Application: api-gateway]
    E --> H[Application: user-service]
    F --> I[Application: payment-service]
```

## Setting Up GitLab Authentication

Create a GitLab personal access token or group access token with the `read_api` scope. Store it as a Kubernetes secret.

```bash
# Create a GitLab token with 'read_api' scope
# Navigate to: GitLab > Settings > Access Tokens

# Store the token in Kubernetes
kubectl create secret generic gitlab-token -n argocd \
  --from-literal=token=glpat-your-gitlab-token-here
```

For self-hosted GitLab instances, you will also need to specify the API URL.

## Basic GitLab SCM Provider Generator

Discover all projects within a GitLab group and deploy them.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: gitlab-services
  namespace: argocd
spec:
  generators:
  - scmProvider:
      gitlab:
        # GitLab group path
        group: "myorg/services"
        # Authentication token
        tokenRef:
          secretName: gitlab-token
          key: token
        # Include subgroups
        includeSubgroups: true
        # For self-hosted GitLab
        # api: https://gitlab.mycompany.com/
      filters:
      # Only deploy projects matching the pattern
      - repositoryMatch: "^svc-.*"
  template:
    metadata:
      name: '{{repository}}'
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: deploy/
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

## Available Template Parameters

The GitLab SCM Provider generates these parameters for each discovered project:

- `organization` - the GitLab group path
- `repository` - the project name
- `url` - the clone URL
- `branch` - the default branch
- `sha` - the latest commit SHA on the default branch
- `labels` - GitLab project topics as comma-separated string

```yaml
template:
  metadata:
    name: '{{repository}}'
    annotations:
      gitlab-group: '{{organization}}'
      commit-sha: '{{sha}}'
  spec:
    source:
      repoURL: '{{url}}'
      targetRevision: '{{branch}}'
```

## Self-Hosted GitLab Configuration

For organizations running their own GitLab instance, specify the API endpoint.

```yaml
generators:
- scmProvider:
    gitlab:
      group: "platform-team/microservices"
      # Point to your self-hosted GitLab API
      api: https://gitlab.internal.mycompany.com/
      tokenRef:
        secretName: gitlab-token
        key: token
      includeSubgroups: true
    filters:
    - repositoryMatch: ".*"
```

Make sure the ArgoCD ApplicationSet controller can reach your GitLab instance. If it is behind a VPN or firewall, configure network policies accordingly.

## Filtering by Topics

GitLab project topics (similar to GitHub topics) allow fine-grained filtering.

```yaml
generators:
- scmProvider:
    gitlab:
      group: "myorg"
      tokenRef:
        secretName: gitlab-token
        key: token
      includeSubgroups: true
    filters:
    # Only projects with the 'kubernetes' topic
    - labelMatch: "kubernetes"
    # Exclude infrastructure repos
    - repositoryMatch: "^(?!infra-).*"
```

Add topics to your GitLab projects.

```bash
# Using GitLab API to add topics to a project
curl --request PUT \
  --header "PRIVATE-TOKEN: glpat-your-token" \
  "https://gitlab.com/api/v4/projects/12345" \
  --data '{"topics": ["kubernetes", "production", "microservice"]}'
```

## Including Subgroups

GitLab organizations often use nested groups to organize projects by team or domain.

```text
myorg/
├── frontend/
│   ├── web-portal
│   └── admin-dashboard
├── backend/
│   ├── api-gateway
│   ├── user-service
│   └── payment-service
└── infrastructure/
    ├── terraform-modules
    └── helm-charts
```

The `includeSubgroups` option recursively scans all nested groups.

```yaml
generators:
- scmProvider:
    gitlab:
      group: "myorg"
      tokenRef:
        secretName: gitlab-token
        key: token
      # Scan all subgroups
      includeSubgroups: true
    filters:
    # Include only backend and frontend services
    - repositoryMatch: ".*"
      pathsExist:
      - deploy/kustomization.yaml
```

## Filtering by Path Existence

A powerful filter is `pathsExist`, which only includes repositories that contain specific files. This ensures you only create Applications for repos that actually have Kubernetes manifests.

```yaml
generators:
- scmProvider:
    gitlab:
      group: "myorg"
      tokenRef:
        secretName: gitlab-token
        key: token
      includeSubgroups: true
    filters:
    - repositoryMatch: ".*"
      pathsExist:
      # Only repos with a deploy directory
      - deploy/kustomization.yaml
      # OR repos with Helm charts
      - charts/Chart.yaml
```

## Combining with Cluster Generator

Deploy every discovered GitLab project to multiple clusters using the Matrix generator.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: gitlab-multi-cluster
  namespace: argocd
spec:
  generators:
  - matrix:
      generators:
      - scmProvider:
          gitlab:
            group: "myorg/services"
            tokenRef:
              secretName: gitlab-token
              key: token
          filters:
          - labelMatch: "production"
            pathsExist:
            - deploy/
      - clusters:
          selector:
            matchLabels:
              tier: production
  template:
    metadata:
      name: '{{repository}}-{{name}}'
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: '{{branch}}'
        path: deploy/
      destination:
        server: '{{server}}'
        namespace: '{{repository}}'
```

## Handling GitLab API Rate Limits

GitLab has API rate limits that can affect the SCM Provider generator, especially for large organizations.

```bash
# Check your current rate limit status
curl --head --header "PRIVATE-TOKEN: glpat-your-token" \
  "https://gitlab.com/api/v4/groups/myorg/projects"
# Look for: RateLimit-Remaining header
```

Adjust the reconciliation interval to reduce API pressure.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: "300"  # 5 minutes instead of default 3
```

## Monitoring and Debugging

Track the GitLab SCM Provider generator's behavior.

```bash
# View ApplicationSet controller logs
kubectl logs -n argocd deployment/argocd-applicationset-controller \
  | grep -i "gitlab\|scm\|provider"

# Check ApplicationSet status
kubectl describe applicationset gitlab-services -n argocd

# List generated Applications
kubectl get applications -n argocd \
  -o custom-columns=NAME:.metadata.name,REPO:.spec.source.repoURL,STATUS:.status.sync.status
```

The GitLab SCM Provider generator is essential for GitLab-based organizations practicing GitOps at scale. It closes the gap between creating a new project in GitLab and having it deployed by ArgoCD, making your deployment pipeline fully automated from repository creation to production.
