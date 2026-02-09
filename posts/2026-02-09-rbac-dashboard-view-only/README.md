# How to Build RBAC Roles for Kubernetes Dashboard Users with View-Only Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Dashboard, Security, Read-Only

Description: Learn how to configure RBAC roles for Kubernetes Dashboard users with view-only permissions, providing visibility without modification capabilities for safe cluster observation.

---

Kubernetes Dashboard provides a web interface for managing cluster resources. While convenient, it also exposes powerful capabilities that can modify or delete critical resources. Many users need visibility into cluster state without the ability to make changes. Read-only Dashboard access lets stakeholders monitor applications, troubleshoot issues, and verify deployments without risk of accidental modifications.

The default Dashboard installation includes roles that grant extensive permissions. Creating custom view-only roles ensures users can see what they need while preventing destructive operations. This is particularly important for external stakeholders, junior team members, or automated monitoring systems.

## Understanding Dashboard Permission Requirements

Kubernetes Dashboard needs several permissions to display information:

**Core Resources**: Pods, Services, ConfigMaps, Secrets (metadata only), Events, Namespaces

**Workload Resources**: Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs

**Configuration Resources**: ResourceQuotas, LimitRanges, PersistentVolumeClaims

**Network Resources**: Ingresses, NetworkPolicies

**Cluster Resources**: Nodes, PersistentVolumes, StorageClasses

**Metrics**: Access to metrics-server for resource usage graphs

The Dashboard also needs to read RBAC resources to show role assignments, though this can be restricted for security.

## Creating a View-Only ClusterRole

Build a ClusterRole that grants read permissions across all namespaces:

```yaml
# dashboard-viewer-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-viewer
rules:
# Core resources
- apiGroups: [""]
  resources:
    - pods
    - pods/log
    - services
    - endpoints
    - configmaps
    - events
    - persistentvolumeclaims
    - replicationcontrollers
  verbs: ["get", "list", "watch"]

# Secrets - metadata only, no data
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["list"]  # Only list, no get (prevents reading secret data)

# Workload resources
- apiGroups: ["apps"]
  resources:
    - deployments
    - daemonsets
    - replicasets
    - statefulsets
  verbs: ["get", "list", "watch"]

# Batch resources
- apiGroups: ["batch"]
  resources:
    - jobs
    - cronjobs
  verbs: ["get", "list", "watch"]

# Networking
- apiGroups: ["networking.k8s.io"]
  resources:
    - ingresses
    - networkpolicies
  verbs: ["get", "list", "watch"]

# Autoscaling
- apiGroups: ["autoscaling"]
  resources:
    - horizontalpodautoscalers
  verbs: ["get", "list", "watch"]

# Configuration
- apiGroups: [""]
  resources:
    - resourcequotas
    - limitranges
  verbs: ["get", "list", "watch"]

# Policy
- apiGroups: ["policy"]
  resources:
    - poddisruptionbudgets
  verbs: ["get", "list", "watch"]

# Cluster resources
- apiGroups: [""]
  resources:
    - nodes
    - namespaces
    - persistentvolumes
  verbs: ["get", "list", "watch"]

- apiGroups: ["storage.k8s.io"]
  resources:
    - storageclasses
  verbs: ["get", "list", "watch"]

# Metrics
- apiGroups: ["metrics.k8s.io"]
  resources:
    - pods
    - nodes
  verbs: ["get", "list"]
```

Apply the ClusterRole:

```bash
kubectl apply -f dashboard-viewer-clusterrole.yaml
```

## Creating a Namespace-Scoped Viewer Role

For users who should only see specific namespaces:

```yaml
# namespace-viewer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-viewer
  namespace: production
rules:
# All namespace-scoped read permissions
- apiGroups: ["", "apps", "batch", "networking.k8s.io", "autoscaling", "policy"]
  resources:
    - pods
    - pods/log
    - services
    - endpoints
    - configmaps
    - events
    - deployments
    - replicasets
    - statefulsets
    - daemonsets
    - jobs
    - cronjobs
    - ingresses
    - networkpolicies
    - horizontalpodautoscalers
    - poddisruptionbudgets
    - persistentvolumeclaims
  verbs: ["get", "list", "watch"]

# Secrets - list only
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["list"]

# Configuration resources
- apiGroups: [""]
  resources:
    - resourcequotas
    - limitranges
  verbs: ["get", "list", "watch"]
```

Apply and bind to a team:

```bash
kubectl apply -f namespace-viewer-role.yaml

kubectl create rolebinding team-alpha-viewers \
  --role=namespace-viewer \
  --group=team-alpha \
  --namespace=production
```

## Configuring Dashboard ServiceAccount

Create a ServiceAccount for the Dashboard with view-only permissions:

```bash
kubectl create serviceaccount dashboard-viewer -n kubernetes-dashboard

# Bind cluster-wide view permissions
kubectl create clusterrolebinding dashboard-viewer-binding \
  --clusterrole=dashboard-viewer \
  --serviceaccount=kubernetes-dashboard:dashboard-viewer
```

Get the ServiceAccount token for Dashboard login:

```bash
# Create a token (Kubernetes 1.24+)
kubectl create token dashboard-viewer -n kubernetes-dashboard --duration=87600h

# For long-lived tokens, create a Secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: dashboard-viewer-token
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/service-account.name: dashboard-viewer
type: kubernetes.io/service-account-token
EOF

# Get the token
kubectl get secret dashboard-viewer-token -n kubernetes-dashboard -o jsonpath='{.data.token}' | base64 -d
```

Use this token to log into the Dashboard with view-only access.

## Restricting Secret Data Access

The configuration above allows listing secrets but not reading their data. When users view secrets in the Dashboard, they see names and metadata but not the actual values:

```yaml
# Enhanced secret restrictions
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["list"]  # Can see secret names
# No "get" verb means cannot read secret values
```

If you want to completely hide secrets from view:

```yaml
# Remove secrets from rules entirely
# Users won't see secrets listed at all
```

## Enabling Exec and Log Streaming in Dashboard

If you want users to view logs and exec into pods through the Dashboard:

```yaml
# dashboard-viewer-with-logs.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-viewer-with-logs
rules:
# Include all rules from dashboard-viewer
# ... (previous rules)

# Add log access
- apiGroups: [""]
  resources:
    - pods/log
  verbs: ["get", "list"]

# Add exec access (optional, not truly read-only)
- apiGroups: [""]
  resources:
    - pods/exec
  verbs: ["create"]
```

Note that exec access is not read-only, as users can run commands in containers. Only grant it if necessary.

## Creating Multi-Tier Dashboard Access

Define different access levels:

```yaml
# dashboard-viewer-basic.yaml - Minimal access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-viewer-basic
rules:
- apiGroups: ["", "apps"]
  resources:
    - pods
    - services
    - deployments
    - events
  verbs: ["get", "list", "watch"]
```

```yaml
# dashboard-viewer-advanced.yaml - More visibility
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-viewer-advanced
rules:
# Include all resources (as defined in first ClusterRole)
# Plus logs and metrics
- apiGroups: [""]
  resources:
    - pods/log
  verbs: ["get", "list"]

- apiGroups: ["metrics.k8s.io"]
  resources:
    - pods
    - nodes
  verbs: ["get", "list"]
```

Assign roles based on user needs:

```bash
# Basic access for external stakeholders
kubectl create clusterrolebinding stakeholder-view \
  --clusterrole=dashboard-viewer-basic \
  --group=stakeholders

# Advanced access for operations team
kubectl create clusterrolebinding ops-view \
  --clusterrole=dashboard-viewer-advanced \
  --group=operations-team
```

## Testing Dashboard Permissions

Verify the view-only role works correctly:

```bash
# Test with kubectl as the dashboard-viewer ServiceAccount
kubectl auth can-i get pods --as=system:serviceaccount:kubernetes-dashboard:dashboard-viewer
# Should return: yes

kubectl auth can-i delete pods --as=system:serviceaccount:kubernetes-dashboard:dashboard-viewer
# Should return: no

kubectl auth can-i get secrets --as=system:serviceaccount:kubernetes-dashboard:dashboard-viewer
# Should return: no (if you restricted secret data access)

kubectl auth can-i list secrets --as=system:serviceaccount:kubernetes-dashboard:dashboard-viewer
# Should return: yes (can list secret names)
```

Log into the Dashboard with the viewer token and verify:

- Can view all resources
- Cannot delete or edit anything
- Cannot see secret data values
- Cannot create new resources

## Implementing Dashboard Access Auditing

Track who accesses the Dashboard and what they view:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log Dashboard ServiceAccount actions
- level: Metadata
  users:
    - "system:serviceaccount:kubernetes-dashboard:dashboard-viewer"
  omitStages:
    - RequestReceived
```

Monitor Dashboard usage:

```bash
# Find Dashboard access patterns
jq 'select(.user.username | startswith("system:serviceaccount:kubernetes-dashboard")) |
    {user: .user.username, verb: .verb, resource: .objectRef.resource}' \
    /var/log/kubernetes/audit.log | head -20
```

## Securing Dashboard Access

Beyond RBAC, secure the Dashboard itself:

**Use HTTPS Only**: Never expose Dashboard over HTTP.

**Require Authentication**: Disable anonymous access.

```yaml
# dashboard-deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: kubernetes-dashboard
        args:
          - --auto-generate-certificates
          - --enable-skip-login=false  # Require authentication
          - --token-ttl=43200  # 12-hour token expiration
```

**Limit Network Access**: Use NetworkPolicy to restrict Dashboard access:

```yaml
# dashboard-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dashboard-access
  namespace: kubernetes-dashboard
spec:
  podSelector:
    matchLabels:
      k8s-app: kubernetes-dashboard
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx  # Only allow ingress controller
    ports:
    - protocol: TCP
      port: 8443
```

**Implement SSO**: Integrate with corporate identity provider:

```yaml
# Use an authentication proxy like oauth2-proxy
# or Pinniped for SSO integration
```

## Creating Custom Dashboard Views

For external stakeholders who need simplified views, deploy a custom read-only interface:

```yaml
# custom-viewer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-cluster-viewer
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: custom-viewer
  template:
    metadata:
      labels:
        app: custom-viewer
    spec:
      serviceAccountName: dashboard-viewer
      containers:
      - name: viewer
        image: company/custom-viewer:latest
        # Custom app that uses Kubernetes API with read-only permissions
```

This approach lets you build tailored interfaces that show only relevant information without exposing the full Dashboard.

View-only Dashboard access balances transparency with security. By carefully scoping RBAC permissions, you enable stakeholders to monitor cluster state and troubleshoot issues without risk of accidental modifications. Combined with audit logging and network security controls, read-only Dashboard access provides safe visibility into Kubernetes environments.
