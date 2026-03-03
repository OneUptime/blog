# How to Use Custom Labels for ArgoCD Application Filtering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Labels, Application Management

Description: Learn how to use custom labels on ArgoCD Applications to organize, filter, and manage applications at scale using the CLI and UI.

---

As your ArgoCD installation grows from a handful of applications to hundreds or thousands, finding and managing specific applications becomes a real challenge. Custom labels on ArgoCD Application resources are the primary mechanism for organizing, filtering, and grouping applications. This guide covers how to design a labeling strategy and use it effectively in the CLI and UI.

## Why Custom Labels Matter

ArgoCD Application resources are Kubernetes custom resources, which means they support the full Kubernetes labeling system. Labels enable:

- Filtering applications in the UI by team, environment, or tier
- Selecting applications for batch operations via the CLI
- Organizing dashboards and monitoring by application category
- Implementing RBAC policies based on application labels
- Grouping applications for notification subscriptions

## Designing a Label Schema

Before adding labels, design a consistent schema. Here is a practical labeling strategy that works for most organizations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
  labels:
    # Team ownership
    team: payments
    # Deployment environment
    environment: production
    # Service tier (critical, standard, internal)
    tier: critical
    # Application type
    app-type: microservice
    # Business domain
    domain: commerce
    # Region (if multi-region)
    region: us-east-1
spec:
  project: production
  source:
    repoURL: https://github.com/my-org/payment-service.git
    targetRevision: main
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
```

### Label Naming Conventions

Follow Kubernetes label conventions:

- Keys must be 63 characters or fewer
- Values must be 63 characters or fewer
- Use lowercase letters, numbers, hyphens, underscores, and dots
- Prefix custom labels with your organization domain for clarity (optional but recommended for large orgs)

```yaml
labels:
  # Simple labels for small teams
  team: backend
  env: staging

  # Prefixed labels for large organizations
  mycompany.com/team: backend
  mycompany.com/cost-center: eng-42
  mycompany.com/compliance: pci
```

## Filtering Applications in the CLI

The `argocd app list` command supports label selectors just like `kubectl`:

```bash
# List all production applications
argocd app list -l environment=production

# List all critical-tier applications
argocd app list -l tier=critical

# List applications owned by the payments team
argocd app list -l team=payments

# Combine selectors with AND logic
argocd app list -l team=payments,environment=production

# Use set-based selectors
argocd app list -l 'environment in (staging, production)'
argocd app list -l 'tier notin (internal)'

# Check for label existence
argocd app list -l 'team'
argocd app list -l '!deprecated'
```

### Formatted Output with Labels

Combine label filtering with output formatting:

```bash
# Get names only for scripting
argocd app list -l environment=production -o name

# Get wide output with more details
argocd app list -l team=payments -o wide

# JSON output for programmatic processing
argocd app list -l tier=critical -o json
```

## Filtering Applications in the UI

The ArgoCD web UI has a built-in filter panel that supports label-based filtering:

1. Open the Applications page in the ArgoCD UI
2. Click the "Filter" icon in the top toolbar
3. In the Labels section, enter your label selector
4. The UI filters in real time as you type

The UI filter supports the same selector syntax as the CLI:

```text
environment=production
team=payments,tier=critical
environment in (staging,production)
```

You can also click on labels displayed on application cards to quickly filter by that label value.

## Batch Operations with Labels

Labels make batch operations practical and safe:

```bash
# Sync all staging applications for a team
for app in $(argocd app list -l team=backend,environment=staging -o name); do
  argocd app sync "$app"
done

# Refresh all production applications
for app in $(argocd app list -l environment=production -o name); do
  argocd app get "$app" --refresh
done

# Check health of all critical applications
argocd app list -l tier=critical -o json | jq '.[] | {name: .metadata.name, health: .status.health.status, sync: .status.sync.status}'
```

## Using Labels in ApplicationSets

When generating applications with ApplicationSets, labels can be templated from generator parameters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/my-org/app-configs.git
        revision: HEAD
        files:
          - path: "services/*/config.json"
  template:
    metadata:
      name: '{{service.name}}-{{environment}}'
      labels:
        team: '{{service.team}}'
        environment: '{{environment}}'
        tier: '{{service.tier}}'
        domain: '{{service.domain}}'
        app-type: microservice
        managed-by: applicationset
    spec:
      project: '{{environment}}'
      source:
        repoURL: '{{service.repoURL}}'
        targetRevision: '{{service.branch}}'
        path: 'k8s/{{environment}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{service.namespace}}'
```

With a config file like:

```json
{
  "service": {
    "name": "user-api",
    "team": "identity",
    "tier": "critical",
    "domain": "platform",
    "repoURL": "https://github.com/my-org/user-api.git",
    "branch": "main",
    "namespace": "identity"
  },
  "environment": "production"
}
```

This automatically generates labeled applications that are immediately filterable.

## Labels for RBAC Policies

You can reference labels in RBAC policies to create flexible access controls:

```csv
# argocd-rbac-cm - Grant teams access based on labels
# Note: RBAC policies use project/application patterns, not labels directly.
# Use projects to group applications, then combine with labels for filtering.

p, role:backend-team, applications, get, backend-project/*, allow
p, role:backend-team, applications, sync, backend-project/*, allow
```

While ArgoCD RBAC does not directly support label selectors in policies, the combination of projects and labels gives you layered access control: projects for authorization, labels for discoverability.

## Labels for Notification Subscriptions

ArgoCD Notifications can use label selectors for subscription targeting:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  labels:
    team: payments
    tier: critical
  annotations:
    # Subscribe based on labels/team
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: payments-deploys
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: payments-oncall
```

You can also use default triggers that apply based on labels in the notification configuration.

## Practical Label Strategy by Organization Size

### Small Team (10-50 applications)

```yaml
labels:
  env: production    # production, staging, dev
  team: backend      # frontend, backend, platform
  type: app          # app, infra, monitoring
```

### Medium Organization (50-500 applications)

```yaml
labels:
  environment: production
  team: payments
  tier: critical           # critical, standard, internal
  domain: commerce         # commerce, platform, data
  app-type: microservice   # microservice, cronjob, worker
```

### Large Enterprise (500+ applications)

```yaml
labels:
  mycompany.com/environment: production
  mycompany.com/team: payments
  mycompany.com/tier: critical
  mycompany.com/domain: commerce
  mycompany.com/cost-center: eng-42
  mycompany.com/compliance: pci-dss
  mycompany.com/region: us-east-1
  mycompany.com/managed-by: applicationset
  mycompany.com/sla: platinum
```

## Querying Labels with kubectl

Since ArgoCD Applications are Kubernetes resources, you can also use kubectl for advanced queries:

```bash
# List all applications with specific labels
kubectl get applications -n argocd -l environment=production

# Get a count of applications per team
kubectl get applications -n argocd -o jsonpath='{range .items[*]}{.metadata.labels.team}{"\n"}{end}' | sort | uniq -c | sort -rn

# Find applications missing a required label
kubectl get applications -n argocd -o json | jq '.items[] | select(.metadata.labels.team == null) | .metadata.name'

# List applications with their label sets
kubectl get applications -n argocd --show-labels
```

## Maintaining Label Consistency

To prevent label drift, enforce labels at the ApplicationSet or app-of-apps level:

```yaml
# Validation webhook or CI check
# Ensure every Application has required labels
required_labels:
  - team
  - environment
  - tier

# OPA/Gatekeeper constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: app-must-have-labels
spec:
  match:
    kinds:
      - apiGroups: ["argoproj.io"]
        kinds: ["Application"]
  parameters:
    labels:
      - key: team
      - key: environment
      - key: tier
```

## Summary

Custom labels transform ArgoCD from a flat list of applications into an organized, filterable system. Define a consistent labeling schema early, use ApplicationSets to apply labels automatically, and leverage label selectors in the CLI and UI for day-to-day operations. As your deployment count grows, well-designed labels become one of the most valuable pieces of your ArgoCD setup.
