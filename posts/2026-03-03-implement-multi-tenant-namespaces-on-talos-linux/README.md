# How to Implement Multi-Tenant Namespaces on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Multi-Tenancy, Namespace, Security

Description: A practical guide to implementing multi-tenant namespace isolation on Talos Linux clusters for safely sharing infrastructure across teams and organizations.

---

Running a single Talos Linux cluster for multiple tenants, whether they are different teams within your company or different customers of your platform, requires careful isolation. Each tenant needs its own space to deploy workloads without being able to see, access, or affect other tenants' resources. Multi-tenant namespaces provide this isolation at the Kubernetes level, using a combination of RBAC, network policies, resource quotas, and admission controls.

This post covers how to implement multi-tenant namespaces on Talos Linux, from the basic building blocks to advanced patterns using tools like Capsule and Kiosk.

## Multi-Tenancy Models

There are two main approaches to multi-tenancy on Kubernetes.

**Namespace-per-tenant** gives each tenant one or more namespaces within a shared cluster. Tenants share the control plane and worker nodes. This is the most common and cost-effective model.

**Cluster-per-tenant** gives each tenant their own cluster. This provides stronger isolation but costs more. On Talos Linux with Omni, you can manage many clusters, but the overhead per cluster is significant.

This post focuses on the namespace-per-tenant model, which is suitable for most internal team separation and many customer-facing SaaS platforms.

## Building Blocks of Tenant Isolation

A properly isolated tenant namespace needs five layers of controls.

### Layer 1: RBAC (Who Can Do What)

Each tenant gets its own roles and role bindings, scoped to their namespaces.

```yaml
# tenant-rbac.yaml
# Admin role for the tenant
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-admin
  namespace: tenant-acme
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-acme-admin
  namespace: tenant-acme
subjects:
  - kind: Group
    name: acme-admins
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-admin
  apiGroup: rbac.authorization.k8s.io
```

Make sure tenants cannot create ClusterRoles or ClusterRoleBindings. These are cluster-wide and would break isolation.

### Layer 2: Network Policies (What Can Talk to What)

Each tenant's namespace needs network isolation so their pods cannot communicate with other tenants' pods.

```yaml
# tenant-network-policies.yaml
# Default deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-deny-all
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow intra-tenant traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-within-tenant
  namespace: tenant-acme
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
    # DNS access
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - {protocol: UDP, port: 53}
        - {protocol: TCP, port: 53}
```

### Layer 3: Resource Quotas (How Much Can Be Used)

Each tenant gets a resource budget.

```yaml
# tenant-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme
spec:
  hard:
    requests.cpu: "8"
    limits.cpu: "16"
    requests.memory: 16Gi
    limits.memory: 32Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
    requests.storage: 100Gi
```

### Layer 4: Pod Security Standards (What Pods Can Do)

Prevent tenants from running privileged containers or accessing host resources.

```bash
# Apply restricted Pod Security Standard
kubectl label namespace tenant-acme \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest
```

### Layer 5: Admission Control (Preventing Escape)

Use admission controllers to prevent tenants from doing things that could affect other tenants.

```yaml
# Use a ValidatingWebhookConfiguration or OPA/Gatekeeper
# to enforce additional constraints

# Example Gatekeeper constraint: prevent hostPath volumes
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sBlockHostPath
metadata:
  name: block-host-path
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - "tenant-*"
```

## Using Capsule for Multi-Tenancy

Capsule is a Kubernetes-native multi-tenancy operator that simplifies tenant management. It is a great fit for Talos Linux clusters.

```bash
# Install Capsule
helm repo add capsule https://projectcapsule.github.io/charts
helm install capsule capsule/capsule \
  --namespace capsule-system \
  --create-namespace
```

### Defining a Tenant

```yaml
# tenant-acme.yaml
apiVersion: capsule.clastix.io/v1beta2
kind: Tenant
metadata:
  name: acme
spec:
  # Tenant owners can create and manage namespaces
  owners:
    - name: acme-admin
      kind: User
    - name: acme-admins
      kind: Group
  # Limit the number of namespaces
  namespaceOptions:
    quota: 5
    additionalMetadata:
      labels:
        tenant: acme
  # Resource quotas applied to each namespace
  resourceQuotas:
    scope: Tenant
    items:
      - hard:
          requests.cpu: "16"
          limits.cpu: "32"
          requests.memory: 32Gi
          limits.memory: 64Gi
          pods: "100"
  # Limit ranges for containers
  limitRanges:
    items:
      - limits:
          - type: Container
            default:
              cpu: 500m
              memory: 512Mi
            defaultRequest:
              cpu: 100m
              memory: 128Mi
            max:
              cpu: "4"
              memory: 8Gi
  # Network policies
  networkPolicies:
    items:
      - policyTypes:
          - Ingress
          - Egress
        podSelector: {}
        ingress:
          - from:
              - namespaceSelector:
                  matchLabels:
                    capsule.clastix.io/tenant: acme
        egress:
          - to:
              - namespaceSelector:
                  matchLabels:
                    capsule.clastix.io/tenant: acme
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
  # Restrict storage classes
  storageClasses:
    allowed:
      - standard
      - fast-ssd
  # Restrict ingress classes
  ingressOptions:
    allowedClasses:
      allowed:
        - nginx
```

```bash
kubectl apply -f tenant-acme.yaml
```

### Self-Service Namespace Creation

With Capsule, tenant owners can create their own namespaces.

```bash
# As the acme-admin user
kubectl create namespace acme-production
kubectl create namespace acme-staging
kubectl create namespace acme-development

# Capsule automatically applies all tenant policies
# to each namespace
```

## Tenant Isolation Verification

After setting up multi-tenancy, verify that isolation works correctly.

```bash
#!/bin/bash
# verify-tenant-isolation.sh <tenant-namespace>
NAMESPACE=$1

echo "Verifying tenant isolation for: $NAMESPACE"

# Test 1: Network isolation
echo "Test 1: Cross-tenant network access..."
# Create a test pod in the tenant namespace
kubectl -n "$NAMESPACE" run isolation-test \
  --image=busybox --command -- sleep 300

# Try to access a service in another tenant namespace
OTHER_NS="tenant-other"
kubectl -n "$NAMESPACE" exec isolation-test -- \
  wget -qO- --timeout=3 "http://some-service.${OTHER_NS}.svc.cluster.local" 2>&1
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "  PASS: Cannot access other tenant namespace"
else
  echo "  FAIL: Cross-tenant access is possible"
fi

# Test 2: RBAC isolation
echo "Test 2: Cross-tenant RBAC..."
kubectl auth can-i list pods -n "$OTHER_NS" --as system:serviceaccount:${NAMESPACE}:default
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "  PASS: Cannot list pods in other namespace"
else
  echo "  FAIL: RBAC allows cross-tenant access"
fi

# Test 3: Resource quota enforcement
echo "Test 3: Resource quota exists..."
QUOTA_COUNT=$(kubectl -n "$NAMESPACE" get resourcequota --no-headers 2>/dev/null | wc -l)
if [ "$QUOTA_COUNT" -gt 0 ]; then
  echo "  PASS: Resource quota is in place"
else
  echo "  FAIL: No resource quota"
fi

# Cleanup
kubectl -n "$NAMESPACE" delete pod isolation-test --wait=false

echo "Isolation verification complete."
```

## Monitoring Per-Tenant Resource Usage

Track resource consumption per tenant for billing, capacity planning, or chargeback.

```yaml
# Prometheus recording rules for per-tenant metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tenant-metrics
  namespace: monitoring
spec:
  groups:
    - name: tenant.recording.rules
      interval: 60s
      rules:
        # CPU usage per tenant
        - record: tenant:cpu_usage:sum
          expr: |
            sum by (label_tenant) (
              namespace_label:container_cpu_usage_seconds_total:sum_rate
              * on(namespace) group_left(label_tenant)
              kube_namespace_labels
            )
        # Memory usage per tenant
        - record: tenant:memory_usage:sum
          expr: |
            sum by (label_tenant) (
              namespace_label:container_memory_working_set_bytes:sum
              * on(namespace) group_left(label_tenant)
              kube_namespace_labels
            )
```

## Tenant Onboarding Workflow

Build a repeatable process for adding new tenants.

```bash
#!/bin/bash
# onboard-tenant.sh <tenant-name> <admin-group> <cpu> <memory>
TENANT=$1
ADMIN_GROUP=$2
CPU=${3:-"8"}
MEMORY=${4:-"16Gi"}

echo "Onboarding tenant: $TENANT"

# Create the Capsule tenant (or equivalent manual setup)
cat <<EOF | kubectl apply -f -
apiVersion: capsule.clastix.io/v1beta2
kind: Tenant
metadata:
  name: $TENANT
spec:
  owners:
    - name: $ADMIN_GROUP
      kind: Group
  namespaceOptions:
    quota: 5
    additionalMetadata:
      labels:
        tenant: $TENANT
  resourceQuotas:
    scope: Tenant
    items:
      - hard:
          requests.cpu: "${CPU}"
          limits.cpu: "$((${CPU} * 2))"
          requests.memory: "${MEMORY}"
          pods: "50"
  limitRanges:
    items:
      - limits:
          - type: Container
            default:
              cpu: 500m
              memory: 512Mi
            defaultRequest:
              cpu: 100m
              memory: 128Mi
EOF

echo "Tenant $TENANT onboarded successfully."
echo "The admin group '$ADMIN_GROUP' can now create namespaces."
```

## Handling Noisy Neighbors

Even with quotas, one tenant can affect others through API server load, storage IOPS, or network bandwidth. Additional controls help mitigate this.

```yaml
# Use Priority Classes to prevent tenant workloads
# from evicting system components
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: tenant-workload
value: 100
globalDefault: false
description: "Priority class for tenant workloads"

# System components should have higher priority
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-critical
value: 1000
globalDefault: false
description: "Priority class for system components"
```

For API server rate limiting, configure the Kubernetes API server with API Priority and Fairness.

```yaml
# Talos machine config for API Priority and Fairness
cluster:
  apiServer:
    extraArgs:
      enable-priority-and-fairness: "true"
```

## Conclusion

Multi-tenant namespaces on Talos Linux give you a cost-effective way to share infrastructure across teams or customers. The key is layering multiple isolation mechanisms: RBAC for access control, network policies for traffic isolation, resource quotas for fair sharing, pod security standards for privilege restriction, and admission controls for preventing tenant escape. Tools like Capsule streamline the management by bundling these controls into a single tenant definition. Whatever approach you choose, test your isolation thoroughly and monitor per-tenant resource usage to catch issues before they affect your tenants.
