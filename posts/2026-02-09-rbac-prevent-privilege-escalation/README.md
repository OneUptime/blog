# How to Implement RBAC Policies That Prevent Privilege Escalation via Role Editing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Implement RBAC policies that prevent privilege escalation by restricting the ability to create or modify roles and role bindings that grant higher permissions.

---

Privilege escalation occurs when users create or modify RBAC resources to grant themselves additional permissions. A user with permission to edit roles could add cluster-admin to their own role binding, bypassing intended access controls. Preventing this requires careful RBAC design that limits who can modify authorization policies.

## Understanding Privilege Escalation Vectors

The escalate, bind, and impersonate verbs in RBAC control privilege escalation. The escalate verb prevents users from creating roles with more permissions than they have. The bind verb controls creating role bindings. The impersonate verb allows acting as another user or service account.

Without proper controls, a user with edit access to roles could grant themselves any permission, defeating the purpose of RBAC.

## Creating Non-Escalating Role Management

Build roles that allow managing specific roles without escalation.

```yaml
# rbac-safe-role-manager.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: safe-role-manager
rules:
# Can create and manage roles
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Can create and manage role bindings
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["rolebindings"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Cannot escalate - can only create roles with permissions they already have
# Cannot bind - cannot create bindings to roles with more permissions
# This is enforced by the Kubernetes API server automatically
```

When users try to create roles with permissions they don't have, Kubernetes blocks the operation.

```bash
# User has only 'get' on pods
# Trying to create role with 'delete' on pods fails
kubectl create role pod-deleter --verb=delete --resource=pods
# Error: attempt to grant extra privileges
```

## Implementing Restricted Role Binding Creation

Allow creating bindings only for specific roles.

```yaml
# rbac-limited-binding-creator.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-role-binder
rules:
# Can create role bindings
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["rolebindings"]
  verbs: ["create", "update", "patch"]

# Can only bind specific roles (using resourceNames)
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["clusterroles"]
  resourceNames:
    - "view"
    - "edit"
    - "developer-custom"
  verbs: ["bind"]

# Cannot bind cluster-admin or other high-privilege roles
```

This role allows binding the view, edit, and developer-custom roles but prevents binding cluster-admin.

## Preventing Impersonation Abuse

Restrict who can impersonate other users.

```yaml
# rbac-no-impersonation.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-role
rules:
# Normal development permissions
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]

- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "create", "update", "patch"]

# Explicitly no impersonate permission
# Users cannot act as other users or service accounts
```

Only grant impersonate to trusted administrators.

```yaml
# rbac-admin-impersonate.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin-impersonate
  annotations:
    description: "Allows impersonation for debugging RBAC issues"
    restricted-to: "cluster-admins only"
rules:
# Can impersonate users
- apiGroups: [""]
  resources: ["users"]
  verbs: ["impersonate"]

# Can impersonate groups
- apiGroups: [""]
  resources: ["groups"]
  verbs: ["impersonate"]

# Can impersonate service accounts
- apiGroups: [""]
  resources: ["serviceaccounts"]
  verbs: ["impersonate"]
```

## Creating Namespace-Scoped Role Administration

Allow teams to manage roles in their namespaces without cluster-wide escalation.

```yaml
# rbac-namespace-role-admin.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-role-admin
  namespace: team-a
rules:
# Can manage roles in this namespace
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Can manage role bindings in this namespace
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["rolebindings"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Can bind cluster roles
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["clusterroles"]
  resourceNames:
    - "view"
    - "edit"
  verbs: ["bind"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-role-admin-binding
  namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: namespace-role-admin
subjects:
- kind: Group
  name: "team-a-leads"
  apiGroup: rbac.authorization.k8s.io
```

Team leads can manage RBAC in their namespace but cannot escalate beyond namespace scope.

## Implementing RBAC Approval Workflows

Require approval for RBAC changes using admission controllers.

```yaml
# validating-webhook-rbac-approval.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: rbac-change-approval
webhooks:
- name: rbac-approval.example.com
  rules:
  - operations: ["CREATE", "UPDATE", "DELETE"]
    apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  clientConfig:
    service:
      name: rbac-approval-webhook
      namespace: kube-system
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

The webhook checks for approval annotations or tickets.

```yaml
# rbac-with-approval.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: new-admin-binding
  annotations:
    approval-ticket: "SEC-1234"
    approved-by: "security-team@company.com"
    approved-at: "2026-02-09T10:00:00Z"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: User
  name: "newadmin@company.com"
  apiGroup: rbac.authorization.k8s.io
```

## Auditing RBAC Escalation Attempts

Monitor for privilege escalation attempts.

```bash
# Find users with escalate permission
kubectl get clusterroles,roles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[]? == "escalate") |
    {name: .metadata.name, namespace: .metadata.namespace}'

# Find users with bind permission
kubectl get clusterroles,roles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[]? == "bind") |
    {name: .metadata.name, namespace: .metadata.namespace}'

# Find users with impersonate permission
kubectl get clusterroles,roles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[]? == "impersonate") |
    {name: .metadata.name, namespace: .metadata.namespace}'

# Check audit logs for escalation attempts
jq -r 'select(.verb=="create" and .objectRef.resource=="roles" and
    .responseStatus.code==403 and
    (.responseStatus.message | contains("escalate"))) |
  "\(.requestReceivedTimestamp) \(.user.username) attempted to escalate privileges"' \
  /var/log/kubernetes/audit.log
```

## Creating Separation of Duties

Separate RBAC administration from usage.

```yaml
# rbac-separation-of-duties.yaml
---
# Role creators cannot bind roles
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: role-creator
rules:
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "clusterroles"]
  verbs: ["create", "update", "patch"]
# No bind permission
---
# Role binders cannot create roles
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: role-binder
rules:
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["rolebindings", "clusterrolebindings"]
  verbs: ["create", "update", "patch"]

- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["clusterroles"]
  resourceNames:
    - "view"
    - "edit"
  verbs: ["bind"]
# No role creation permission
```

Assign these roles to different groups.

```yaml
# rbac-separation-bindings.yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: security-team-role-creators
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: role-creator
subjects:
- kind: Group
  name: "security-team"
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: team-leads-role-binders
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: role-binder
subjects:
- kind: Group
  name: "team-leads"
  apiGroup: rbac.authorization.k8s.io
```

## Implementing RBAC Change Notifications

Alert on RBAC modifications.

```yaml
# rbac-change-alert.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rbac-audit-config
  namespace: kube-system
data:
  alert-webhook: "https://alerts.company.com/rbac-changes"
  alert-channels: "security-team,audit-log"
```

Use audit logs to trigger alerts.

```bash
# Monitor RBAC changes
tail -f /var/log/kubernetes/audit.log | \
  jq -r 'select(.objectRef.resource | contains("role")) |
    "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.objectRef.resource)/\(.objectRef.name)"' | \
  while read -r event; do
    # Send alert
    curl -X POST https://alerts.company.com/rbac-changes \
      -H 'Content-Type: application/json' \
      -d "{\"event\": \"$event\"}"
  done
```

## Testing Escalation Prevention

Verify escalation prevention works.

```bash
# Create user with limited permissions
kubectl create sa test-user -n default

kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: test-user-role
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
EOF

kubectl create rolebinding test-user-binding -n default \
  --role=test-user-role \
  --serviceaccount=default:test-user

# Try to create role with escalated permissions (should fail)
kubectl auth can-i create role --as=system:serviceaccount:default:test-user
# yes - can create roles

# But trying to create a role with more permissions fails
kubectl create role pod-deleter --verb=delete --resource=pods -n default \
  --as=system:serviceaccount:default:test-user
# Error: attempt to grant extra privileges

# Try to bind cluster-admin (should fail)
kubectl create rolebinding admin-binding -n default \
  --clusterrole=cluster-admin \
  --serviceaccount=default:test-user \
  --as=system:serviceaccount:default:test-user
# Error: attempt to grant extra privileges
```

## Implementing RBAC GitOps

Manage RBAC through version-controlled infrastructure.

```yaml
# .github/workflows/rbac-changes.yaml
name: RBAC Changes Review

on:
  pull_request:
    paths:
      - 'rbac/**/*.yaml'

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Check for escalation risks
        run: |
          # Check for cluster-admin bindings
          if grep -r "cluster-admin" rbac/; then
            echo "⚠️  Warning: cluster-admin binding detected"
            echo "Requires security team approval"
          fi

          # Check for escalate/bind/impersonate
          if grep -r "escalate\|bind\|impersonate" rbac/; then
            echo "⚠️  Warning: Privileged RBAC operation detected"
          fi

      - name: Require approval
        uses: github/required-reviews@v1
        with:
          required-reviewers: security-team
```

Preventing privilege escalation requires restricting access to RBAC resources and using Kubernetes built-in protections. The API server prevents users from creating roles with more permissions than they have, but you must carefully control the escalate, bind, and impersonate verbs. Implement separation of duties, audit RBAC changes, and use admission controllers for approval workflows to maintain secure RBAC policies.
