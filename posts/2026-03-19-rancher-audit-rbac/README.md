# How to Audit RBAC Permissions in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Security, Role

Description: A step-by-step guide to auditing RBAC permissions in Rancher to identify excessive access, orphaned bindings, and security risks.

Regular RBAC audits are critical for maintaining the security of your Rancher-managed Kubernetes clusters. Over time, role bindings accumulate, users change teams, and permissions drift from their intended state. This guide provides a systematic approach to auditing RBAC at every level in Rancher.

## Prerequisites

- Rancher v2.7+ with administrator access
- kubectl access to the Rancher management cluster and any downstream cluster you want to inspect at the Kubernetes RBAC layer
- jq installed for JSON processing
- Basic familiarity with Rancher's role model

## Step 1: Audit Global Role Assignments

Start at the broadest scope. List all users with global roles:

```bash
# List all global role bindings

kubectl get globalrolebindings -o json | \
  jq -r '.items[] | "\(.userName // .groupPrincipalName)\t\(.globalRoleName)\t\(.metadata.creationTimestamp)"' | \
  column -t -s $'\t'
```

Focus on high-privilege roles:

```bash
# Find all administrators
kubectl get globalrolebindings -o json | \
  jq -r '.items[] | select(.globalRoleName == "admin") | "\(.userPrincipalName // .groupPrincipalName // .userName) - Created: \(.metadata.creationTimestamp)"'

# Count admins
echo "Total administrators:"
kubectl get globalrolebindings -o json | \
  jq '[.items[] | select(.globalRoleName == "admin")] | length'
```

Flag any accounts that should not have administrator access and document them for remediation.

## Step 2: Audit Cluster Role Assignments

Check who has access to each cluster:

```bash
#!/bin/bash
# audit-cluster-roles.sh

echo "=== Cluster Role Audit ==="
echo ""

for cluster in $(kubectl get clusters.management.cattle.io -o jsonpath='{.items[*].metadata.name}'); do
  display=$(kubectl get clusters.management.cattle.io $cluster -o jsonpath='{.spec.displayName}')
  echo "--- Cluster: $display ($cluster) ---"

  # List cluster role bindings
  kubectl get clusterroletemplatebindings -n $cluster -o json | \
    jq -r '.items[] | "\(.userPrincipalName // .groupPrincipalName // .userName // "unknown")\t\(.roleTemplateName)\t\(.metadata.creationTimestamp)"' | \
    column -t -s $'\t'

  # Count cluster owners
  owners=$(kubectl get clusterroletemplatebindings -n $cluster -o json | \
    jq '[.items[] | select(.roleTemplateName == "cluster-owner")] | length')
  echo "  Cluster Owners: $owners"
  echo ""
done
```

## Step 3: Audit Project Role Assignments

```bash
#!/bin/bash
# audit-project-roles.sh

echo "=== Project Role Audit ==="
echo ""

kubectl get projects.management.cattle.io --all-namespaces -o json | \
  jq -r '.items[] | [.metadata.namespace, .metadata.name, (.spec.displayName // .metadata.name), .status.backingNamespace] | @tsv' | \
  while IFS=$'\t' read -r cluster proj_id proj_name backing_ns; do
  [ -z "$backing_ns" ] && continue

  bindings=$(kubectl get projectroletemplatebindings -n "$backing_ns" -o json | jq '.items | length')

  if [ "$bindings" -gt 0 ]; then
    echo "--- Project: $proj_name ---"
    kubectl get projectroletemplatebindings -n "$backing_ns" -o json | \
      jq -r '.items[] | "\(.userPrincipalName // .groupPrincipalName // .userName // "unknown")\t\(.roleTemplateName)"' | \
      column -t -s $'\t'
    echo ""
  fi
done
```

## Step 4: Identify Orphaned Role Bindings

Start by checking for user bindings whose Rancher `User` resource no longer exists:

```bash
# Find bindings with no matching user
kubectl get clusterroletemplatebindings --all-namespaces -o json | \
  jq -r '.items[] | select(.userName != null and .userName != "") | .userName' | sort -u | while read user; do
  exists=$(kubectl get users.management.cattle.io $user 2>/dev/null)
  if [ -z "$exists" ]; then
    echo "Orphaned user: $user"
    kubectl get clusterroletemplatebindings --all-namespaces -o json | \
      jq -r ".items[] | select(.userName == \"$user\") | \"  Binding: \(.metadata.name) in \(.metadata.namespace)\""
  fi
done
```

## Step 5: Check for Overly Permissive Custom Roles

Review custom role templates for wildcard permissions or broad access:

```bash
# Find roles with wildcard permissions
kubectl get roletemplates -o json | \
  jq -r '.items[] | select(.builtin != true) | select(any(.rules[]?; any(.apiGroups[]?; . == "*") or any(.resources[]?; . == "*") or any(.verbs[]?; . == "*"))) | "WARNING - \(.metadata.name) (\(.displayName)): has wildcard permissions"'

# Find roles that grant delete on all resources
kubectl get roletemplates -o json | \
  jq -r '.items[] | select(.builtin != true) | select(any(.rules[]?; any(.verbs[]?; . == "delete") and any(.resources[]?; . == "*"))) | "WARNING - \(.metadata.name): grants delete on all resources"'
```

## Step 6: Audit Kubernetes-Level RBAC

Rancher's RBAC layer sits on top of Kubernetes RBAC. Switch `kubectl` to the downstream cluster context first, then audit the underlying bindings:

```bash
# List all ClusterRoleBindings in a downstream cluster
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.metadata.name | startswith("cattle-") | not) | "\(.metadata.name)\t\(.roleRef.name)\t\(.subjects[]? | "\(.kind):\(.namespace // "cluster")/\(.name)")"' | \
  column -t -s $'\t'

# Find bindings to the cluster-admin role
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name == "cluster-admin") | "\(.metadata.name): \(.subjects[]? | "\(.kind)/\(.name)")"'
```

## Step 7: Enable and Review Audit Logs

Enable Rancher's API audit logging to track RBAC-related actions. If Rancher is installed with Helm, configure audit logging during installation or upgrade:

1. Set `auditLog.enabled` to `true`.
2. Set `auditLog.level` to `2` for request-body logging.
3. Choose an `auditLog.destination` such as `sidecar` or `hostPath`.

Via Helm values during Rancher installation:

```yaml
auditLog:
  enabled: true
  level: 2
  destination: sidecar
```

Review audit logs for RBAC changes:

```bash
# Review RBAC-related Rancher API audit events from the audit sidecar
kubectl -n cattle-system logs <rancher-pod> -c rancher-audit-log | \
  jq -r 'select(.requestURI | test("/(clusterroletemplatebindings|projectroletemplatebindings|globalrolebindings)")) | select(.method == "POST" or .method == "PUT" or .method == "PATCH" or .method == "DELETE") | "\(.requestTimestamp) \(.method) \(.requestURI) by \(.user.extra.username[0] // .user.name)"'
```

## Step 8: Generate a Comprehensive Audit Report

Create a complete audit report script:

```bash
#!/bin/bash
# rbac-audit-report.sh

REPORT_DIR="${REPORT_DIR:-/opt/reports}"
REPORT_FILE="$REPORT_DIR/rbac-audit-$(date +%Y%m%d).txt"

mkdir -p "$REPORT_DIR"

{
  echo "RBAC Audit Report - $(date)"
  echo "=================================="
  echo ""

  echo "1. GLOBAL ROLE SUMMARY"
  echo "----------------------"
  kubectl get globalrolebindings -o json | \
    jq -r '.items | group_by(.globalRoleName) | .[] | "\(.[0].globalRoleName): \(length) bindings"'
  echo ""

  echo "2. ADMINISTRATOR ACCOUNTS"
  echo "-------------------------"
  kubectl get globalrolebindings -o json | \
    jq -r '.items[] | select(.globalRoleName == "admin") | "  \(.userPrincipalName // .groupPrincipalName // .userName)"'
  echo ""

  echo "3. CLUSTER ACCESS SUMMARY"
  echo "-------------------------"
  for cluster in $(kubectl get clusters.management.cattle.io -o jsonpath='{.items[*].metadata.name}'); do
    display=$(kubectl get clusters.management.cattle.io $cluster -o jsonpath='{.spec.displayName}')
    count=$(kubectl get clusterroletemplatebindings -n $cluster -o json | jq '.items | length')
    owners=$(kubectl get clusterroletemplatebindings -n $cluster -o json | \
      jq '[.items[] | select(.roleTemplateName == "cluster-owner")] | length')
    echo "  $display: $count total bindings, $owners owners"
  done
  echo ""

  echo "4. CUSTOM ROLES WITH ELEVATED PERMISSIONS"
  echo "------------------------------------------"
  kubectl get roletemplates -o json | \
    jq -r '.items[] | select(.builtin != true) | select(any(.rules[]?; any(.apiGroups[]?; . == "*") or any(.verbs[]?; . == "*") or any(.resources[]?; . == "*"))) | "  WARNING: \(.displayName) has wildcard permissions"'
  echo ""

  echo "5. ROLES GRANTING SECRET ACCESS"
  echo "-------------------------------"
  kubectl get roletemplates -o json | \
    jq -r '.items[] | select(any(.rules[]?; any(.resources[]?; . == "secrets"))) | "  \(.displayName) (\(.metadata.name)): grants access to secrets"'

} > "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
```

## Step 9: Automate Periodic Audits

Schedule the audit script to run regularly:

```bash
# Add to crontab - runs monthly on the 1st at 6 AM
0 6 1 * * /opt/scripts/rbac-audit-report.sh && mail -s "Monthly RBAC Audit" security-team@example.com < "/opt/reports/rbac-audit-$(date +\%Y\%m\%d).txt"
```

## Step 10: Remediate Findings

For each finding in your audit, take appropriate action:

```bash
# Remove an orphaned cluster role binding
kubectl delete clusterroletemplatebinding <binding-name> -n <cluster-id>

# Downgrade a user from cluster-owner to cluster-member
# First remove the owner binding
kubectl delete clusterroletemplatebinding <owner-binding> -n <cluster-id>

# Then create a member binding (use the Rancher UI or API for this)
```

## Best Practices

- **Schedule quarterly audits**: At minimum, audit RBAC every quarter.
- **Automate detection**: Script the identification of anomalies and run it on a schedule.
- **Track changes**: Use Rancher audit logs to monitor RBAC changes in real time.
- **Document exceptions**: When elevated access is justified, document why and set a review date.
- **Integrate with offboarding**: Remove access as part of your employee offboarding process.
- **Version control roles**: Store custom role templates in Git and apply them through CI/CD.

## Conclusion

Auditing RBAC in Rancher is an ongoing process that combines automated tooling with human review. By systematically checking global, cluster, and project role assignments, identifying orphaned bindings, and flagging overly permissive roles, you maintain a secure environment. Automate as much as possible and integrate RBAC audits into your regular security review cycle.
