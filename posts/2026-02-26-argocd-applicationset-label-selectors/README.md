# How to Deploy to Clusters Matching Label Selectors in ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSets, Multi-Cluster

Description: Learn how to use label selectors in ArgoCD ApplicationSet cluster generators to target specific subsets of clusters for application deployment.

---

Deploying to every registered cluster is useful for infrastructure components, but most applications only belong on certain clusters. Label selectors in the cluster generator let you target specific clusters based on their labels - environment, region, team, tier, or any custom classification you define.

This guide covers how to use label selectors effectively, common labeling strategies, and practical patterns for production environments.

## Basic Label Selector

The cluster generator accepts a `selector` field that works exactly like Kubernetes label selectors.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: production-apps
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
  template:
    metadata:
      name: 'webapp-{{name}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/webapp.git
        targetRevision: HEAD
        path: deploy/production
      destination:
        server: '{{server}}'
        namespace: webapp
      syncPolicy:
        automated:
          selfHeal: true
```

Only clusters with the label `environment=production` will get this application deployed.

## Setting Up Cluster Labels

Before using label selectors, you need labels on your clusters. There are two ways to add them.

Using the CLI:

```bash
# Add labels when registering a cluster
argocd cluster add my-cluster \
  --label environment=production \
  --label region=us-east-1 \
  --label team=platform \
  --label tier=critical \
  --label cloud=aws

# Add labels to an existing cluster
argocd cluster set prod-us-east-1 \
  --label environment=production \
  --label region=us-east-1
```

Using a declarative cluster secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: prod-us-east-1
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    # Cluster labels for the generator
    environment: production
    region: us-east-1
    team: platform
    tier: critical
    cloud: aws
type: Opaque
stringData:
  name: prod-us-east-1
  server: https://prod-us-east-1.example.com
  config: |
    {
      "bearerToken": "<token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-ca>"
      }
    }
```

## Using matchExpressions

For more complex filtering, `matchExpressions` gives you operators beyond simple equality.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: non-dev-apps
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchExpressions:
            # Deploy to staging and production, but not development
            - key: environment
              operator: In
              values:
                - staging
                - production
            # Only deploy to AWS clusters
            - key: cloud
              operator: In
              values:
                - aws
            # Skip clusters in maintenance mode
            - key: maintenance
              operator: DoesNotExist
  template:
    metadata:
      name: 'api-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/api.git
        targetRevision: HEAD
        path: deploy
      destination:
        server: '{{server}}'
        namespace: api
```

The available operators are:
- `In` - Label value is in the specified set
- `NotIn` - Label value is not in the specified set
- `Exists` - Label key exists (value does not matter)
- `DoesNotExist` - Label key does not exist

## Combining matchLabels and matchExpressions

Both conditions are ANDed together when used simultaneously.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: targeted-deploy
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          # AND: all conditions must be true
          matchLabels:
            environment: production
            team: payments
          matchExpressions:
            - key: region
              operator: In
              values:
                - us-east-1
                - us-west-2
            - key: pci-compliant
              operator: Exists
  template:
    metadata:
      name: 'payment-svc-{{name}}'
    spec:
      project: payments
      source:
        repoURL: https://github.com/myorg/payment-svc.git
        targetRevision: HEAD
        path: deploy
      destination:
        server: '{{server}}'
        namespace: payment-svc
```

This targets clusters that are: production AND owned by the payments team AND in US regions AND PCI compliant.

## Using Labels in Templates

Cluster labels are available as template parameters, letting you customize application configuration per cluster.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: env-aware-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters:
        selector:
          matchExpressions:
            - key: environment
              operator: In
              values:
                - staging
                - production
  template:
    metadata:
      name: 'frontend-{{.name}}'
      labels:
        environment: '{{index .metadata.labels "environment"}}'
        region: '{{index .metadata.labels "region"}}'
    spec:
      project: '{{index .metadata.labels "environment"}}'
      source:
        repoURL: https://github.com/myorg/frontend.git
        targetRevision: HEAD
        path: deploy
        helm:
          valueFiles:
            - values.yaml
            - 'values-{{index .metadata.labels "environment"}}.yaml'
          parameters:
            - name: ingress.host
              value: 'app-{{.name}}.example.com'
            - name: replicaCount
              value: '{{if eq (index .metadata.labels "environment") "production"}}3{{else}}1{{end}}'
      destination:
        server: '{{.server}}'
        namespace: frontend
```

## Common Labeling Strategies

### Strategy 1: Environment-Based

The simplest approach - separate clusters by environment.

```bash
argocd cluster set dev-1 --label environment=development
argocd cluster set staging-1 --label environment=staging
argocd cluster set prod-1 --label environment=production
argocd cluster set prod-2 --label environment=production
```

```yaml
# ApplicationSets for each environment
generators:
  - clusters:
      selector:
        matchLabels:
          environment: production
```

### Strategy 2: Team-Based

Route applications to team-owned clusters.

```bash
argocd cluster set team-a-prod --label team=team-a --label environment=production
argocd cluster set team-b-prod --label team=team-b --label environment=production
argocd cluster set shared-staging --label team=shared --label environment=staging
```

```yaml
# Deploy team-a services to team-a clusters
generators:
  - clusters:
      selector:
        matchLabels:
          team: team-a
```

### Strategy 3: Multi-Dimensional

Combine multiple classification dimensions.

```bash
argocd cluster set prod-us-critical \
  --label environment=production \
  --label region=us-east-1 \
  --label tier=critical \
  --label cloud=aws \
  --label pci-compliant=true
```

```yaml
# Targeted deployment using multiple selectors
generators:
  - clusters:
      selector:
        matchLabels:
          tier: critical
          pci-compliant: "true"
        matchExpressions:
          - key: region
            operator: In
            values: [us-east-1, us-west-2]
```

## Multiple Cluster Generators

You can use multiple cluster generators in a single ApplicationSet to create a union of different selections.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-select-apps
  namespace: argocd
spec:
  generators:
    # Include all production clusters
    - clusters:
        selector:
          matchLabels:
            environment: production
    # Also include the staging canary cluster
    - clusters:
        selector:
          matchLabels:
            environment: staging
            canary: "true"
  template:
    metadata:
      name: 'service-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/service.git
        targetRevision: HEAD
        path: deploy
      destination:
        server: '{{server}}'
        namespace: service
```

## Verifying Label Selectors

Before applying an ApplicationSet, verify which clusters match your selectors.

```bash
# List all clusters with their labels
argocd cluster list -o wide

# Check specific cluster labels
argocd cluster get prod-us-east-1

# Use kubectl to inspect cluster secrets directly
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster \
  --show-labels

# After applying the ApplicationSet, verify generated apps
argocd appset get production-apps
```

## Dynamic Cluster Discovery

The beauty of label selectors is that they work dynamically. When you add a new cluster with matching labels, ApplicationSets automatically pick it up.

```bash
# Register a new production cluster
argocd cluster add new-prod-ap \
  --label environment=production \
  --label region=ap-southeast-1

# Within the next reconciliation cycle (default 3 minutes),
# all production ApplicationSets will create apps for this cluster
```

This makes cluster onboarding a single-step operation rather than requiring updates to multiple ApplicationSet definitions.

For monitoring your label-selected cluster deployments, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-deploy-all-clusters/view) provides multi-cluster observability to track application health and sync status across your targeted cluster fleet.
