# How to Add Labels and Annotations to ArgoCD Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Application Management

Description: Practical guide to adding, managing, and using labels and annotations on ArgoCD Applications for filtering, notifications, automation, and organizational clarity.

---

Labels and annotations are the backbone of organizing ArgoCD applications at scale. While they may seem like simple key-value pairs, using them effectively determines whether you can manage 200 applications as easily as you manage 2. This guide covers the practical aspects of adding labels and annotations to ArgoCD Applications, with real-world patterns that actually help in production.

## Labels vs Annotations: When to Use Which

Both are key-value pairs on Kubernetes resources, but they serve different purposes:

**Labels** are for identification and selection:
- Used by selectors (filtering, grouping)
- Indexed by Kubernetes for fast lookups
- Limited to 63 characters for values
- Used by ArgoCD CLI for filtering

**Annotations** are for non-identifying information:
- Used for tool configuration (notifications, descriptions)
- Not indexed or used for selection
- Can hold larger values (up to 256KB total)
- Used by ArgoCD for feature configuration

## Adding Labels to Applications

### Declaratively in YAML

The most common and recommended approach:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-api
  namespace: argocd
  labels:
    # Ownership
    team: payments
    owner: john.doe

    # Environment and stage
    env: production
    stage: stable

    # Application classification
    tier: backend
    type: api

    # Business context
    domain: billing
    criticality: critical

    # Technical context
    runtime: nodejs
    framework: express
spec:
  # ... application spec
```

### Using the ArgoCD CLI

You can add labels when creating an application:

```bash
# Create an application with labels
argocd app create payment-api \
  --repo https://github.com/myorg/services.git \
  --path services/payment-api \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace payments \
  -l team=payments \
  -l env=production \
  -l tier=backend \
  -l criticality=critical
```

Or patch labels on an existing application:

```bash
# Add or update a label using kubectl
kubectl label application payment-api -n argocd domain=billing

# Remove a label
kubectl label application payment-api -n argocd domain-

# Overwrite an existing label
kubectl label application payment-api -n argocd env=staging --overwrite
```

### Using ApplicationSets for Consistent Labels

When managing many applications, ApplicationSets keep labels consistent:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: backend-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/services.git
        revision: main
        directories:
          - path: services/*
  template:
    metadata:
      name: '{{path.basename}}'
      labels:
        # Static labels applied to all generated apps
        managed-by: applicationset
        tier: backend
        env: production
        # Dynamic label from the generator
        service: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/services.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: services
```

## Filtering Applications by Labels

Labels shine when you need to find and operate on subsets of applications.

### CLI Filtering

```bash
# Find all production applications
argocd app list -l env=production

# Find all critical applications owned by the payments team
argocd app list -l "team=payments,criticality=critical"

# Find all non-production applications
argocd app list -l "env!=production"

# Find applications matching any of several teams
argocd app list -l "team in (payments, identity, orders)"

# Count applications by label
argocd app list -l env=production -o name | wc -l
```

### Batch Operations with Labels

Labels enable powerful batch operations:

```bash
# Sync all staging applications
argocd app list -l env=staging -o name | \
  xargs -I {} argocd app sync {}

# Get health status of all critical apps
argocd app list -l criticality=critical -o json | \
  jq -r '.[] | "\(.metadata.name): \(.status.health.status)"'

# Refresh all apps owned by a specific team
argocd app list -l team=payments -o name | \
  xargs -I {} argocd app get {} --refresh
```

### UI Filtering

In the ArgoCD web UI, use the filter bar with label selectors:
- Type `label:env=production` in the search/filter field
- Combine multiple filters: `label:env=production label:team=payments`
- The UI will show only matching applications

## Adding Annotations to Applications

### Notification Annotations

ArgoCD Notifications uses annotations to subscribe applications to notification channels:

```yaml
metadata:
  annotations:
    # Slack notifications
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deploy-notifications
    notifications.argoproj.io/subscribe.on-sync-failed.slack: deploy-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: oncall-alerts

    # Email notifications
    notifications.argoproj.io/subscribe.on-sync-failed.email: oncall@example.com

    # Webhook notifications
    notifications.argoproj.io/subscribe.on-deployed.webhook: deployment-tracker
```

### Description Annotations

Add human-readable descriptions that appear in the ArgoCD UI:

```yaml
metadata:
  annotations:
    # Shows in the application details panel
    argocd.argoproj.io/description: |
      Payment processing API service.
      Handles credit card transactions and payment webhooks.
      Owner: payments-team@example.com
```

### Custom Annotations for Automation

Define your own annotations for internal tooling:

```yaml
metadata:
  annotations:
    # Documentation links
    docs/runbook: "https://wiki.internal.com/runbooks/payment-api"
    docs/architecture: "https://wiki.internal.com/arch/payment-system"
    docs/api-spec: "https://api.example.com/docs/payments"

    # Monitoring links
    monitoring/dashboard: "https://grafana.internal.com/d/payment-api"
    monitoring/alerts: "https://alertmanager.internal.com/?filter=service=payment-api"

    # Compliance and audit
    compliance/pci-scope: "true"
    compliance/data-classification: "confidential"
    compliance/last-audit: "2026-01-15"

    # Cost tracking
    billing/cost-center: "CC-4521"
    billing/budget-code: "ENG-PAYMENTS-2026"
```

### Refresh and Sync Control Annotations

Some annotations control ArgoCD behavior:

```yaml
metadata:
  annotations:
    # Force a hard refresh on next reconciliation
    argocd.argoproj.io/refresh: "hard"

    # Compare options
    argocd.argoproj.io/compare-options: "IgnoreExtraneous"

    # Manifest generation configuration
    argocd.argoproj.io/manifest-generate-paths: "."
```

## Propagating Labels to Managed Resources

You might want labels on the Application CR to also appear on the resources it manages. ArgoCD supports this through the `info` field and managed resource annotations.

To add common labels to all resources generated by Kustomize:

```yaml
spec:
  source:
    kustomize:
      commonLabels:
        app.kubernetes.io/managed-by: argocd
        app.kubernetes.io/part-of: payment-system
        team: payments
```

For Helm-based applications, pass labels through values:

```yaml
spec:
  source:
    helm:
      values: |
        commonLabels:
          team: payments
          env: production
```

## Real-World Label Schema

Here is a label schema that works well for medium-to-large organizations:

```yaml
labels:
  # Required labels (enforce with OPA/Kyverno)
  team: "payments"                    # Owning team
  env: "production"                   # Environment

  # Recommended labels
  tier: "backend"                     # frontend, backend, data, infra
  criticality: "critical"            # critical, high, medium, low
  domain: "billing"                  # Business domain

  # Optional labels
  runtime: "nodejs"                  # Language/runtime
  version: "v2"                      # Major version
  managed-by: "applicationset"       # How this app was created
```

## Best Practices

1. **Document your label schema** - Write down what labels are required, recommended, and optional. Share this with all teams that create ArgoCD applications.

2. **Validate labels with policy engines** - Use Kyverno or OPA Gatekeeper to enforce required labels on Application resources:

```yaml
# Kyverno policy to require team and env labels
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-app-labels
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-team-and-env
      match:
        resources:
          kinds:
            - Application
      validate:
        message: "Applications must have team and env labels"
        pattern:
          metadata:
            labels:
              team: "?*"
              env: "?*"
```

3. **Keep label values short and lowercase** - Labels are meant for quick filtering. Use `prod` instead of `production-environment-us-east-1`.

4. **Never put sensitive data in labels or annotations** - They are visible to anyone with read access to the ArgoCD namespace.

5. **Use annotations for notification routing** - This is one of the most practical uses of annotations. Every production application should have notification annotations configured.

Labels and annotations are not glamorous, but they are the glue that holds a large-scale ArgoCD deployment together. Invest time in your labeling strategy early, and you will thank yourself later when you need to quickly find, filter, and operate on your applications.
