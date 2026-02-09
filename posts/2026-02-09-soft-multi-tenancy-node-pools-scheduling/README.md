# How to Implement Soft Multi-Tenancy with Node Pools and Scheduling Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Tenancy, Node Pools

Description: Learn how to implement soft multi-tenancy in Kubernetes using node pools, taints, tolerations, and resource quotas to isolate workloads from different teams while sharing cluster infrastructure.

---

Soft multi-tenancy allows multiple teams to share a Kubernetes cluster while maintaining logical isolation through namespaces, node pools, and scheduling constraints. Unlike hard multi-tenancy, it doesn't provide complete security isolation but offers cost-effective resource sharing with operational boundaries.

## Creating Team-Specific Node Pools

Label and taint nodes for different teams:

```bash
# Create node pool for team-a
kubectl label nodes node-1 node-2 node-3 team=team-a
kubectl taint nodes node-1 node-2 node-3 team=team-a:NoSchedule

# Create node pool for team-b
kubectl label nodes node-4 node-5 node-6 team=team-b
kubectl taint nodes node-4 node-5 node-6 team=team-b:NoSchedule

# Shared node pool (no taint)
kubectl label nodes node-7 node-8 node-9 team=shared
```

## Namespace Setup with ResourceQuotas

Create namespaces with quotas for each team:

```yaml
# team-a-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    team: team-a
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    persistentvolumeclaims: "50"
    services.loadbalancers: "5"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: team-a-limits
  namespace: team-a
spec:
  limits:
  - max:
      cpu: "8"
      memory: "16Gi"
    min:
      cpu: "100m"
      memory: "128Mi"
    type: Container
  - max:
      cpu: "16"
      memory: "32Gi"
    type: Pod
```

## Team Workload with Node Pool Binding

Deploy workloads to team-specific node pools:

```yaml
# team-a-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-a-app
  namespace: team-a
spec:
  replicas: 5
  selector:
    matchLabels:
      app: team-a-app
  template:
    metadata:
      labels:
        app: team-a-app
    spec:
      # Tolerate team-a taint
      tolerations:
      - key: "team"
        operator: "Equal"
        value: "team-a"
        effect: "NoSchedule"
      # Schedule on team-a nodes
      nodeSelector:
        team: team-a
      containers:
      - name: app
        image: team-a-app:v1.0
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

## Automated Pod Mutation Webhook

Automatically inject team affinity:

```yaml
# team-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: team-pod-mutator
webhooks:
- name: team-mutator.example.com
  admissionReviewVersions: ["v1"]
  clientConfig:
    service:
      name: team-webhook
      namespace: kube-system
      path: /mutate
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  sideEffects: None
  namespaceSelector:
    matchExpressions:
    - key: team
      operator: Exists
```

The webhook adds node selectors and tolerations based on namespace labels.

## Network Policies for Team Isolation

Isolate team networks:

```yaml
# team-a-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: team-a-isolation
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from same namespace
  - from:
    - namespaceSelector:
        matchLabels:
          team: team-a
  # Allow from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  # Allow to same namespace
  - to:
    - namespaceSelector:
        matchLabels:
          team: team-a
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow external traffic
  - to:
    - namespaceSelector: {}
    ports:
    - port: 443
```

## RBAC for Team Access

Limit team access to their namespace:

```yaml
# team-a-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-a-developer
  namespace: team-a
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies", "ingresses"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-developers
  namespace: team-a
subjects:
- kind: Group
  name: team-a-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: team-a-developer
  apiGroup: rbac.authorization.k8s.io
---
# Cluster-level read-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: team-namespace-viewer
rules:
- apiGroups: [""]
  resources: ["namespaces", "nodes"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: team-a-cluster-viewer
subjects:
- kind: Group
  name: team-a-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: team-namespace-viewer
  apiGroup: rbac.authorization.k8s.io
```

## Shared Services Access

Allow teams to access shared services:

```yaml
# shared-services-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-shared-services
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  # Allow access to shared monitoring
  - to:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - port: 9090  # Prometheus
  # Allow access to shared logging
  - to:
    - namespaceSelector:
        matchLabels:
          name: logging
    ports:
    - port: 9200  # Elasticsearch
```

## Priority Classes for Fair Scheduling

Ensure fair resource allocation:

```yaml
# team-priority-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: team-a-high
value: 10000
globalDefault: false
description: "High priority for team-a critical workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: team-a-normal
value: 5000
globalDefault: false
description: "Normal priority for team-a workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: shared-low
value: 1000
globalDefault: true
description: "Low priority for shared resources"
```

## Cost Allocation and Chargeback

Track resource usage per team:

```yaml
# cost-tracking-labels.yaml
apiVersion: v1
kind: Pod
metadata:
  name: team-a-workload
  namespace: team-a
  labels:
    team: team-a
    cost-center: engineering
    environment: production
spec:
  containers:
  - name: app
    image: app:v1.0
```

Query costs with Prometheus:

```promql
# CPU usage by team
sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace, team)

# Memory usage by team
sum(container_memory_working_set_bytes) by (namespace, team)
```

## Monitoring and Alerts

Set up team-specific monitoring:

```yaml
# team-a-prometheus-rule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: team-a-alerts
  namespace: team-a
spec:
  groups:
  - name: team-a
    interval: 30s
    rules:
    - alert: TeamAQuotaExceeded
      expr: |
        sum(kube_resourcequota{namespace="team-a", type="used"}) /
        sum(kube_resourcequota{namespace="team-a", type="hard"}) > 0.9
      for: 5m
      annotations:
        summary: "Team A approaching quota limit"
    - alert: TeamAHighCPU
      expr: |
        sum(rate(container_cpu_usage_seconds_total{namespace="team-a"}[5m])) > 80
      for: 10m
      annotations:
        summary: "Team A using excessive CPU"
```

## Overflow to Shared Pool

Allow workloads to overflow to shared nodes:

```yaml
# overflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-a-overflow
  namespace: team-a
spec:
  replicas: 10
  selector:
    matchLabels:
      app: team-a-overflow
  template:
    spec:
      affinity:
        nodeAffinity:
          # Prefer team-a nodes
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: team
                operator: In
                values:
                - team-a
          # But allow shared nodes as fallback
          - weight: 10
            preference:
              matchExpressions:
              - key: team
                operator: In
                values:
                - shared
      tolerations:
      - key: "team"
        operator: "Equal"
        value: "team-a"
        effect: "NoSchedule"
      containers:
      - name: app
        image: app:v1.0
```

## Best Practices

1. **Start Simple**: Begin with namespace isolation, add node pools as needed
2. **Use Labels Consistently**: Standardize labeling across all resources
3. **Automate Injection**: Use webhooks to automatically apply team policies
4. **Monitor Quotas**: Alert teams before hitting quota limits
5. **Fair Scheduling**: Use priority classes to prevent resource hogging
6. **Network Isolation**: Always implement network policies
7. **Regular Audits**: Review resource usage and adjust quotas
8. **Document Policies**: Clearly communicate multi-tenancy rules to teams

Soft multi-tenancy with node pools provides a balance between isolation and efficiency, allowing multiple teams to share infrastructure while maintaining operational boundaries and fair resource allocation.

