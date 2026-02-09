# How to Use Descheduler RemovePodsViolatingTopologySpreadConstraint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Descheduler, Topology Management

Description: Learn how to use the Descheduler RemovePodsViolatingTopologySpreadConstraint strategy to fix pods that violate topology spread constraints and maintain proper distribution across failure domains.

---

Pod Topology Spread Constraints help you distribute pods evenly across your cluster based on topology domains like zones, nodes, or custom labels. However, when nodes are added, removed, or resources change, existing pods might end up violating these constraints even though new pods would be scheduled correctly.

The RemovePodsViolatingTopologySpreadConstraint strategy identifies and evicts pods that violate their topology spread constraints, allowing them to be rescheduled in compliance with the defined distribution rules.

## Understanding Topology Spread Violations

Topology spread constraints define how pods should be distributed across topology domains. A violation occurs when:

- A pod was scheduled before the constraint was applied
- Nodes were added or removed, changing the topology
- Other pods were deleted, creating imbalance
- Manual interventions placed pods incorrectly

These violations can compromise high availability and defeat the purpose of spreading pods across failure domains.

## Basic Strategy Configuration

Here's how to enable the RemovePodsViolatingTopologySpreadConstraint strategy:

```yaml
# descheduler-topology-violation.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: "descheduler/v1alpha2"
    kind: "DeschedulerPolicy"
    profiles:
      - name: default
        pluginConfig:
        - name: "RemovePodsViolatingTopologySpreadConstraint"
          args:
            # Namespaces to check for violations
            namespaces:
              include: []  # Empty means all namespaces
            # Label selector to filter which pods to check
            labelSelector: {}
            # Only include soft constraints (whenUnsatisfiable: ScheduleAnyway)
            includeSoftConstraints: false
        plugins:
          balance:
            enabled:
              - "RemovePodsViolatingTopologySpreadConstraint"
```

## Example Application with Topology Spread Constraints

Let's create a deployment with topology spread constraints:

```yaml
# web-app-with-topology.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-app
      tier: frontend
  template:
    metadata:
      labels:
        app: web-app
        tier: frontend
    spec:
      # Define topology spread constraints
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web-app
            tier: frontend
      - maxSkew: 2
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: web-app
            tier: frontend
      containers:
      - name: nginx
        image: nginx:1.21
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        ports:
        - containerPort: 80
```

This configuration ensures:
- Pods are spread across availability zones with maxSkew of 1 (hard constraint)
- Pods are spread across nodes with maxSkew of 2 (soft constraint)

## Handling Hard Constraints

Hard constraints (whenUnsatisfiable: DoNotSchedule) prevent scheduling if they can't be satisfied:

```yaml
pluginConfig:
- name: "RemovePodsViolatingTopologySpreadConstraint"
  args:
    # Only check hard constraints by default
    includeSoftConstraints: false
    # Enable constraint checking
    constraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
```

## Including Soft Constraints

Soft constraints (whenUnsatisfiable: ScheduleAnyway) allow scheduling even if constraints aren't met:

```yaml
pluginConfig:
- name: "RemovePodsViolatingTopologySpreadConstraint"
  args:
    # Also check and fix soft constraint violations
    includeSoftConstraints: true
    namespaces:
      include: ["production"]
    # Priority threshold - don't evict high-priority pods
    priorityThreshold:
      value: 10000
```

## Complete Descheduler Deployment

Deploy the descheduler with this strategy:

```yaml
# complete-descheduler.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: descheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: descheduler
rules:
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "update"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "watch", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list", "delete"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
- apiGroups: ["apps"]
  resources: ["replicasets", "deployments"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: descheduler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: descheduler
subjects:
- kind: ServiceAccount
  name: descheduler
  namespace: kube-system
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: descheduler-topology
  namespace: kube-system
spec:
  schedule: "*/10 * * * *"  # Every 10 minutes
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        metadata:
          name: descheduler-topology
        spec:
          serviceAccountName: descheduler
          restartPolicy: Never
          containers:
          - name: descheduler
            image: registry.k8s.io/descheduler/descheduler:v0.28.0
            command:
            - /bin/descheduler
            args:
            - --policy-config-file=/policy/policy.yaml
            - --v=3
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 500m
                memory: 256Mi
            volumeMounts:
            - name: policy-volume
              mountPath: /policy
          volumes:
          - name: policy-volume
            configMap:
              name: descheduler-policy
```

## Testing Topology Violation Fixes

Create a scenario where violations occur:

```bash
# Label nodes with zones
kubectl label nodes worker-node-1 topology.kubernetes.io/zone=us-east-1a
kubectl label nodes worker-node-2 topology.kubernetes.io/zone=us-east-1b
kubectl label nodes worker-node-3 topology.kubernetes.io/zone=us-east-1a

# Deploy the application
kubectl apply -f web-app-with-topology.yaml

# Check pod distribution
kubectl get pods -l app=web-app -o wide

# Simulate violation by manually forcing pods to one zone
kubectl patch deployment web-app -p '{"spec":{"template":{"spec":{"nodeSelector":{"topology.kubernetes.io/zone":"us-east-1a"}}}}}'

# Wait for pods to be rescheduled
sleep 30

# Remove the node selector to allow proper spreading
kubectl patch deployment web-app --type json -p='[{"op": "remove", "path": "/spec/template/spec/nodeSelector"}]'
```

Now pods are running but violate the topology constraint. Check the distribution:

```bash
# Count pods per zone
kubectl get pods -l app=web-app -o json | \
  jq -r '.items[] | select(.status.phase=="Running") | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c
```

## Monitoring Violation Fixes

Watch the descheduler correct violations:

```bash
# View descheduler logs
kubectl logs -n kube-system -l app=descheduler --tail=100

# Expected output:
# I0209 15:30:10.123456 1 topologyspreadconstraint.go:99] Processing namespace production
# I0209 15:30:10.234567 1 topologyspreadconstraint.go:145] Found pod web-app-7d8f9c5b-xyz12 violating topology spread constraint
# I0209 15:30:10.345678 1 topologyspreadconstraint.go:146] Constraint: maxSkew=1, topologyKey=topology.kubernetes.io/zone
# I0209 15:30:10.456789 1 evictions.go:160] Evicted pod web-app-7d8f9c5b-xyz12
```

## Advanced Configuration for Multi-Constraint Applications

Handle multiple topology constraints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-constraint-app
spec:
  replicas: 9
  selector:
    matchLabels:
      app: multi-constraint-app
  template:
    metadata:
      labels:
        app: multi-constraint-app
    spec:
      topologySpreadConstraints:
      # Spread across zones (hard constraint)
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: multi-constraint-app
      # Spread across nodes within each zone (soft constraint)
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: multi-constraint-app
      # Spread across node pools (soft constraint)
      - maxSkew: 2
        topologyKey: node.kubernetes.io/instance-type
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: multi-constraint-app
      containers:
      - name: app
        image: nginx:1.21
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

## Combining with PodDisruptionBudgets

Protect applications during topology rebalancing:

```yaml
# topology-aware-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 4  # Keep at least 4 pods running
  selector:
    matchLabels:
      app: web-app
      tier: frontend
  # Optional: use maxUnavailable instead
  # maxUnavailable: 2
```

## Namespace-Specific Configuration

Apply the strategy only to specific namespaces:

```yaml
pluginConfig:
- name: "RemovePodsViolatingTopologySpreadConstraint"
  args:
    namespaces:
      include: ["production", "staging"]
      # Or exclude certain namespaces
      # exclude: ["kube-system", "monitoring"]
    # Only check pods with specific labels
    labelSelector:
      matchLabels:
        managed-by: descheduler
      matchExpressions:
      - key: environment
        operator: In
        values: ["production", "staging"]
```

## Validating Topology Distribution

Check if pods are properly distributed:

```bash
# Show pod distribution across zones
kubectl get pods -l app=web-app -o json | \
  jq -r '.items[] |
    select(.status.phase=="Running") |
    .spec.nodeName as $node |
    .metadata.name as $pod |
    ($node | split("-") | .[2]) as $zone |
    "\($pod) -> \($zone)"'

# Count pods per topology domain
kubectl get pods -l app=web-app -o wide --no-headers | \
  awk '{print $7}' | \
  sort | uniq -c
```

## Handling StatefulSets

StatefulSets require special consideration:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database-cluster
spec:
  serviceName: database
  replicas: 5
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: database
      containers:
      - name: postgres
        image: postgres:14
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
```

The descheduler will respect StatefulSet ordering when evicting pods.

## Metrics and Alerting

Monitor topology constraint violations:

```bash
# Create a script to check for violations
cat << 'EOF' > check-topology-violations.sh
#!/bin/bash
violations=$(kubectl get events --all-namespaces --field-selector reason=FailedScheduling | \
  grep "violates topology spread constraint" | wc -l)

if [ $violations -gt 0 ]; then
  echo "Found $violations topology constraint violations"
  exit 1
fi
echo "No violations found"
EOF

chmod +x check-topology-violations.sh
```

## Best Practices

1. **Start with Hard Constraints**: Only fix DoNotSchedule violations initially
2. **Use PDBs**: Always protect critical applications with PodDisruptionBudgets
3. **Test Gradually**: Enable soft constraint checking after validating hard constraints work
4. **Monitor Distribution**: Regularly check pod distribution across topology domains
5. **Set Appropriate Intervals**: Run frequently enough to catch violations quickly but not so often that you cause pod churn
6. **Consider Priority**: Use priority thresholds to protect critical workloads from eviction
7. **Validate Node Capacity**: Ensure target nodes have enough resources before evicting pods

## Troubleshooting

If topology violations aren't being fixed:

```bash
# Check if constraints are defined correctly
kubectl get deployment web-app -o jsonpath='{.spec.template.spec.topologySpreadConstraints}' | jq

# Verify node topology labels exist
kubectl get nodes --show-labels | grep topology

# Check descheduler policy
kubectl get configmap descheduler-policy -n kube-system -o yaml

# View detailed eviction logs
kubectl logs -n kube-system -l app=descheduler --tail=500 | grep -i topology
```

The RemovePodsViolatingTopologySpreadConstraint strategy is crucial for maintaining proper pod distribution across your cluster's topology domains. By automatically correcting violations, it ensures your applications remain highly available and properly distributed across failure domains without manual intervention.

