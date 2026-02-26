# How to Apply Sync Windows to Specific Namespaces in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Windows, Namespaces

Description: Learn how to apply ArgoCD sync windows to specific Kubernetes namespaces, enabling different deployment schedules for different environments and teams sharing the same cluster.

---

When multiple environments or teams share the same Kubernetes cluster, you need different deployment restrictions for different namespaces. The production namespace needs tight maintenance windows while the staging namespace can deploy anytime. ArgoCD sync windows support namespace-based targeting through the `namespaces` field.

## Namespace Matching in Sync Windows

The `namespaces` field in a sync window matches against the destination namespace of ArgoCD applications.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: shared-cluster
  namespace: argocd
spec:
  destinations:
    - namespace: 'production'
      server: https://kubernetes.default.svc
    - namespace: 'staging'
      server: https://kubernetes.default.svc
    - namespace: 'development'
      server: https://kubernetes.default.svc
  syncWindows:
    # Production: strict maintenance window
    - kind: allow
      schedule: '0 2 * * *'
      duration: 4h
      applications:
        - '*'
      namespaces:
        - 'production'
      manualSync: true
      timeZone: 'UTC'

    # Staging: deploy during business hours only
    - kind: allow
      schedule: '0 8 * * 1-5'
      duration: 10h
      applications:
        - '*'
      namespaces:
        - 'staging'
      manualSync: true
      timeZone: 'UTC'

    # Development: no restrictions (24h window)
    - kind: allow
      schedule: '0 0 * * *'
      duration: 24h
      applications:
        - '*'
      namespaces:
        - 'development'
      manualSync: true
      timeZone: 'UTC'
```

Each namespace gets its own deployment schedule. Production has a 4-hour nightly window, staging can deploy during business hours, and development has no restrictions.

## Using Namespace Patterns

The `namespaces` field supports glob patterns for matching multiple namespaces.

```yaml
syncWindows:
  # Match all production namespaces
  - kind: deny
    schedule: '0 9 * * 1-5'
    duration: 8h
    applications:
      - '*'
    namespaces:
      - 'prod-*'
    manualSync: true

  # Match all staging namespaces
  - kind: allow
    schedule: '0 0 * * *'
    duration: 24h
    applications:
      - '*'
    namespaces:
      - 'staging-*'
    manualSync: true

  # Match team-specific namespaces
  - kind: allow
    schedule: '0 22 * * *'
    duration: 6h
    applications:
      - '*'
    namespaces:
      - 'team-alpha-*'
    manualSync: true
```

This works well when you use namespace naming conventions like `prod-payments`, `prod-auth`, `staging-payments`, etc.

## Environment-Based Namespace Restrictions

A common pattern uses three tiers of restrictions based on environment.

```yaml
syncWindows:
  # Tier 1: Production - strict nightly window
  - kind: allow
    schedule: '0 2 * * *'
    duration: 4h
    applications:
      - '*'
    namespaces:
      - 'production'
      - 'prod-*'
    manualSync: true
    timeZone: 'America/New_York'

  # Tier 1: Production - deny business hours
  - kind: deny
    schedule: '0 8 * * 1-5'
    duration: 10h
    applications:
      - '*'
    namespaces:
      - 'production'
      - 'prod-*'
    manualSync: true
    timeZone: 'America/New_York'

  # Tier 2: Staging - business hours only
  - kind: allow
    schedule: '0 6 * * 1-5'
    duration: 14h
    applications:
      - '*'
    namespaces:
      - 'staging'
      - 'stage-*'
    manualSync: true
    timeZone: 'America/New_York'

  # Tier 3: Dev/Test - no restrictions
  - kind: allow
    schedule: '0 0 * * *'
    duration: 24h
    applications:
      - '*'
    namespaces:
      - 'development'
      - 'dev-*'
      - 'test-*'
    manualSync: true
```

Staging deployments are restricted to business hours so that someone is always available to verify the changes. Development namespaces have no restrictions since they are non-critical.

## Team Namespace Isolation

When different teams have their own namespaces, assign team-specific deployment windows.

```yaml
syncWindows:
  # Backend team: deploys Tuesday and Thursday evenings
  - kind: allow
    schedule: '0 19 * * 2,4'
    duration: 5h
    applications:
      - '*'
    namespaces:
      - 'backend'
      - 'backend-*'
    manualSync: true
    timeZone: 'America/Chicago'

  # Frontend team: deploys Monday and Wednesday mornings
  - kind: allow
    schedule: '0 6 * * 1,3'
    duration: 4h
    applications:
      - '*'
    namespaces:
      - 'frontend'
      - 'frontend-*'
    manualSync: true
    timeZone: 'America/Chicago'

  # Data team: deploys weekends
  - kind: allow
    schedule: '0 0 * * 6'
    duration: 48h
    applications:
      - '*'
    namespaces:
      - 'data-pipeline'
      - 'data-*'
    manualSync: true
    timeZone: 'America/Chicago'

  # Platform/infra: deploys nightly
  - kind: allow
    schedule: '0 0 * * *'
    duration: 6h
    applications:
      - '*'
    namespaces:
      - 'kube-system'
      - 'monitoring'
      - 'logging'
      - 'ingress-*'
    manualSync: true
    timeZone: 'America/Chicago'
```

Each team gets their own deployment windows without affecting other teams.

## Multi-Namespace Applications

Some ArgoCD applications deploy resources across multiple namespaces. How do namespace-based sync windows interact with these?

An application's destination namespace is defined in `spec.destination.namespace`. If the application deploys to `production`, then sync windows matching `production` apply. However, if the application uses Kustomize or Helm to deploy resources to other namespaces (overriding the namespace at the resource level), the sync window still only matches the application's primary destination namespace.

```yaml
# This application targets the 'platform' namespace
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring-stack
  namespace: argocd
spec:
  project: shared-cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring  # This is what sync windows match against
  source:
    repoURL: https://github.com/myorg/monitoring.git
    targetRevision: main
    path: manifests/
```

Even if the application deploys Prometheus to the `monitoring` namespace and Grafana to the `grafana` namespace, sync windows only check the primary destination namespace `monitoring`.

## Combining Namespace and Application Patterns

For the most precise control, combine namespace and application patterns.

```yaml
syncWindows:
  # Payment apps in production: Wednesday 2-4 AM only
  - kind: allow
    schedule: '0 2 * * 3'
    duration: 2h
    applications:
      - 'payment-*'
    namespaces:
      - 'production'
    manualSync: true
    timeZone: 'UTC'

  # All other apps in production: nightly 10 PM - 4 AM
  - kind: allow
    schedule: '0 22 * * *'
    duration: 6h
    applications:
      - '*'
    namespaces:
      - 'production'
    manualSync: true
    timeZone: 'UTC'

  # Everything in staging: always allowed
  - kind: allow
    schedule: '0 0 * * *'
    duration: 24h
    applications:
      - '*'
    namespaces:
      - 'staging'
    manualSync: true
```

Note that a window matches if any combination of its application, namespace, and cluster patterns match the application. So the second window (all apps in production) also matches payment apps. This means payment apps can sync during either window. If you want payment apps restricted to only the Wednesday window, add a deny window for the nightly period targeting payment apps specifically.

## Verifying Namespace-Based Windows

Verify that windows are correctly targeting namespaces.

```bash
# Check project windows
argocd proj windows list shared-cluster

# Check a specific application
argocd app get my-app --output json | \
  jq '{
    name: .metadata.name,
    destinationNamespace: .spec.destination.namespace,
    syncConditions: [.status.conditions[] | select(.type | contains("Sync"))]
  }'

# List applications by destination namespace
argocd app list --output json | \
  jq '.[] | select(.spec.destination.namespace == "production") | {name: .metadata.name, project: .spec.project}'
```

## Best Practices

Use consistent namespace naming conventions. If your namespaces follow a pattern like `{env}-{service}` or `{team}-{env}`, sync window patterns become straightforward.

Keep production namespace windows tight and staging windows permissive. The development cycle should be fast in lower environments and controlled in production.

Always set `manualSync: true` for production namespace windows. This gives your team an escape hatch for emergencies without removing the automated deployment restrictions.

Document which namespaces are covered by which windows. Add comments in your AppProject YAML explaining the rationale for each window.

For cluster-level targeting, see the [sync windows for clusters guide](https://oneuptime.com/blog/post/2026-02-26-argocd-sync-windows-specific-clusters/view). For application-level targeting, check the [sync windows for applications guide](https://oneuptime.com/blog/post/2026-02-26-argocd-sync-windows-specific-applications/view).
