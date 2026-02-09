# How to Build RBAC Roles for Namespace-Scoped Operators with Leader Election Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Operators, Leader Election, Namespace

Description: Learn how to create RBAC roles for namespace-scoped operators that include leader election permissions, enabling high availability without granting excessive cluster-wide privileges.

---

Kubernetes operators often run multiple replicas for high availability. Leader election ensures only one replica actively reconciles resources while others remain on standby. Most operator frameworks (controller-runtime, Operator SDK) include built-in leader election support using Leases or ConfigMaps.

Namespace-scoped operators only manage resources within specific namespaces. Their RBAC permissions should reflect this scope. Leader election resources also need proper permissions, but they can be restricted to the operator's home namespace rather than requiring cluster-wide access.

## Understanding Leader Election Resource Requirements

Leader election requires a coordination resource that candidates compete to acquire. Kubernetes supports two approaches:

**Leases (Recommended)**: Resources in the `coordination.k8s.io` API group designed specifically for leader election. Lightweight and efficient.

**ConfigMaps (Legacy)**: Some older operators use ConfigMaps for leader election. Still supported but Leases are preferred.

The operator needs `get`, `create`, `update`, and `watch` permissions on the leader election resource. These permissions can be scoped to the operator's namespace.

## Creating a Namespace-Scoped Operator Role

Build a role that allows managing custom resources and performing leader election within a single namespace:

```yaml
# namespace-operator-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: application-operator
  namespace: operator-system
rules:
# Leader election using Leases
- apiGroups: ["coordination.k8s.io"]
  resources:
    - leases
  verbs: ["get", "list", "watch", "create", "update", "patch"]

# Events for logging operator actions
- apiGroups: [""]
  resources:
    - events
  verbs: ["create", "patch"]
```

Create a separate Role in target namespaces for resource management:

```yaml
# target-namespace-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: application-operator-manager
  namespace: applications
rules:
# Manage custom resources
- apiGroups: ["example.com"]
  resources:
    - applications
    - applications/status
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Manage Deployments created by operator
- apiGroups: ["apps"]
  resources:
    - deployments
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Manage Services created by operator
- apiGroups: [""]
  resources:
    - services
    - configmaps
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Read secrets referenced by custom resources
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["get", "list", "watch"]
```

Create a ServiceAccount and bindings:

```bash
# Create ServiceAccount
kubectl create namespace operator-system
kubectl create serviceaccount application-operator -n operator-system

# Bind leader election role
kubectl create rolebinding application-operator-leader-election \
  --role=application-operator \
  --serviceaccount=operator-system:application-operator \
  --namespace=operator-system

# Bind resource management role
kubectl create rolebinding application-operator-manager \
  --role=application-operator-manager \
  --serviceaccount=operator-system:application-operator \
  --namespace=applications
```

## Configuring Operator Deployment for Leader Election

Deploy the operator with leader election enabled:

```yaml
# operator-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-operator
  namespace: operator-system
spec:
  replicas: 3  # Multiple replicas for HA
  selector:
    matchLabels:
      app: application-operator
  template:
    metadata:
      labels:
        app: application-operator
    spec:
      serviceAccountName: application-operator
      containers:
      - name: operator
        image: company/application-operator:v1.0
        command:
        - /manager
        args:
        - --leader-elect=true
        - --leader-election-id=application-operator
        - --leader-election-namespace=operator-system
        # Watch only specific namespaces
        - --namespaces=applications
        env:
        - name: OPERATOR_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
```

Apply the deployment:

```bash
kubectl apply -f operator-deployment.yaml
```

The operator uses Leases in the `operator-system` namespace for leader election and manages resources in the `applications` namespace.

## Verifying Leader Election

Check which replica is the leader:

```bash
# Get the leader lease
kubectl get lease -n operator-system

# View lease details
kubectl get lease application-operator -n operator-system -o yaml
```

Output shows:

```yaml
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  name: application-operator
  namespace: operator-system
spec:
  holderIdentity: application-operator-7d9f8b-abc123  # Current leader
  leaseDurationSeconds: 15
  renewTime: "2026-02-09T10:30:45.123456Z"
```

Check operator logs to see leader election:

```bash
kubectl logs -n operator-system -l app=application-operator

# Expected output:
# successfully acquired lease operator-system/application-operator
# Starting workers
```

Non-leader replicas show:

```bash
# attempting to acquire leader lease operator-system/application-operator
# waiting for leader election
```

## Using ConfigMaps for Legacy Leader Election

If your operator uses ConfigMap-based leader election (older controller-runtime versions):

```yaml
# leader-election-configmap-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: application-operator-legacy
  namespace: operator-system
rules:
# Leader election using ConfigMap
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  resourceNames:
    - application-operator-leader  # Specific ConfigMap name
```

Alternatively, grant access to all ConfigMaps if the operator creates the ConfigMap dynamically:

```yaml
rules:
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list", "watch", "create", "update", "patch"]
# No resourceNames means all ConfigMaps
```

Be cautious granting broad ConfigMap access as it may expose configuration data.

## Managing Multiple Namespaces with Single Operator

For operators managing resources in multiple namespaces:

```bash
# Create RoleBindings in each target namespace
for ns in app-dev app-staging app-prod; do
  kubectl create rolebinding application-operator-manager \
    --role=application-operator-manager \
    --serviceaccount=operator-system:application-operator \
    --namespace=$ns
done
```

Update operator deployment to watch multiple namespaces:

```yaml
args:
- --leader-elect=true
- --leader-election-namespace=operator-system
- --namespaces=app-dev,app-staging,app-prod
```

Leader election still occurs in `operator-system` namespace only.

## Implementing Leader Election Health Checks

Add readiness probe to expose leader status:

```yaml
containers:
- name: operator
  image: company/application-operator:v1.0
  ports:
  - name: health
    containerPort: 8081
  readinessProbe:
    httpGet:
      path: /readyz
      port: health
    initialDelaySeconds: 5
    periodSeconds: 10
```

The operator's health endpoint should report ready only when it has acquired the lease or when leader election is disabled.

## Handling Leader Election Failures

If leader election fails (e.g., lack of permissions), the operator logs errors:

```bash
kubectl logs -n operator-system -l app=application-operator | grep -i lease

# Common errors:
# failed to acquire lease: Forbidden: User cannot update leases
# failed to acquire lease: leases.coordination.k8s.io "application-operator" not found
```

Troubleshoot permission issues:

```bash
# Verify ServiceAccount has lease permissions
kubectl auth can-i update leases \
  --as=system:serviceaccount:operator-system:application-operator \
  --namespace=operator-system
# Should return: yes

# Check if lease exists
kubectl get lease application-operator -n operator-system
```

If the lease does not exist, the operator creates it on first run (requires `create` permission).

## Testing Leader Failover

Simulate leader failure to verify failover:

```bash
# Get current leader pod
LEADER_POD=$(kubectl get lease application-operator -n operator-system \
  -o jsonpath='{.spec.holderIdentity}')

echo "Current leader: $LEADER_POD"

# Delete leader pod
kubectl delete pod $LEADER_POD -n operator-system

# Watch for new leader election
kubectl get lease application-operator -n operator-system -w
```

Within seconds, another replica acquires the lease and becomes leader.

## Monitoring Leader Election Metrics

Expose Prometheus metrics for leader election:

```yaml
# ServiceMonitor for operator metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: application-operator
  namespace: operator-system
spec:
  selector:
    matchLabels:
      app: application-operator
  endpoints:
  - port: metrics
    path: /metrics
```

Query leader election metrics:

```promql
# Time since last leader election transition
time() - controller_runtime_leader_election_transition_seconds

# Leader status (1 = leader, 0 = follower)
controller_runtime_leader_election_is_leader
```

Alert on leader election failures:

```yaml
- alert: OperatorLeaderElectionFailed
  expr: controller_runtime_leader_election_is_leader == 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Operator has no active leader for 5 minutes"
```

## Security Best Practices for Leader Election

Follow these guidelines:

**Isolate Leader Election Namespace**: Use a dedicated namespace for operator deployment and leader election, separate from application workloads.

**Restrict Lease Access**: Grant lease permissions only in the operator's home namespace, not cluster-wide.

**Use Specific Lease Names**: Use `resourceNames` in RBAC rules when possible to limit access to specific leases.

**Separate Concerns**: Use different Roles for leader election (operator namespace) and resource management (target namespaces).

**Monitor Lease TTL**: Set appropriate lease duration (default 15s). Too short causes frequent re-elections, too long delays failover.

Example with restricted lease access:

```yaml
rules:
- apiGroups: ["coordination.k8s.io"]
  resources:
    - leases
  resourceNames:
    - application-operator  # Only this specific lease
  verbs: ["get", "update", "patch"]
- apiGroups: ["coordination.k8s.io"]
  resources:
    - leases
  verbs: ["create"]  # Can create the lease if it doesn't exist
```

Namespace-scoped operators with leader election provide high availability without requiring cluster-wide permissions. By properly scoping RBAC roles to specific namespaces and using Leases for coordination, operators can achieve resilience while maintaining security boundaries. Regular testing of failover scenarios ensures leader election works correctly when needed.
