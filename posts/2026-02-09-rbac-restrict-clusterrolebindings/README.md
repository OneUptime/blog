# How to Configure RBAC to Restrict Creation of ClusterRoleBindings to Platform Admins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security, ClusterRoleBinding, Access Control

Description: Learn how to implement RBAC policies that prevent regular users from creating ClusterRoleBindings, protecting against privilege escalation and maintaining cluster-wide security boundaries.

---

ClusterRoleBindings grant cluster-wide permissions to users, groups, or service accounts. Unlike RoleBindings which are scoped to a single namespace, ClusterRoleBindings affect the entire cluster. A user who can create ClusterRoleBindings can grant themselves or others cluster-admin privileges, completely bypassing all security controls.

The ability to create ClusterRoleBindings is a cluster-level privilege that should be restricted to platform administrators. Even senior developers or team leads should not have this permission in production clusters. This restriction is critical for preventing privilege escalation and maintaining security boundaries.

## Understanding the Privilege Escalation Risk

The attack path is straightforward. If a user has permission to create ClusterRoleBindings and can reference any ClusterRole, they can grant themselves cluster-admin:

```bash
# Malicious or accidental privilege escalation
kubectl create clusterrolebinding escalate-privileges \
  --clusterrole=cluster-admin \
  --user=attacker@company.com
```

Even if the user does not initially have cluster-admin permissions, this command gives it to them. From that point, they have unrestricted access to all cluster resources, all namespaces, and all secrets.

Kubernetes includes automatic privilege escalation prevention that stops users from creating RoleBindings or ClusterRoleBindings that grant permissions the user does not already have. However, this protection only works if the initial RBAC configuration is correct.

## Verifying Default RBAC Protection

By default, Kubernetes does not allow regular users to create ClusterRoleBindings. Verify this protection is in place:

```bash
# Check if a regular user can create ClusterRoleBindings
kubectl auth can-i create clusterrolebindings --as=developer@company.com
# Should return: no

# Check who CAN create ClusterRoleBindings
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.name=="cluster-admin") |
  {binding: .metadata.name, subjects: .subjects}'
```

Only the cluster-admin role and system:masters group should have permission to create ClusterRoleBindings.

## Finding Overly Permissive Roles

Audit your cluster for roles that might allow ClusterRoleBinding creation:

```bash
# Find all ClusterRoles with clusterrolebinding create permission
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]? |
    select(.apiGroups[]? == "rbac.authorization.k8s.io" and
           .resources[]? == "clusterrolebindings" and
           (.verbs[]? == "create" or .verbs[]? == "*"))) |
  .metadata.name'
```

Expected results should only show:

- `cluster-admin` (full cluster access)
- `system:controller:clusterrole-aggregation-controller` (system component)

Any custom roles in this output need review. If you have custom roles that grant ClusterRoleBinding creation, verify they are only bound to platform administrators.

## Restricting ClusterRoleBinding Management

Create explicit policies that allow platform admins to manage ClusterRoleBindings while preventing others:

```yaml
# platform-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-admin
rules:
# Full RBAC management at cluster level
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - clusterroles
    - clusterrolebindings
  verbs: ["*"]

# Full RBAC management at namespace level
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - roles
    - rolebindings
  verbs: ["*"]

# Other platform admin responsibilities
- apiGroups: [""]
  resources:
    - namespaces
    - nodes
    - persistentvolumes
  verbs: ["*"]
```

Bind it to a small group of trusted administrators:

```yaml
# platform-admin-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: platform-admin
subjects:
- kind: Group
  name: "platform-admins"  # LDAP/OIDC group
  apiGroup: rbac.authorization.k8s.io
```

Apply these manifests:

```bash
kubectl apply -f platform-admin-role.yaml
kubectl apply -f platform-admin-binding.yaml
```

## Allowing RoleBinding Creation Without ClusterRoleBinding Access

Users should be able to manage RoleBindings within their namespaces without having ClusterRoleBinding access:

```yaml
# namespace-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
# Namespace-scoped RBAC management
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - roles
    - rolebindings
  verbs: ["*"]

# Cannot manage ClusterRoles or ClusterRoleBindings
# This is implicit (not listed in rules)

# Full control over namespace resources
- apiGroups: ["", "apps", "batch"]
  resources: ["*"]
  verbs: ["*"]
```

Bind this to namespace admins:

```bash
kubectl create rolebinding team-alpha-admin \
  --clusterrole=namespace-admin \
  --group=team-alpha-admins \
  --namespace=team-alpha
```

Team admins can create RoleBindings in their namespace but cannot create ClusterRoleBindings:

```bash
# This works (namespace-scoped)
kubectl create rolebinding developer-access \
  --clusterrole=edit \
  --user=dev@company.com \
  --namespace=team-alpha

# This fails (cluster-scoped)
kubectl create clusterrolebinding developer-cluster-access \
  --clusterrole=edit \
  --user=dev@company.com
# Error: User cannot create resource "clusterrolebindings"
```

## Testing Privilege Escalation Prevention

Kubernetes includes built-in privilege escalation prevention. Even if a user has permission to create ClusterRoleBindings, they cannot bind roles with permissions they do not have:

```yaml
# Test: Can a namespace-admin create ClusterRoleBinding?
# First, incorrectly grant ClusterRoleBinding creation
# (This is what you want to AVOID in production)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: bad-role-example
rules:
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - clusterrolebindings
  verbs: ["create"]
# This user has NO other permissions
```

If you bind this role to a user, they can call the create ClusterRoleBinding API, but Kubernetes will reject it:

```bash
# User tries to grant themselves cluster-admin
kubectl create clusterrolebinding escalate \
  --clusterrole=cluster-admin \
  --user=myself@company.com \
  --as=limited-user@company.com

# Error: user cannot bind role with permissions they do not already have
```

The escalation prevention works because the limited-user does not have cluster-admin permissions, so they cannot create a binding that grants those permissions to anyone else.

However, do not rely solely on escalation prevention. The correct approach is to not grant ClusterRoleBinding creation permissions to regular users at all.

## Auditing ClusterRoleBinding Changes

Track all ClusterRoleBinding modifications in audit logs:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all ClusterRoleBinding changes at RequestResponse level
- level: RequestResponse
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["clusterrolebindings"]
  verbs: ["create", "update", "patch", "delete"]

# Log ClusterRole changes
- level: RequestResponse
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["clusterroles"]
  verbs: ["create", "update", "patch", "delete"]
```

Query audit logs for ClusterRoleBinding changes:

```bash
# Find all ClusterRoleBinding creation events
jq 'select(.objectRef.resource=="clusterrolebindings" and .verb=="create")' \
  /var/log/kubernetes/audit.log

# Extract who created what
jq 'select(.objectRef.resource=="clusterrolebindings" and .verb=="create") |
    {user: .user.username, binding: .objectRef.name, subjects: .requestObject.subjects}' \
    /var/log/kubernetes/audit.log
```

Set up alerts for unauthorized ClusterRoleBinding attempts:

```yaml
# Prometheus alert rule
- alert: UnauthorizedClusterRoleBindingAttempt
  expr: |
    apiserver_audit_event_total{
      objectRef_resource="clusterrolebindings",
      verb="create",
      responseStatus_code="403"
    } > 0
  annotations:
    summary: "Unauthorized ClusterRoleBinding creation attempted"
```

## Implementing Break-Glass Procedures

For emergency scenarios, implement controlled break-glass access:

```yaml
# break-glass-clusterrolebinding.yaml
# DO NOT APPLY - Store in secure location for emergencies
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: emergency-access
  annotations:
    created-by: "incident-response-team"
    incident-ticket: "INC-12345"
    created-at: "2026-02-09T10:00:00Z"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: User
  name: "oncall-engineer@company.com"
  apiGroup: rbac.authorization.k8s.io
```

Document the break-glass process:

```bash
# emergency-access.sh
#!/bin/bash

INCIDENT_TICKET=$1
USER_EMAIL=$2

if [ -z "$INCIDENT_TICKET" ] || [ -z "$USER_EMAIL" ]; then
  echo "Usage: $0 <incident-ticket> <user-email>"
  exit 1
fi

echo "Creating emergency cluster-admin access"
echo "Incident: $INCIDENT_TICKET"
echo "User: $USER_EMAIL"

kubectl create clusterrolebinding emergency-$INCIDENT_TICKET \
  --clusterrole=cluster-admin \
  --user=$USER_EMAIL \
  --dry-run=client -o yaml | \
  kubectl annotate -f - \
    incident-ticket=$INCIDENT_TICKET \
    created-at=$(date -Iseconds) \
    --local -o yaml | \
  kubectl apply -f -

echo "Emergency access granted. Remember to revoke after incident resolution."
```

After the incident:

```bash
# Revoke emergency access
kubectl delete clusterrolebinding emergency-INC-12345

# Log the action
echo "$(date) - Revoked emergency access for INC-12345" >> /var/log/emergency-access.log
```

## Separating Read and Write RBAC Permissions

Allow security teams to audit RBAC without modifying it:

```yaml
# rbac-auditor-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: rbac-auditor
rules:
# Read all RBAC resources
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - clusterroles
    - clusterrolebindings
    - roles
    - rolebindings
  verbs: ["get", "list", "watch"]

# No create, update, delete permissions
```

Bind to security team:

```bash
kubectl create clusterrolebinding security-rbac-audit \
  --clusterrole=rbac-auditor \
  --group=security-team
```

Security team members can audit RBAC configuration:

```bash
# List all ClusterRoleBindings
kubectl get clusterrolebindings

# Examine specific binding
kubectl get clusterrolebinding platform-admins -o yaml

# Find who has cluster-admin
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.name=="cluster-admin") |
  .subjects[]'
```

They cannot modify ClusterRoleBindings, preventing accidental or malicious changes during audits.

## Monitoring for Configuration Drift

Regularly verify that ClusterRoleBinding permissions remain restricted:

```bash
#!/bin/bash
# check-clusterrolebinding-access.sh

echo "Checking ClusterRoleBinding permissions..."

# Get all ClusterRoles that can create ClusterRoleBindings
DANGEROUS_ROLES=$(kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]? |
    select(.apiGroups[]? == "rbac.authorization.k8s.io" and
           .resources[]? == "clusterrolebindings" and
           (.verbs[]? == "create" or .verbs[]? == "*"))) |
  .metadata.name' | grep -v "^cluster-admin$" | grep -v "^system:")

if [ -n "$DANGEROUS_ROLES" ]; then
  echo "WARNING: Found non-standard roles with ClusterRoleBinding creation:"
  echo "$DANGEROUS_ROLES"
  exit 1
else
  echo "OK: Only standard roles can create ClusterRoleBindings"
fi
```

Run this check in CI/CD:

```yaml
# .gitlab-ci.yml
rbac-audit:
  stage: security
  script:
    - ./check-clusterrolebinding-access.sh
  only:
    - schedules
```

Restricting ClusterRoleBinding creation to platform administrators is one of the most important RBAC security controls. It prevents users from escalating their own privileges and maintains cluster-wide security boundaries. Combined with audit logging and regular reviews, this restriction ensures that cluster-level permissions remain under strict control.
