# How to Create Kubernetes Namespace Isolation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Security, Multi-tenancy, DevOps

Description: Implement namespace isolation in Kubernetes using network policies, resource quotas, and RBAC for secure multi-tenant cluster environments.

---

Running multiple teams or applications on a shared Kubernetes cluster without proper isolation is asking for trouble. One team's runaway pod can starve resources from another. A compromised workload can move laterally across the cluster. Namespace isolation solves these problems by creating strong boundaries between tenants.

## Understanding Namespaces

Namespaces divide cluster resources between multiple users or teams. They provide a scope for names, but by themselves, they don't provide any security isolation.

### Creating Namespaces with Labels

Create a namespace with labels for policy enforcement and organization.

```yaml
# namespace-team-alpha.yaml
# Creates an isolated namespace with metadata labels for policy selection
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    environment: production
    team: alpha
    isolation: strict
```

### Comparison: Namespace Isolation Techniques

| Technique | What It Controls | Scope | Enforcement |
|-----------|------------------|-------|-------------|
| Network Policies | Pod-to-pod traffic | L3/L4 networking | CNI plugin |
| Resource Quotas | CPU, memory, object counts | Resource consumption | API server |
| LimitRanges | Default/max container resources | Pod specifications | API server |
| RBAC | API access permissions | Kubernetes API | API server |
| Pod Security Standards | Pod security contexts | Runtime security | Admission controller |

## Network Policies for Namespace Isolation

Network Policies are the primary tool for network-level isolation. Without them, any pod can communicate with any other pod in the cluster.

### Default Deny All Traffic

Start with a default deny policy for both ingress and egress.

```yaml
# default-deny-all.yaml
# Blocks all ingress and egress traffic for pods in this namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Allow DNS Resolution

After applying default deny, pods cannot resolve DNS. This policy restores DNS access.

```yaml
# allow-dns.yaml
# Permits all pods in the namespace to query the cluster DNS service
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Isolate Namespace Traffic

Allow pods within the same namespace to communicate, but block cross-namespace traffic.

```yaml
# namespace-isolation.yaml
# Restricts communication to pods within the same namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: namespace-isolation
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
```

### Allow Ingress Controller Access

Pods need to receive traffic from an ingress controller in another namespace.

```yaml
# allow-ingress-controller.yaml
# Permits the ingress controller to route traffic to pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: team-alpha
spec:
  podSelector:
    matchLabels:
      expose: "true"
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

### Allow Monitoring Access

Prometheus needs to scrape metrics from pods across namespaces.

```yaml
# allow-prometheus-scrape.yaml
# Allows Prometheus to scrape metrics endpoints from pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
```

## Resource Quotas for Namespace Isolation

Resource Quotas prevent one namespace from consuming all cluster resources.

### Compute Resource Quota

Define CPU and memory limits for a namespace.

```yaml
# resource-quota.yaml
# Sets hard limits on compute resources for the namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
```

### Object Count Quotas

Limit the number of Kubernetes objects to prevent resource exhaustion.

```yaml
# object-quota.yaml
# Limits the number of various Kubernetes objects
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-quota
  namespace: team-alpha
spec:
  hard:
    configmaps: "50"
    persistentvolumeclaims: "20"
    secrets: "100"
    services: "30"
    services.loadbalancers: "2"
    services.nodeports: "5"
```

### Storage Quotas

Control storage consumption per namespace.

```yaml
# storage-quota.yaml
# Limits storage resources to prevent disk exhaustion
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-alpha
spec:
  hard:
    requests.storage: 100Gi
    persistentvolumeclaims: "10"
    fast-ssd.storageclass.storage.k8s.io/requests.storage: 50Gi
```

### Viewing Quota Usage

```bash
# View quota status
kubectl get resourcequota -n team-alpha

# Detailed quota information
kubectl describe resourcequota compute-quota -n team-alpha
```

## LimitRanges for Default Resource Limits

LimitRanges set default resource requests and limits for containers that don't specify them.

### Container LimitRange

```yaml
# limitrange.yaml
# Defines default resource requests and limits for containers
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-alpha
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: 512Mi
      defaultRequest:
        cpu: "100m"
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: "50m"
        memory: 64Mi
```

### PVC LimitRange

```yaml
# pvc-limitrange.yaml
# Constrains PersistentVolumeClaim sizes
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limits
  namespace: team-alpha
spec:
  limits:
    - type: PersistentVolumeClaim
      max:
        storage: 50Gi
      min:
        storage: 1Gi
```

### Comparison: Resource Quotas vs LimitRanges

| Feature | Resource Quota | LimitRange |
|---------|---------------|------------|
| Scope | Namespace-wide totals | Per-object defaults |
| Purpose | Cap total consumption | Set sensible defaults |
| Enforcement | Blocks pod creation when exceeded | Rejects invalid pod specs |
| Use Case | Capacity planning | Prevent runaway containers |

## RBAC for Namespace Isolation

Role-Based Access Control restricts who can access resources within a namespace.

### Namespace-Scoped Role

```yaml
# developer-role.yaml
# Grants typical developer permissions within a namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: team-alpha
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

### RoleBinding for Users

```yaml
# developer-rolebinding.yaml
# Binds the developer role to users in the team
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: team-alpha
subjects:
  - kind: User
    name: alice@example.com
    apiGroup: rbac.authorization.k8s.io
  - kind: Group
    name: team-alpha-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

### Service Account for Applications

```yaml
# app-serviceaccount.yaml
# Service account with minimal permissions for application pods
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-service
  namespace: team-alpha
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-service-role
  namespace: team-alpha
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["api-credentials"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-service-binding
  namespace: team-alpha
subjects:
  - kind: ServiceAccount
    name: api-service
    namespace: team-alpha
roleRef:
  kind: Role
  name: api-service-role
  apiGroup: rbac.authorization.k8s.io
```

### Testing RBAC Permissions

```bash
# Check if a user can perform an action
kubectl auth can-i create deployments -n team-alpha --as alice@example.com

# List all permissions for a user in a namespace
kubectl auth can-i --list -n team-alpha --as alice@example.com
```

## Namespace Labels for Policy Enforcement

Labels on namespaces are critical for Network Policies and Pod Security Standards.

### Pod Security Standards via Labels

```yaml
# namespace-with-security.yaml
# Namespace with Pod Security Standards enforced
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

### Pod Security Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| privileged | No restrictions | System components |
| baseline | Prevents known privilege escalations | General workloads |
| restricted | Heavily restricted | Sensitive workloads |

## Complete Namespace Setup Script

```bash
#!/bin/bash
# setup-isolated-namespace.sh
NAMESPACE=$1
TEAM=$2

# Create namespace with labels
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $NAMESPACE
  labels:
    team: $TEAM
    isolation: strict
    pod-security.kubernetes.io/enforce: baseline
EOF

# Apply default deny network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
EOF

# Apply resource quota
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
EOF

# Apply limit range
kubectl apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: $NAMESPACE
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: 512Mi
      defaultRequest:
        cpu: "100m"
        memory: 128Mi
EOF

echo "Namespace $NAMESPACE created with full isolation"
```

## Troubleshooting

### Common Issues

**Pods cannot resolve DNS**
```bash
kubectl get networkpolicy -n team-alpha | grep dns
```

**Pods fail to schedule due to quota**
```bash
kubectl describe resourcequota -n team-alpha
```

**RBAC permission denied**
```bash
kubectl auth can-i --list -n team-alpha --as user@example.com
```

---

Namespace isolation is not optional in multi-tenant clusters. Start with network policies and default deny, add resource quotas to prevent resource exhaustion, use RBAC to control access, and enforce pod security standards. The upfront work pays off when you avoid cross-tenant security incidents and resource contention issues.
