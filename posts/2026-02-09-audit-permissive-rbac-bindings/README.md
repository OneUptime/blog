# How to Audit and Detect Overly Permissive RBAC Bindings Using RBAC-Lookup Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security, Audit, Tool

Description: Learn how to identify and remediate overly permissive RBAC bindings in Kubernetes using rbac-lookup and other auditing tools to strengthen cluster security.

---

Kubernetes RBAC configurations grow complex as clusters mature. Over time, developers add permissions to fix immediate problems without considering long-term security implications. Service accounts accumulate privileges they no longer need. Users receive cluster-admin access for one-time tasks and keep those permissions indefinitely. These overly permissive bindings create security vulnerabilities that attackers can exploit.

Regular RBAC audits help identify and remediate excessive permissions before they become security incidents. Tools like rbac-lookup, kubectl-who-can, and rbac-tool make it possible to analyze permissions across your entire cluster and detect dangerous configurations that manual inspection might miss.

## Understanding Overly Permissive RBAC

Not all RBAC violations are obvious. Some dangerous patterns include:

**Wildcards in Critical Resources**: Roles granting `["*"]` verbs on sensitive resources like secrets or nodes allow full control including destructive operations.

**Cluster-Admin to Service Accounts**: Service accounts with cluster-admin can compromise the entire cluster if the pod is compromised.

**Cross-Namespace Access**: Users with permissions across all namespaces can access sensitive data in isolation boundaries meant to separate teams or environments.

**Privilege Escalation Paths**: Combinations of permissions that allow users to grant themselves additional privileges, such as the ability to create roles and rolebindings without restrictions.

## Installing RBAC-Lookup

RBAC-Lookup is a kubectl plugin that simplifies RBAC auditing by showing who has access to what. Install it using Krew:

```bash
# Install Krew if you haven't already

kubectl krew install rbac-lookup
```

Or download the binary directly:

```bash
# Download latest release
VERSION=$(curl -s https://api.github.com/repos/FairwindsOps/rbac-lookup/releases/latest | jq -r .tag_name)
wget "https://github.com/FairwindsOps/rbac-lookup/releases/download/${VERSION}/rbac-lookup_${VERSION#v}_Linux_x86_64.tar.gz"
tar -xzf "rbac-lookup_${VERSION#v}_Linux_x86_64.tar.gz"
sudo mv rbac-lookup /usr/local/bin/
chmod +x /usr/local/bin/rbac-lookup
```

Verify the installation:

```bash
kubectl rbac-lookup --help
```

## Finding Users with Cluster-Admin Access

Start by identifying all principals with cluster-admin privileges. These users have unrestricted access to your entire cluster:

```bash
# Find all cluster-wide cluster-admin bindings
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.kind=="ClusterRole" and .roleRef.name=="cluster-admin") |
  .subjects[]? |
  "\(.kind)/\(.name)\tcluster-wide\tClusterRole/cluster-admin"'

# Example output:
# SUBJECT                   SCOPE             ROLE
# Group/system:masters      cluster-wide      ClusterRole/cluster-admin
# User/admin-user@company.com cluster-wide    ClusterRole/cluster-admin
# ServiceAccount/jenkins-sa cluster-wide      ClusterRole/cluster-admin
```

Review each result. The `system:masters` group is expected (it maps to client certificates with O=system:masters). But user accounts and service accounts with cluster-admin warrant investigation.

Service accounts with cluster-admin are particularly dangerous:

```bash
# Find service accounts with cluster-admin
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.kind=="ClusterRole" and .roleRef.name=="cluster-admin") |
  .subjects[]? |
  select(.kind=="ServiceAccount") |
  "\(.namespace)/\(.name)"'

# Check where these service accounts are used
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
  select(.metadata.namespace=="default" and .spec.serviceAccountName=="jenkins-sa") |
  "\(.metadata.namespace)/\(.metadata.name)"'
```

If a pod using a cluster-admin service account is compromised, the attacker gains full cluster control.

## Detecting Wildcard Permissions

Wildcard permissions (`["*"]`) grant all operations on a resource. Find roles using wildcards:

```bash
# Get all ClusterRoles with wildcard verbs
kubectl get clusterroles -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[]? == "*") | .metadata.name' | \
  sort -u

# Get detailed rules for a specific role
kubectl get clusterrole <role-name> -o yaml
```

Not all wildcards are dangerous. The cluster-admin role legitimately uses wildcards. But custom roles with wildcards need scrutiny:

```bash
# Find custom roles (non-system) with wildcards
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.metadata.name | startswith("system:") | not) |
  select(.rules[]?.verbs[]? == "*") |
  .metadata.name'
```

Review each custom role:

```yaml
# Example of overly permissive role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-role
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]  # WAY too permissive
```

## Finding Secret Access

Secrets contain sensitive data like database passwords and API keys. Audit who can read secrets cluster-wide:

```bash
# Who can get or list secrets?
rbac-tool who-can get secrets
rbac-tool who-can list secrets

# Output shows users with secret access:
# SUBJECT                   SCOPE             ROLE
# system:admin              cluster-wide      ClusterRole/cluster-admin
# jenkins-sa                cluster-wide      ClusterRole/developer-role
```

For each principal with secret access, verify they need it:

```bash
# Check if a specific user needs secret access
kubectl auth can-i get secrets --all-namespaces --as=developer@company.com
```

Consider restricting secret access to specific namespaces:

```yaml
# Instead of ClusterRole with secrets access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role  # Namespace-scoped
metadata:
  name: app-secrets-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["app-db-password", "app-api-key"]  # Specific secrets only
```

## Analyzing Pod Exec Permissions

The ability to execute commands in pods (`pods/exec`) is powerful. It allows direct access to running containers:

```bash
# Who can exec into pods?
rbac-tool who-can create pods/exec

# Test if a user can exec
kubectl auth can-i create pods/exec --namespace=production --as=developer@company.com
```

Users who can exec into pods can:
- Read environment variables containing secrets
- Access mounted secrets and configmaps
- Potentially escalate privileges if the container runs as root

Limit exec permissions to operations teams and debug scenarios:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
```

## Using RBAC-Tool for Comprehensive Analysis

RBAC-Tool provides additional analysis capabilities. Install it:

```bash
kubectl krew install rbac-tool
```

Generate a policy report:

```bash
# Generate full RBAC analysis
rbac-tool policy-rules -e '.*'

# Find who can perform specific actions
rbac-tool who-can create pod

# Analyze a specific service account
rbac-tool lookup -e '^jenkins-sa$'
```

Generate a compliance report:

```bash
# Export RBAC policy rules to JSON
rbac-tool policy-rules -e '.*' -o json > rbac-analysis.json

# Parse for dangerous patterns
jq '.[] |
  select(.kind=="ServiceAccount") |
  select(.allowedTo[]? |
  (.verb=="*" and .resource=="*" and (.apiGroup=="*" or .apiGroup=="core")))' \
  rbac-analysis.json
```

## Detecting Privilege Escalation Paths

Some permission combinations allow privilege escalation. A user who can create rolebindings and has permission to bind any role can grant themselves additional privileges:

```bash
# Find who can create rolebindings
rbac-tool who-can create rolebindings

# Check who can bind roles or cluster roles
rbac-tool who-can bind roles
rbac-tool who-can bind clusterroles
```

Kubernetes prevents automatic privilege escalation, but check for the `escalate` verb:

```bash
# Find roles with escalate permission
rbac-tool who-can escalate roles
rbac-tool who-can escalate clusterroles
```

## Creating an Audit Automation Script

Automate regular RBAC audits with a script:

```bash
#!/bin/bash
# rbac-audit.sh - Automated RBAC security audit

echo "=== RBAC Security Audit Report ==="
echo "Generated: $(date)"
echo ""

echo "### Cluster-Admin Bindings ###"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.kind=="ClusterRole" and .roleRef.name=="cluster-admin") |
  .subjects[]? |
  "\(.kind)/\(.name)\tcluster-wide\tClusterRole/cluster-admin"'

echo ""
echo "### Service Accounts with Cluster-Admin ###"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.kind=="ClusterRole" and .roleRef.name=="cluster-admin") |
  .subjects[]? |
  select(.kind=="ServiceAccount") |
  "\(.namespace)/\(.name)"'

echo ""
echo "### Custom Roles with Wildcard Verbs ###"
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.metadata.name | startswith("system:") | not) |
  select(.rules[]?.verbs[]? == "*") |
  .metadata.name'

echo ""
echo "### Users with Secret Access ###"
rbac-tool who-can get secrets
rbac-tool who-can list secrets

echo ""
echo "### Users with Pod Exec Access ###"
rbac-tool who-can create pods/exec

echo ""
echo "### Cross-Namespace Access ###"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.metadata.name | startswith("system:") | not) |
  "\(.metadata.name): \(.subjects[].name)"'

echo ""
echo "=== Audit Complete ==="
```

Run the audit weekly and review results:

```bash
chmod +x rbac-audit.sh
./rbac-audit.sh > rbac-audit-$(date +%Y%m%d).txt
```

## Implementing Continuous RBAC Monitoring

Deploy Fairwinds Insights for continuous RBAC monitoring, and Polaris for workload policy checks:

```bash
# Install Polaris
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm upgrade --install polaris fairwinds-stable/polaris --namespace polaris --create-namespace

# Port-forward to access the dashboard
kubectl port-forward -n polaris svc/polaris-dashboard 8080:80
```

Polaris identifies workload security configuration issues and provides remediation guidance. Fairwinds Insights includes RBAC reporting for roles and bindings.

For CI/CD integration, use machine-readable RBAC queries in pipelines:

```yaml
# .gitlab-ci.yml example
rbac-audit:
  stage: security
  script:
    - |
      kubectl get clusterrolebindings -o json | jq '[.items[] |
        select(.roleRef.kind=="ClusterRole" and .roleRef.name=="cluster-admin") |
        .subjects[]?]' > cluster-admins.json
    - |
      if [ $(cat cluster-admins.json | jq length) -gt 5 ]; then
        echo "Too many cluster-admin bindings detected"
        exit 1
      fi
  only:
    - schedules
```

## Remediating Overly Permissive Bindings

When you find excessive permissions:

**Replace Cluster Roles with Namespace Roles**: Convert ClusterRoleBindings to RoleBindings when possible:

```bash
# Instead of cluster-wide access
kubectl delete clusterrolebinding developer-binding

# Create namespace-specific binding
kubectl create rolebinding developer-binding \
  --clusterrole=edit \
  --user=developer@company.com \
  --namespace=development
```

**Use Least Privilege Principle**: Create custom roles with minimal permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
# No delete, no create, no secrets access
```

**Regular Review Cycles**: Schedule quarterly RBAC reviews. Remove users who no longer need access. Revoke service account permissions that are no longer used.

RBAC auditing is not a one-time activity. As your cluster evolves, permissions drift toward excessive access. Regular audits using rbac-lookup and automated tools ensure your cluster maintains strong security posture without accumulating privilege bloat that could lead to security incidents.
