# How to Label and Annotate Clusters in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Cluster, ApplicationSets

Description: Learn how to use labels and annotations on ArgoCD cluster secrets to organize clusters, drive ApplicationSet generators, implement environment-based deployments.

---

Labels and annotations on ArgoCD cluster secrets are the foundation for scalable multi-cluster management. They determine which clusters ApplicationSets target, help organize your fleet, and enable environment-based deployment patterns. Without proper labeling, managing more than a handful of clusters becomes chaotic.

In this guide, I will show you how to effectively label and annotate clusters, and how those labels drive your deployment automation.

## Where Labels Live

ArgoCD stores cluster information as Kubernetes Secrets. Labels on these secrets are what ArgoCD uses for cluster selection:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: production-east-cluster
  namespace: argocd
  labels:
    # Required label
    argocd.argoproj.io/secret-type: cluster

    # Custom organizational labels
    environment: production
    region: us-east-1
    provider: aws
    tier: critical
    team: platform
    cost-center: engineering

  annotations:
    # Custom annotations for metadata
    argocd.example.com/contact: platform-team@example.com
    argocd.example.com/pagerduty: P12345
    argocd.example.com/maintenance-window: "sat-02:00-06:00-utc"
type: Opaque
stringData:
  name: production-east
  server: "https://prod-east.k8s.example.com"
  config: |
    { ... }
```

## Adding Labels via CLI

```bash
# Add labels to an existing cluster
argocd cluster set https://prod-east.k8s.example.com \
  --label environment=production \
  --label region=us-east-1 \
  --label provider=aws \
  --label tier=critical

# View cluster labels
argocd cluster get https://prod-east.k8s.example.com -o json | jq '.labels'
```

## Adding Labels via kubectl

Since cluster secrets are regular Kubernetes Secrets, you can use kubectl:

```bash
# Add labels
kubectl label secret production-east-cluster \
  -n argocd \
  environment=production \
  region=us-east-1

# Update labels
kubectl label secret production-east-cluster \
  -n argocd \
  tier=critical --overwrite

# Remove a label
kubectl label secret production-east-cluster \
  -n argocd \
  tier-
```

## Recommended Labeling Strategy

Here is a labeling schema that works well for most organizations:

```yaml
labels:
  # Required
  argocd.argoproj.io/secret-type: cluster

  # Environment classification
  environment: production     # production, staging, development, sandbox

  # Geographic location
  region: us-east-1          # Cloud region or datacenter location
  zone: us-east-1a           # Availability zone (optional)

  # Infrastructure provider
  provider: aws              # aws, gcp, azure, on-prem, hybrid

  # Cluster type
  cluster-type: eks          # eks, gke, aks, kubeadm, k3s, rke2

  # Business context
  team: platform             # Owning team
  business-unit: engineering # Business unit
  cost-center: cc-12345     # For cost allocation

  # Operational metadata
  tier: critical             # critical, standard, development
  data-classification: pci   # pci, hipaa, public, internal

  # Feature flags
  gpu-enabled: "true"        # Special capabilities
  spot-instances: "true"     # Cost optimization flags
```

## Using Labels with ApplicationSet Cluster Generators

The primary use of cluster labels is driving ApplicationSet generators:

### Deploy to All Production Clusters

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: monitoring-stack
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
  template:
    metadata:
      name: 'monitoring-{{name}}'
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/your-org/platform.git
        targetRevision: main
        path: monitoring
      destination:
        server: '{{server}}'
        namespace: monitoring
```

### Deploy to AWS Clusters Only

```yaml
generators:
  - clusters:
      selector:
        matchLabels:
          provider: aws
```

### Deploy to Critical Tier Clusters

```yaml
generators:
  - clusters:
      selector:
        matchLabels:
          tier: critical
        matchExpressions:
          - key: environment
            operator: In
            values:
              - production
              - staging
```

### Exclude Specific Clusters

```yaml
generators:
  - clusters:
      selector:
        matchExpressions:
          - key: environment
            operator: NotIn
            values:
              - sandbox
              - development
```

## Using Labels in Matrix Generators

Combine cluster labels with other generators for powerful patterns:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-region-services
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - clusters:
              selector:
                matchLabels:
                  environment: production
              # Cluster label values available in templates
              values:
                ingress-class: "nginx"
          - list:
              elements:
                - service: api
                  replicas: "3"
                - service: worker
                  replicas: "2"
                - service: scheduler
                  replicas: "1"
  template:
    metadata:
      name: '{{service}}-{{name}}'
    spec:
      source:
        repoURL: https://github.com/your-org/services.git
        path: 'services/{{service}}'
        helm:
          parameters:
            - name: replicaCount
              value: '{{replicas}}'
            - name: cluster.region
              value: '{{metadata.labels.region}}'
            - name: ingress.className
              value: '{{values.ingress-class}}'
      destination:
        server: '{{server}}'
        namespace: '{{service}}'
```

## Accessing Labels in Templates

In ApplicationSet templates, you can reference cluster labels:

```yaml
template:
  metadata:
    name: 'app-{{metadata.labels.region}}-{{metadata.labels.environment}}'
    labels:
      target-region: '{{metadata.labels.region}}'
      target-env: '{{metadata.labels.environment}}'
  spec:
    source:
      path: 'overlays/{{metadata.labels.environment}}'
    destination:
      server: '{{server}}'
```

## Using Annotations for Metadata

Annotations carry non-selector metadata about clusters:

```yaml
annotations:
  # Contact information
  argocd.example.com/owner: "platform-team"
  argocd.example.com/slack-channel: "#platform-ops"
  argocd.example.com/escalation: "pagerduty:P12345"

  # Operational windows
  argocd.example.com/maintenance-window: "sun-02:00-06:00-utc"
  argocd.example.com/change-freeze: "2026-12-20/2027-01-05"

  # Documentation
  argocd.example.com/runbook: "https://wiki.example.com/clusters/prod-east"
  argocd.example.com/architecture: "https://wiki.example.com/arch/east-region"

  # Provisioning metadata
  argocd.example.com/provisioned-by: "terraform"
  argocd.example.com/terraform-workspace: "production-east"
  argocd.example.com/created-at: "2025-06-15T10:00:00Z"
```

These annotations do not affect ApplicationSet generators but are useful for documentation, automation scripts, and debugging.

## Automating Label Management

For large fleet, automate label management:

```bash
#!/bin/bash
# sync-cluster-labels.sh
# Reads cluster metadata from a config file and applies labels

while IFS=, read -r name server environment region provider tier; do
  echo "Labeling cluster: $name"

  SECRET_NAME=$(kubectl get secrets -n argocd \
    -l argocd.argoproj.io/secret-type=cluster \
    -o json | jq -r ".items[] | select(.data.name | @base64d == \"$name\") | .metadata.name")

  if [ -n "$SECRET_NAME" ]; then
    kubectl label secret "$SECRET_NAME" -n argocd \
      environment="$environment" \
      region="$region" \
      provider="$provider" \
      tier="$tier" \
      --overwrite
  fi
done < clusters.csv
```

With a `clusters.csv` file:

```csv
production-east,https://prod-east.k8s.example.com,production,us-east-1,aws,critical
production-west,https://prod-west.k8s.example.com,production,us-west-2,aws,critical
staging,https://staging.k8s.example.com,staging,us-east-1,aws,standard
development,https://dev.k8s.example.com,development,us-east-1,aws,development
```

## Querying Clusters by Labels

```bash
# List clusters with specific labels
kubectl get secrets -n argocd \
  -l argocd.argoproj.io/secret-type=cluster,environment=production \
  -o custom-columns='NAME:.metadata.name,CLUSTER:.data.name'

# Using ArgoCD CLI
argocd cluster list -o json | jq '.[] | select(.labels.environment == "production") | .name'

# Count clusters by environment
kubectl get secrets -n argocd \
  -l argocd.argoproj.io/secret-type=cluster \
  -o json | jq '[.items[].metadata.labels.environment] | group_by(.) | map({key: .[0], count: length})'
```

## Summary

Labels and annotations on ArgoCD cluster secrets are the backbone of multi-cluster management. Labels drive ApplicationSet cluster generators, enabling you to target deployments to specific environments, regions, providers, or any other organizational dimension. A consistent labeling strategy across your cluster fleet makes it possible to scale from a few clusters to hundreds without changing your ApplicationSet definitions. Start with environment, region, and provider labels, and expand based on your organization's needs. For more on using cluster generators, see our guide on [ArgoCD cluster generators in ApplicationSets](https://oneuptime.com/blog/post/2026-02-26-argocd-cluster-generators-applicationsets/view).
