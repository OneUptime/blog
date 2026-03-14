# How to Implement RBAC Reviews and Permission Audits Using Kubectl RBAC Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Kubectl, Plugins, Audit

Description: Learn how to use kubectl RBAC plugins like rbac-lookup, who-can, and rbac-tool to conduct comprehensive permission audits and reviews of your Kubernetes cluster RBAC configuration.

---

RBAC configurations drift over time. Permissions accumulate as users request access for specific tasks. Temporary permissions become permanent. ClusterRoles gain additional permissions without review. Regular RBAC audits identify and remediate these issues before they become security vulnerabilities.

Kubectl plugins provide specialized tools for RBAC analysis. They answer questions like who has access to what, which roles grant specific permissions, and where excessive privileges exist. These tools transform manual RBAC reviews into automated, repeatable processes.

## Installing Essential RBAC Plugins

Use Krew, the kubectl plugin manager, to install RBAC tools:

```bash
# Install Krew if not already installed
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

# Install RBAC plugins
kubectl krew install rbac-lookup
kubectl krew install who-can
kubectl krew install rbac-tool
kubectl krew install access-matrix
```

Verify installations:

```bash
kubectl rbac-lookup --version
kubectl who-can --help
kubectl rbac-tool version
```

## Using rbac-lookup for Permission Discovery

rbac-lookup shows which subjects (users, groups, ServiceAccounts) have access to specific resources:

```bash
# Who can access secrets?
kubectl rbac-lookup secrets

# Output:
# SUBJECT                        SCOPE             ROLE
# system:serviceaccount:...      cluster-wide      ClusterRole/cluster-admin
# developer@company.com          namespace/dev     Role/secret-reader
```

Find users with specific permissions:

```bash
# Who has cluster-admin?
kubectl rbac-lookup cluster-admin

# Who can delete pods?
kubectl rbac-lookup pods --verb delete

# Who can access resources in a specific namespace?
kubectl rbac-lookup --namespace production
```

Filter by subject type:

```bash
# Find ServiceAccounts with cluster-admin
kubectl rbac-lookup cluster-admin --kind serviceaccount

# Find groups with edit access
kubectl rbac-lookup edit --kind group
```

Export results for reporting:

```bash
# Generate JSON report
kubectl rbac-lookup cluster-admin --output json > cluster-admins.json

# Generate wide format with full details
kubectl rbac-lookup secrets --output wide
```

## Using who-can for Resource-Specific Queries

who-can answers questions about specific operations:

```bash
# Who can create pods in production namespace?
kubectl who-can create pods -n production

# Who can delete deployments cluster-wide?
kubectl who-can delete deployments --all-namespaces

# Who can get secrets named database-password?
kubectl who-can get secret database-password -n production
```

Check permissions for specific users:

```bash
# Can a specific user delete pods?
kubectl who-can delete pods -n production | grep developer@company.com

# Can a ServiceAccount create deployments?
kubectl who-can create deployments -n apps | grep my-serviceaccount
```

Use in scripts for automated validation:

```bash
#!/bin/bash
# check-rbac-compliance.sh

# Verify no regular users have cluster-admin
CLUSTER_ADMINS=$(kubectl who-can "*" "*" --all-namespaces | grep -v "system:")

if [ -n "$CLUSTER_ADMINS" ]; then
  echo "WARNING: Found non-system cluster-admin users:"
  echo "$CLUSTER_ADMINS"
  exit 1
fi

echo "RBAC compliance check passed"
```

## Using rbac-tool for Comprehensive Analysis

rbac-tool provides advanced RBAC analysis capabilities:

```bash
# Generate visual policy report
kubectl rbac-tool policy-rules

# Output shows all roles and their permissions in a table

# Find who can perform specific actions
kubectl rbac-tool who-can create pod

# Lookup what a specific user can do
kubectl rbac-tool lookup developer@company.com

# Analyze a specific ServiceAccount
kubectl rbac-tool lookup -e serviceaccount:default:my-app
```

Generate reports in different formats:

```bash
# Generate HTML report
kubectl rbac-tool viz --outformat html > rbac-report.html

# Generate JSON for programmatic analysis
kubectl rbac-tool viz --outformat json > rbac-analysis.json
```

Analyze specific resources:

```bash
# Show all roles affecting a resource
kubectl rbac-tool lookup -e deployment:my-app -n production

# Show effective permissions for a pod
kubectl rbac-tool lookup -e pod:my-pod -n production
```

## Using access-matrix for Permission Overview

access-matrix creates a matrix showing who can do what:

```bash
# Generate access matrix for a namespace
kubectl access-matrix --namespace production

# Output is a table:
# NAME              CREATE  DELETE  GET  LIST  UPDATE
# pods              ✓       ✓       ✓    ✓     ✓      (admin)
# pods              ×       ×       ✓    ✓     ×      (viewer)
# secrets           ×       ×       ×    ✓     ×      (viewer)
```

Create visual dashboards:

```bash
# Generate for all namespaces
kubectl access-matrix --all-namespaces --output json > access-matrix.json

# Use with custom processing
cat access-matrix.json | jq '.resources[] | select(.write == true)'
```

## Conducting a Comprehensive RBAC Audit

Create an automated audit workflow:

```bash
#!/bin/bash
# rbac-audit-comprehensive.sh

echo "=== Comprehensive RBAC Audit ==="
echo "Date: $(date)"
echo ""

echo "### 1. Cluster-Admin Assignments ###"
kubectl rbac-lookup cluster-admin --output wide

echo ""
echo "### 2. Users with Secret Access ###"
kubectl rbac-lookup secrets --verb get,list

echo ""
echo "### 3. ServiceAccounts with Cluster-Wide Access ###"
kubectl rbac-lookup --kind serviceaccount | grep "cluster-wide"

echo ""
echo "### 4. Overly Permissive Roles ###"
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]?.verbs[]? == "*" and .rules[]?.resources[]? == "*") |
  .metadata.name'

echo ""
echo "### 5. Users Who Can Create RoleBindings ###"
kubectl who-can create rolebindings --all-namespaces

echo ""
echo "### 6. Users Who Can Create ClusterRoleBindings ###"
kubectl who-can create clusterrolebindings

echo ""
echo "### 7. Failed Authorization Attempts (from audit logs) ###"
if [ -f /var/log/kubernetes/audit.log ]; then
  jq 'select(.responseStatus.code==403) |
      {user: .user.username, resource: .objectRef.resource, verb: .verb}' \
    /var/log/kubernetes/audit.log | jq -s 'group_by(.user) | map({user: .[0].user, attempts: length})'
fi

echo ""
echo "### 8. Stale RoleBindings (unused for 90+ days) ###"
# Requires audit log analysis
# Implementation depends on audit log format and retention

echo ""
echo "=== Audit Complete ==="
```

Run the audit:

```bash
chmod +x rbac-audit-comprehensive.sh
./rbac-audit-comprehensive.sh > rbac-audit-$(date +%Y%m%d).txt
```

## Identifying Excessive Permissions

Find roles with dangerous wildcards:

```bash
# Roles with wildcard verbs
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]?.verbs[]? == "*") |
  "\(.metadata.name): \(.rules[] | select(.verbs[] == "*") | .resources)"'

# Roles with wildcard resources
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]?.resources[]? == "*") |
  .metadata.name'
```

Find users with admin in production:

```bash
kubectl rbac-lookup --namespace production | grep -E "(admin|edit)"
```

Generate a risk report:

```bash
#!/bin/bash
# rbac-risk-assessment.sh

HIGH_RISK=0
MEDIUM_RISK=0

# Check for non-system cluster-admins
CLUSTER_ADMINS=$(kubectl rbac-lookup cluster-admin --kind user | wc -l)
if [ $CLUSTER_ADMINS -gt 3 ]; then
  echo "HIGH RISK: $CLUSTER_ADMINS users have cluster-admin"
  HIGH_RISK=$((HIGH_RISK + 1))
fi

# Check for ServiceAccounts with cluster-admin
SA_CLUSTER_ADMINS=$(kubectl rbac-lookup cluster-admin --kind serviceaccount | wc -l)
if [ $SA_CLUSTER_ADMINS -gt 5 ]; then
  echo "HIGH RISK: $SA_CLUSTER_ADMINS ServiceAccounts have cluster-admin"
  HIGH_RISK=$((HIGH_RISK + 1))
fi

# Check for wildcard roles
WILDCARD_ROLES=$(kubectl get clusterroles -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[]? == "*" and .rules[]?.resources[]? == "*") | .metadata.name' | \
  grep -v "cluster-admin" | wc -l)
if [ $WILDCARD_ROLES -gt 0 ]; then
  echo "MEDIUM RISK: $WILDCARD_ROLES custom roles with wildcard permissions"
  MEDIUM_RISK=$((MEDIUM_RISK + 1))
fi

echo ""
echo "Risk Summary:"
echo "  High Risk Issues: $HIGH_RISK"
echo "  Medium Risk Issues: $MEDIUM_RISK"

if [ $HIGH_RISK -gt 0 ]; then
  exit 2
elif [ $MEDIUM_RISK -gt 0 ]; then
  exit 1
fi

exit 0
```

## Automating Regular RBAC Reviews

Schedule periodic reviews:

```yaml
# rbac-audit-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rbac-audit
  namespace: kube-system
spec:
  schedule: "0 2 * * 0"  # Weekly, Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rbac-auditor
          containers:
          - name: audit
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              kubectl rbac-lookup cluster-admin > /reports/cluster-admins.txt
              kubectl rbac-lookup secrets --verb get > /reports/secret-access.txt
              # Upload reports to S3 or send via email
            volumeMounts:
            - name: reports
              mountPath: /reports
          restartPolicy: OnFailure
          volumes:
          - name: reports
            emptyDir: {}
```

Create RBAC for the audit job:

```yaml
# rbac-auditor-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rbac-auditor
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: rbac-auditor
rules:
# Read all RBAC resources
- apiGroups: ["rbac.authorization.k8s.io"]
  resources:
    - roles
    - rolebindings
    - clusterroles
    - clusterrolebindings
  verbs: ["get", "list"]

# Read users and groups (if using OIDC)
- apiGroups: [""]
  resources:
    - serviceaccounts
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: rbac-auditor
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rbac-auditor
subjects:
- kind: ServiceAccount
  name: rbac-auditor
  namespace: kube-system
```

## Visualizing RBAC with Dashboards

Create Grafana dashboards for RBAC metrics:

```yaml
# Export RBAC data to Prometheus format
- name: rbac_cluster_admin_bindings
  query: count(kube_clusterrolebinding_info{clusterrolebinding=~".*admin.*"})

- name: rbac_total_rolebindings
  query: count(kube_rolebinding_info)

- name: rbac_serviceaccount_count
  query: count(kube_serviceaccount_info)
```

Build dashboards showing:
- Number of cluster-admin bindings over time
- ServiceAccounts with elevated privileges
- Namespaces with most RoleBindings
- Failed authorization attempts

## Best Practices for RBAC Reviews

Follow these guidelines:

**Review Frequency**: Conduct comprehensive audits monthly, quick checks weekly.

**Document Findings**: Keep audit reports for compliance and trend analysis.

**Act on Results**: Create tickets to remediate excessive permissions identified.

**Automate Where Possible**: Use CronJobs or CI/CD to run audits automatically.

**Track Changes**: Monitor RBAC modifications in real-time with audit logging and alerting.

**Least Privilege**: Regularly review and reduce permissions to the minimum necessary.

Regular RBAC reviews using kubectl plugins transform permission management from reactive firefighting to proactive security maintenance. By systematically auditing who has access to what, you identify and remediate security risks before they lead to incidents. Automated audits ensure reviews happen consistently regardless of team workload.
