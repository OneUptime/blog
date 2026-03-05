# How to Configure Velero Backup Include and Exclude Resource Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Backup, Resource Management

Description: Learn how to configure Velero backup include and exclude resource filters to create targeted backups, reduce storage costs, and optimize backup performance by backing up only what matters.

---

Not all Kubernetes resources need backup. Backing up everything wastes storage, increases backup times, and makes restores slower. Velero provides powerful filtering capabilities that let you precisely control which resources are included in backups, enabling efficient, targeted backup strategies.

## Understanding Velero Filters

Velero offers several filtering mechanisms:

- Namespace filters (include/exclude specific namespaces)
- Resource type filters (include/exclude resource kinds)
- Label selectors (filter resources by labels)
- Resource policies (exclude specific resource instances)

These filters can be combined to create sophisticated backup strategies that capture exactly what you need.

## Namespace Filtering

The simplest filter targets specific namespaces:

```bash
# Backup only production namespace
velero backup create production-only \
  --include-namespaces production

# Backup multiple namespaces
velero backup create multi-ns \
  --include-namespaces production,staging,database

# Backup everything except system namespaces
velero backup create user-workloads \
  --exclude-namespaces kube-system,kube-public,kube-node-lease,velero
```

In scheduled backups:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    - monitoring
    excludedNamespaces:
    - development
    - testing
    ttl: 168h0m0s
```

## Resource Type Filtering

Include or exclude specific Kubernetes resource types:

```bash
# Backup only configuration, not workloads
velero backup create config-only \
  --include-resources configmaps,secrets,serviceaccounts \
  --include-namespaces production

# Backup everything except pods and events
velero backup create no-pods-events \
  --exclude-resources pods,events

# Backup stateful resources only
velero backup create stateful-only \
  --include-resources statefulsets,persistentvolumeclaims,persistentvolumes
```

Common resource type combinations:

```yaml
# Application configuration backup
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: app-config
  namespace: velero
spec:
  includedNamespaces:
  - production
  includedResources:
  - configmaps
  - secrets
  - services
  - ingresses
  ttl: 720h0m0s
---
# Workload backup (no configs)
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: workloads
  namespace: velero
spec:
  includedNamespaces:
  - production
  includedResources:
  - deployments
  - statefulsets
  - daemonsets
  - replicasets
  excludedResources:
  - configmaps
  - secrets
  ttl: 168h0m0s
```

## Label Selector Filtering

Filter resources based on labels for fine-grained control:

```bash
# Backup only resources with specific label
velero backup create critical-apps \
  --selector tier=critical

# Backup resources matching multiple labels
velero backup create web-tier \
  --selector 'app=web,environment=production'

# Exclude resources with specific label
velero backup create no-temp \
  --selector 'backup!=exclude'
```

Label your resources appropriately:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  labels:
    app: api-server
    tier: critical
    backup: hourly
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myapp:latest
```

Create tier-based backup schedules:

```yaml
# Critical tier - hourly backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: critical-hourly
  namespace: velero
spec:
  schedule: "0 * * * *"
  template:
    labelSelector:
      matchLabels:
        tier: critical
    ttl: 72h0m0s
---
# Standard tier - 4-hour backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: standard-4hour
  namespace: velero
spec:
  schedule: "0 */4 * * *"
  template:
    labelSelector:
      matchLabels:
        tier: standard
    ttl: 168h0m0s
---
# Low priority - daily backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: low-daily
  namespace: velero
spec:
  schedule: "0 3 * * *"
  template:
    labelSelector:
      matchLabels:
        tier: low
    ttl: 720h0m0s
```

## Combining Multiple Filters

Stack filters for precise backup targeting:

```bash
# Backup critical stateful apps in production
velero backup create critical-stateful \
  --include-namespaces production,database \
  --include-resources statefulsets,persistentvolumeclaims \
  --selector tier=critical

# Backup non-system workloads excluding temp resources
velero backup create production-workloads \
  --exclude-namespaces kube-system,kube-public,velero \
  --exclude-resources events,pods \
  --selector 'backup!=exclude'
```

Complex scheduling example:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-databases
  namespace: velero
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  template:
    includedNamespaces:
    - database
    - production
    includedResources:
    - statefulsets
    - persistentvolumeclaims
    - secrets
    - configmaps
    labelSelector:
      matchExpressions:
      - key: app-type
        operator: In
        values:
        - database
        - cache
      - key: backup
        operator: NotIn
        values:
        - exclude
    ttl: 48h0m0s
```

## Excluding Resources by Annotation

Use annotations to exclude specific resources:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: temp-config
  namespace: production
  annotations:
    backup.velero.io/backup-exclude: "true"
data:
  temp: value
```

This ConfigMap will be excluded from all backups regardless of other filters.

## Resource Policies for Advanced Filtering

Create resource policies for complex exclusion rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: velero-resource-policy
  namespace: velero
  labels:
    velero.io/plugin-config: "true"
    velero.io/resource-policy: "true"
data:
  policy: |
    version: v1
    resourcePolicies:
    # Exclude completed jobs
    - resource: jobs
      conditions:
        namespaces:
        - production
      action:
        type: exclude
        properties:
          conditions:
          - status.succeeded >= 1
    # Exclude old replica sets
    - resource: replicasets
      conditions:
        namespaces:
        - "*"
      action:
        type: exclude
        properties:
          conditions:
          - spec.replicas == 0
          - status.replicas == 0
    # Exclude empty PVCs
    - resource: persistentvolumeclaims
      action:
        type: exclude
        properties:
          conditions:
          - status.phase == "Pending"
```

Apply the resource policy:

```bash
kubectl apply -f resource-policy.yaml

# Reference in backup
velero backup create with-policy \
  --resource-policy-configmap velero-resource-policy
```

## Excluding Temporary and Cache Data

Exclude ephemeral data from backups:

```bash
# Exclude common temporary resources
velero backup create no-temp \
  --exclude-resources 'events,*.events.k8s.io,backups.velero.io,restores.velero.io' \
  --exclude-namespaces 'kube-system,kube-public,kube-node-lease'

# Use labels to mark temporary resources
kubectl label configmap temp-cache backup=exclude -n production

# Backup excluding temporary
velero backup create production-permanent \
  --include-namespaces production \
  --selector 'backup!=exclude'
```

## Optimizing Backup Size

Reduce backup size by excluding unnecessary resources:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: optimized-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    excludedResources:
    # Exclude resources that can be recreated
    - events
    - events.events.k8s.io
    - backups.velero.io
    - restores.velero.io
    # Exclude pod logs (use log aggregation instead)
    - pods
    # Exclude replica sets (deployment covers it)
    - replicasets
    # Exclude node-specific resources
    - nodes
    - csinodes.storage.k8s.io
    - csidrivers.storage.k8s.io
    labelSelector:
      matchExpressions:
      - key: backup
        operator: NotIn
        values:
        - exclude
    ttl: 168h0m0s
```

## Validating Filter Configuration

Test filters before creating scheduled backups:

```bash
# Dry-run to see what would be backed up
velero backup create test-filter \
  --include-namespaces production \
  --exclude-resources events,pods \
  --selector tier=critical \
  --dry-run -o yaml

# Create actual test backup
velero backup create validation-backup \
  --include-namespaces production \
  --exclude-resources events,pods \
  --selector tier=critical

# Check what was backed up
velero backup describe validation-backup --details

# See resource counts
velero backup describe validation-backup | grep "Resource List:"

# Delete test backup
velero backup delete validation-backup
```

## Filter Precedence and Logic

Understand how Velero applies filters:

1. Namespace inclusion/exclusion filters
2. Resource type inclusion/exclusion filters
3. Label selector filters
4. Resource-specific annotations
5. Resource policies

Exclusions always take precedence over inclusions. If a resource matches both include and exclude criteria, it will be excluded.

```bash
# This excludes secrets even though they match the label
velero backup create precedence-test \
  --include-namespaces production \
  --exclude-resources secrets \
  --selector tier=critical  # Even critical secrets are excluded
```

## Monitoring Filtered Backups

Track what gets backed up:

```bash
#!/bin/bash
# backup-analysis.sh

BACKUP_NAME=$1

# Get backup details
echo "Backup: $BACKUP_NAME"
echo "---"

# Resource counts
velero backup describe $BACKUP_NAME --details | \
  grep -A 50 "Resource List:" | \
  grep -E '^\s+[a-z]' | \
  awk '{print $1 ": " $2}'

# Backup size
velero backup describe $BACKUP_NAME | grep "size" || echo "Size: computing..."

# Warning and errors
velero backup logs $BACKUP_NAME | grep -i -E 'warn|error' | head -20
```

## Common Filter Patterns

Useful filter combinations for specific scenarios:

```yaml
# Database backup only
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: database-only
spec:
  includedNamespaces:
  - database
  includedResources:
  - statefulsets
  - persistentvolumeclaims
  - secrets
  - services
  labelSelector:
    matchLabels:
      app-type: database
---
# Configuration backup (no state)
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: config-only
spec:
  includedResources:
  - configmaps
  - secrets
  - ingresses
  - services
  excludedNamespaces:
  - kube-system
---
# Full cluster backup (selective)
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: cluster-backup
spec:
  includeClusterResources: true
  excludedResources:
  - events
  - events.events.k8s.io
  - nodes
  - pods
  excludedNamespaces:
  - kube-system
  - kube-public
```

## Conclusion

Velero's filtering capabilities transform generic cluster backups into precise, efficient backup strategies. By combining namespace filters, resource type filters, label selectors, and resource policies, you can create backups that capture exactly what matters while minimizing storage costs and backup times.

Start with broad namespace-based filtering, then add resource type filters to exclude ephemeral data. Use labels to implement tier-based backup strategies, and leverage resource policies for advanced filtering scenarios. Always test your filters before deploying to production to ensure you're backing up what you expect.

Remember that the goal is not to back up everything, but to back up everything you need to recover from a disaster. Thoughtful filtering makes your disaster recovery strategy more efficient and more reliable.
