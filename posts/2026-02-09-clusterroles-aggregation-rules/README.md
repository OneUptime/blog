# How to Configure ClusterRoles with Aggregation Rules for Dynamic Permission Composition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Configure Kubernetes ClusterRoles with aggregation rules to dynamically compose permissions from multiple sources and maintain modular RBAC policies.

---

ClusterRole aggregation allows you to build composite roles by combining multiple smaller roles based on label selectors. This pattern creates modular, maintainable RBAC policies where you define atomic permission sets and aggregate them into higher-level roles. Changes to aggregated roles automatically propagate to the composite role.

## Understanding ClusterRole Aggregation

Aggregation rules use label selectors to find other ClusterRoles and merge their permissions into a single role. When you create or modify a ClusterRole with matching labels, Kubernetes automatically updates the aggregated role. This dynamic behavior eliminates manual permission management.

Kubernetes uses this pattern internally. The default admin, edit, and view ClusterRoles aggregate permissions from multiple sources, allowing custom controllers to extend these roles by creating new ClusterRoles with appropriate labels.

## Creating Basic Aggregated Roles

Define atomic permission sets as separate ClusterRoles.

```yaml
# rbac-read-deployments.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: read-deployments
  labels:
    rbac.example.com/aggregate-to-reader: "true"
    rbac.example.com/aggregate-to-operator: "true"
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
```

```yaml
# rbac-manage-deployments.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: manage-deployments
  labels:
    rbac.example.com/aggregate-to-operator: "true"
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "update", "patch", "delete"]
```

Create aggregated roles that combine these permissions.

```yaml
# rbac-aggregated-reader.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-reader
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-reader: "true"
rules: []  # Rules are automatically populated
```

```yaml
# rbac-aggregated-operator.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-operator
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-operator: "true"
rules: []  # Automatically includes both read and manage permissions
```

## Building Modular Permission Sets

Create fine-grained roles for different resource types.

```yaml
# rbac-pods-read.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pods-read
  labels:
    rbac.component: pods
    rbac.permission: read
    rbac.aggregate.viewer: "true"
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pods-debug
  labels:
    rbac.component: pods
    rbac.permission: debug
    rbac.aggregate.debugger: "true"
rules:
- apiGroups: [""]
  resources: ["pods/exec", "pods/portforward"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: services-read
  labels:
    rbac.component: services
    rbac.permission: read
    rbac.aggregate.viewer: "true"
rules:
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["endpoints"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: services-manage
  labels:
    rbac.component: services
    rbac.permission: manage
    rbac.aggregate.admin: "true"
rules:
- apiGroups: [""]
  resources: ["services"]
  verbs: ["create", "update", "patch", "delete"]
```

## Composing Roles by Permission Level

Aggregate roles based on permission levels.

```yaml
# rbac-viewer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-viewer
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.aggregate.viewer: "true"
rules: []
---
# rbac-debugger-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-debugger
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.aggregate.viewer: "true"
  - matchLabels:
      rbac.aggregate.debugger: "true"
rules: []
---
# rbac-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin-scoped
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.aggregate.viewer: "true"
  - matchLabels:
      rbac.aggregate.debugger: "true"
  - matchLabels:
      rbac.aggregate.admin: "true"
rules: []
```

## Extending Built-in Roles

Add permissions to Kubernetes default roles.

```yaml
# rbac-extend-view.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-view-extensions
  labels:
    rbac.authorization.k8s.io/aggregate-to-view: "true"
rules:
# Add custom resource viewing
- apiGroups: ["custom.example.com"]
  resources: ["widgets"]
  verbs: ["get", "list", "watch"]
# Add metrics viewing
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
```

```yaml
# rbac-extend-edit.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-edit-extensions
  labels:
    rbac.authorization.k8s.io/aggregate-to-edit: "true"
    rbac.authorization.k8s.io/aggregate-to-admin: "true"
rules:
# Add custom resource editing
- apiGroups: ["custom.example.com"]
  resources: ["widgets"]
  verbs: ["create", "update", "patch", "delete"]
```

Now the built-in view and edit roles automatically include these custom permissions.

## Creating Component-Specific Aggregations

Build roles for specific application components.

```yaml
# rbac-monitoring-permissions.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-metrics
  labels:
    rbac.app: monitoring
    rbac.aggregate.monitoring: "true"
rules:
- apiGroups: [""]
  resources: ["pods", "nodes", "services"]
  verbs: ["get", "list"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-config
  labels:
    rbac.app: monitoring
    rbac.aggregate.monitoring: "true"
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["prometheus-config", "grafana-config"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-aggregated
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.aggregate.monitoring: "true"
rules: []
```

## Implementing Multi-Criteria Aggregation

Use multiple selectors for complex composition.

```yaml
# rbac-multi-selector.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-role
aggregationRule:
  clusterRoleSelectors:
  # Include all read permissions
  - matchLabels:
      rbac.permission: read
  # Include development tools
  - matchExpressions:
    - key: rbac.environment
      operator: In
      values: ["dev", "staging"]
  # Include specific components
  - matchExpressions:
    - key: rbac.component
      operator: In
      values: ["pods", "services", "deployments"]
    - key: rbac.permission
      operator: In
      values: ["read", "manage"]
rules: []
```

## Dynamic Permission Updates

When you add new ClusterRoles with matching labels, aggregated roles update automatically.

```yaml
# rbac-new-permission.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ingress-read
  labels:
    rbac.component: ingress
    rbac.permission: read
    rbac.aggregate.viewer: "true"  # Automatically added to cluster-viewer
rules:
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
```

Verify the aggregation.

```bash
# Check aggregated permissions
kubectl describe clusterrole cluster-viewer

# You'll see the ingress-read rules included automatically
```

## Managing Operator Permissions

Create extensible operator roles.

```yaml
# rbac-operator-base.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: operator-crd-access
  labels:
    rbac.operator: "true"
rules:
- apiGroups: ["apiextensions.k8s.io"]
  resources: ["customresourcedefinitions"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: operator-events
  labels:
    rbac.operator: "true"
rules:
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: operator-aggregated
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.operator: "true"
rules: []
```

## Testing Aggregated Roles

Verify aggregation behavior.

```bash
# Create test aggregated role
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: test-aggregated
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      test-aggregate: "true"
rules: []
EOF

# Create component role
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: test-component
  labels:
    test-aggregate: "true"
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get"]
EOF

# Check aggregation (wait a few seconds)
kubectl get clusterrole test-aggregated -o yaml

# You should see the pods rules included
```

## Documenting Aggregation Patterns

Add metadata to clarify aggregation design.

```yaml
# rbac-documented-aggregation.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-engineer
  annotations:
    description: "Aggregated role for platform engineering team"
    aggregation-pattern: "Combines read, debug, and manage permissions"
    maintenance: "Add new permissions by creating ClusterRoles with appropriate labels"
    labels-used: "rbac.aggregate.viewer, rbac.aggregate.debugger, rbac.aggregate.admin"
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.aggregate.viewer: "true"
  - matchLabels:
      rbac.aggregate.debugger: "true"
  - matchLabels:
      rbac.aggregate.admin: "true"
rules: []
```

ClusterRole aggregation creates maintainable, modular RBAC policies. Define atomic permission sets as labeled ClusterRoles and compose them into higher-level roles using aggregation rules. This pattern reduces duplication, allows dynamic updates, and makes permission management more transparent. Use consistent labeling schemes and document your aggregation patterns to help teams understand and extend RBAC policies.
