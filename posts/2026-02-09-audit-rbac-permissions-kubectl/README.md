# How to Audit Kubernetes RBAC Permissions Using kubectl auth can-i and RBAC Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Audit Kubernetes RBAC permissions systematically using kubectl auth can-i, rbac-lookup, and automated tools to identify security gaps and ensure least privilege access.

---

RBAC auditing reveals who can do what in your Kubernetes cluster. Regular audits catch overly permissive roles, identify unused permissions, and ensure compliance with security policies. The kubectl auth can-i command and specialized tools make this process systematic and repeatable.

## Using kubectl auth can-i for Basic Audits

The auth can-i command checks whether a user or service account can perform specific actions.

```bash
# Check if you can create deployments
kubectl auth can-i create deployments

# Check if you can delete pods in a namespace
kubectl auth can-i delete pods -n production

# Check permissions for another user
kubectl auth can-i create secrets --as=john@company.com

# Check permissions for a service account
kubectl auth can-i list pods \
  --as=system:serviceaccount:default:myapp-sa

# Check permissions for a group
kubectl auth can-i create deployments \
  --as-group=system:authenticated
```

The command returns "yes" or "no" and exits with code 0 for yes, 1 for no.

## Listing All Permissions

Use --list to see all permissions for a user or service account.

```bash
# List all your permissions
kubectl auth can-i --list

# List permissions in specific namespace
kubectl auth can-i --list -n production

# List permissions for service account
kubectl auth can-i --list \
  --as=system:serviceaccount:prod:deployer-sa \
  -n production

# List permissions for a user
kubectl auth can-i --list --as=developer@company.com
```

Output shows resources, verbs, and API groups.

```
Resources                                       Non-Resource URLs   Resource Names   Verbs
deployments.apps                                []                  []               [get list watch create update patch]
pods                                            []                  []               [get list watch]
services                                        []                  []               [get list watch create update]
```

## Auditing Service Account Permissions

Create a script to audit all service accounts in a namespace.

```bash
#!/bin/bash
# scripts/audit-serviceaccounts.sh

NAMESPACE=${1:-default}

echo "Auditing service accounts in namespace: $NAMESPACE"
echo "=================================================="

for sa in $(kubectl get sa -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo ""
    echo "Service Account: $sa"
    echo "---"

    # Check common permissions
    for verb in get list create update delete; do
        for resource in pods deployments services secrets; do
            result=$(kubectl auth can-i $verb $resource \
                --as=system:serviceaccount:$NAMESPACE:$sa \
                -n $NAMESPACE 2>/dev/null)
            if [ "$result" = "yes" ]; then
                echo "  ✓ Can $verb $resource"
            fi
        done
    done
done
```

Run the audit.

```bash
chmod +x scripts/audit-serviceaccounts.sh
./scripts/audit-serviceaccounts.sh production
```

## Installing rbac-lookup Tool

The rbac-lookup tool provides reverse lookups to see who has access to resources.

```bash
# Install rbac-lookup
brew install reactiveops/tap/rbac-lookup

# Or download binary
curl -LO https://github.com/FairwindsOps/rbac-lookup/releases/latest/download/rbac-lookup_linux_amd64
chmod +x rbac-lookup_linux_amd64
sudo mv rbac-lookup_linux_amd64 /usr/local/bin/rbac-lookup
```

## Using rbac-lookup for Audits

Find who has specific permissions.

```bash
# Find who can create deployments
rbac-lookup create deployments

# Find who can delete pods in a namespace
rbac-lookup delete pods -n production

# Find all permissions for a subject
rbac-lookup --kind user --name john@company.com

# Find all service account permissions
rbac-lookup --kind serviceaccount

# Output to JSON for processing
rbac-lookup --output json > rbac-audit.json
```

Output shows subjects and their bindings.

```
SUBJECT                           SCOPE       ROLE
User/admin@company.com           cluster     ClusterRole/cluster-admin
ServiceAccount/default:deployer  production  Role/deployment-manager
Group/developers@company.com     development Role/developer-access
```

## Auditing ClusterRole and Role Bindings

List all bindings to find overly permissive access.

```bash
# List all ClusterRoleBindings
kubectl get clusterrolebindings -o wide

# Find bindings to cluster-admin
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") |
    "\(.metadata.name): \(.subjects)"'

# Find all RoleBindings in a namespace
kubectl get rolebindings -n production -o wide

# Find service accounts with admin access
kubectl get rolebindings,clusterrolebindings --all-namespaces -o json | \
  jq -r '.items[] | select(.subjects[]?.kind=="ServiceAccount" and
    .roleRef.name | contains("admin")) |
    {namespace: .metadata.namespace, binding: .metadata.name,
     subject: .subjects[0].name, role: .roleRef.name}'
```

## Creating Comprehensive Audit Reports

Build a script that generates a full RBAC audit report.

```bash
#!/bin/bash
# scripts/generate-rbac-report.sh

OUTPUT_DIR="rbac-audit-$(date +%Y%m%d)"
mkdir -p $OUTPUT_DIR

echo "Generating RBAC audit report..."

# Export all RBAC resources
kubectl get clusterroles -o yaml > $OUTPUT_DIR/clusterroles.yaml
kubectl get clusterrolebindings -o yaml > $OUTPUT_DIR/clusterrolebindings.yaml
kubectl get roles --all-namespaces -o yaml > $OUTPUT_DIR/roles.yaml
kubectl get rolebindings --all-namespaces -o yaml > $OUTPUT_DIR/rolebindings.yaml

# Generate summary report
cat > $OUTPUT_DIR/summary.md << 'EOF'
# Kubernetes RBAC Audit Report
Generated: $(date)

## Cluster-Wide Access

### Cluster Admins
EOF

# Find cluster admins
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") |
    "- \(.subjects[]?.name) (\(.subjects[]?.kind))"' >> $OUTPUT_DIR/summary.md

cat >> $OUTPUT_DIR/summary.md << 'EOF'

## High-Risk Permissions

### Subjects with delete permissions on secrets
EOF

# Find who can delete secrets
rbac-lookup delete secrets 2>/dev/null | tail -n +2 >> $OUTPUT_DIR/summary.md

cat >> $OUTPUT_DIR/summary.md << 'EOF'

### Subjects with exec permissions on pods
EOF

rbac-lookup create pods/exec 2>/dev/null | tail -n +2 >> $OUTPUT_DIR/summary.md

# Create CSV of all bindings
echo "Namespace,Binding,Type,Subject,Role" > $OUTPUT_DIR/all-bindings.csv

kubectl get rolebindings --all-namespaces -o json | \
  jq -r '.items[] |
    "\(.metadata.namespace),\(.metadata.name),RoleBinding,\(.subjects[]?.name),\(.roleRef.name)"' \
  >> $OUTPUT_DIR/all-bindings.csv

kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
    "cluster,\(.metadata.name),ClusterRoleBinding,\(.subjects[]?.name),\(.roleRef.name)"' \
  >> $OUTPUT_DIR/all-bindings.csv

echo "Report generated in $OUTPUT_DIR/"
```

Run the report generator.

```bash
chmod +x scripts/generate-rbac-report.sh
./scripts/generate-rbac-report.sh
```

## Auditing for Security Anti-Patterns

Check for common security issues.

```bash
#!/bin/bash
# scripts/audit-security-issues.sh

echo "Checking for RBAC security issues..."
echo ""

# Check for wildcard permissions
echo "=== Checking for wildcard (*) permissions ==="
kubectl get roles,clusterroles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[] | contains("*")) |
    "\(.kind)/\(.metadata.name) in \(.metadata.namespace // "cluster")"'

echo ""
echo "=== Checking for overly broad resource access ==="
kubectl get roles,clusterroles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.resources[] | contains("*")) |
    "\(.kind)/\(.metadata.name) in \(.metadata.namespace // "cluster")"'

echo ""
echo "=== Checking for escalate/bind/impersonate permissions ==="
kubectl get roles,clusterroles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.verbs[] |
    (. == "escalate" or . == "bind" or . == "impersonate")) |
    "\(.kind)/\(.metadata.name): \(.rules[]?.verbs)"'

echo ""
echo "=== Checking service accounts with cluster-admin ==="
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin" and
    .subjects[]?.kind=="ServiceAccount") |
    "Binding: \(.metadata.name), SA: \(.subjects[]?.name) in \(.subjects[]?.namespace)"'
```

## Monitoring RBAC Changes

Set up auditing for RBAC modifications.

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log RBAC changes at RequestResponse level
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: "rbac.authorization.k8s.io"
    resources:
    - "roles"
    - "rolebindings"
    - "clusterroles"
    - "clusterrolebindings"

# Log service account changes
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: ""
    resources: ["serviceaccounts"]
```

Query audit logs for RBAC changes.

```bash
# Find recent RBAC changes (location varies)
jq -r 'select(.objectRef.resource | contains("role") or contains("rolebinding")) |
  "\(.requestReceivedTimestamp) \(.verb) \(.objectRef.resource)/\(.objectRef.name) by \(.user.username)"' \
  /var/log/kubernetes/audit.log | tail -20
```

## Implementing Automated Compliance Checks

Create a CI/CD check for RBAC compliance.

```yaml
# .github/workflows/rbac-audit.yaml
name: RBAC Compliance Audit

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Install audit tools
        run: |
          curl -LO https://github.com/FairwindsOps/rbac-lookup/releases/latest/download/rbac-lookup_linux_amd64
          chmod +x rbac-lookup_linux_amd64
          sudo mv rbac-lookup_linux_amd64 /usr/local/bin/rbac-lookup

      - name: Check for cluster-admin bindings
        run: |
          echo "Checking for inappropriate cluster-admin access..."
          ADMINS=$(kubectl get clusterrolebindings -o json | \
            jq -r '.items[] | select(.roleRef.name=="cluster-admin") | .subjects[]?.name')

          if echo "$ADMINS" | grep -v "^(admin@|platform-)" ; then
            echo "❌ Found unexpected cluster-admin bindings"
            exit 1
          fi

      - name: Check for wildcard permissions
        run: |
          WILDCARDS=$(kubectl get roles,clusterroles --all-namespaces -o json | \
            jq -r '.items[] | select(.rules[]?.verbs[]? | contains("*"))')

          if [ -n "$WILDCARDS" ]; then
            echo "⚠️  Warning: Found roles with wildcard permissions"
            echo "$WILDCARDS"
          fi

      - name: Generate compliance report
        run: |
          ./scripts/generate-rbac-report.sh

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: rbac-audit-report
          path: rbac-audit-*/
```

## Using kubectl-who-can Plugin

Install and use the who-can plugin for reverse permission lookups.

```bash
# Install kubectl-who-can
kubectl krew install who-can

# Find who can create deployments
kubectl who-can create deployments

# Find who can delete secrets in a namespace
kubectl who-can delete secrets -n production

# Find who can get a specific resource
kubectl who-can get secret/database-credentials -n production
```

Auditing RBAC permissions using kubectl auth can-i and specialized tools reveals security gaps and overly permissive access. Build automated audit scripts that run regularly, check for anti-patterns like wildcard permissions, and monitor RBAC changes through audit logs. Use tools like rbac-lookup and kubectl-who-can to answer who-has-access questions quickly and maintain least privilege access across your cluster.
