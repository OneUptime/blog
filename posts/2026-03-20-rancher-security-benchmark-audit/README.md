# How to Audit Cluster Configuration Against Security Benchmarks in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Audit, Compliance, Benchmark

Description: A comprehensive guide to auditing Rancher-managed Kubernetes cluster configurations against multiple security benchmarks including CIS, NIST, and custom organizational standards.

Security auditing of Kubernetes clusters is an ongoing process that requires systematic evaluation against established security benchmarks. Rancher provides built-in tools for CIS and broader compliance scanning, but a comprehensive security audit covers multiple frameworks and requires custom tooling. This guide covers how to perform thorough security audits of Rancher-managed clusters.

## Prerequisites

- Rancher with the cluster scanning app installed (`rancher-cis-benchmark` on Rancher v2.11 and earlier, `rancher-compliance` on Rancher v2.12+)
- `kubectl` access to the cluster you want to audit
- Python 3 for report processing
- Access to control-plane manifests if you want to verify encryption at rest on self-managed clusters
- Understanding of security benchmarks (CIS, NIST, STIG)

## Step 1: Run a Comprehensive CIS Benchmark Scan

```bash
# Rancher v2.12+ uses compliance.cattle.io/v1 and Rancher v2.11 and earlier
# use cis.cattle.io/v1. Replace SCAN_API_GROUP and SCAN_PROFILE with values
# that exist on your cluster.
SCAN_API_GROUP="compliance.cattle.io"
SCAN_PROFILE="<clusterscanprofile-name>"
SCAN_NAME="security-audit-$(date +%Y%m%d)"

kubectl get "clusterscanprofiles.${SCAN_API_GROUP}"

kubectl apply -f - <<EOF
apiVersion: ${SCAN_API_GROUP}/v1
kind: ClusterScan
metadata:
  name: ${SCAN_NAME}
spec:
  scanProfileName: ${SCAN_PROFILE}
EOF

# Wait for completion
kubectl wait "clusterscans.${SCAN_API_GROUP}/${SCAN_NAME}" \
  --for=condition=Complete \
  --timeout=600s

# Get the scan summary
kubectl get "clusterscans.${SCAN_API_GROUP}/${SCAN_NAME}" \
  -o jsonpath='{.status.summary}'
```

## Step 2: Audit RBAC Configuration

```bash
# Comprehensive RBAC audit
cat > /tmp/rbac-audit.sh << 'SCRIPT'
#!/bin/bash
echo "=== RBAC Security Audit ==="
echo "Date: $(date)"
echo ""

echo "=== Users/Groups with cluster-admin ==="
kubectl get clusterrolebindings -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data['items']:
    if item['roleRef']['name'] == 'cluster-admin':
        for s in item.get('subjects', []):
            print(f\"  {s.get('kind')}: {s.get('name')} ({s.get('namespace', 'cluster-wide')})\")
"

echo ""
echo "=== Default Service Accounts with Non-Default Permissions ==="
kubectl get rolebindings,clusterrolebindings -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    for s in item.get('subjects', []):
        if s.get('kind') == 'ServiceAccount' and s.get('name') == 'default':
            ns = item.get('metadata', {}).get('namespace', 'cluster')
            role = item.get('roleRef', {}).get('name', 'unknown')
            print(f\"  default SA in {ns} has role: {role}\")
"

echo ""
echo "=== Roles with Wildcard Permissions ==="
kubectl get roles,clusterroles -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    kind = item.get('kind', 'Role')
    name = item['metadata']['name']
    namespace = item.get('metadata', {}).get('namespace', 'cluster')
    for rule in item.get('rules', []):
        if '*' in rule.get('verbs', []) or \
           '*' in rule.get('resources', []) or \
           '*' in rule.get('apiGroups', []):
            print(f\"  {kind} {namespace}/{name} has wildcard: {rule}\")
" 2>/dev/null | head -20
SCRIPT

chmod +x /tmp/rbac-audit.sh
/tmp/rbac-audit.sh
```

## Step 3: Audit Container Security

```bash
# Audit pods for security misconfigurations
cat > /tmp/pod-security-audit.sh << 'SCRIPT'
#!/bin/bash
echo "=== Pod Security Audit ==="

echo ""
echo "=== Privileged Containers ==="
kubectl get pods -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    ns = pod['metadata']['namespace']
    name = pod['metadata']['name']
    for section in ('initContainers', 'containers', 'ephemeralContainers'):
        for container in pod['spec'].get(section, []):
            sc = container.get('securityContext', {})
            if sc.get('privileged', False):
                print(f\"  PRIVILEGED: {ns}/{name} - {section}: {container['name']}\")
"

echo ""
echo "=== Containers Not Explicitly Configured to Run as Non-Root ==="
kubectl get pods -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    ns = pod['metadata']['namespace']
    name = pod['metadata']['name']
    spec_sc = pod['spec'].get('securityContext', {})
    for section in ('initContainers', 'containers', 'ephemeralContainers'):
        for container in pod['spec'].get(section, []):
            sc = container.get('securityContext', {})
            run_as_user = sc.get('runAsUser', spec_sc.get('runAsUser', None))
            run_as_non_root = sc.get('runAsNonRoot', spec_sc.get('runAsNonRoot', False))
            if run_as_user == 0:
                print(f\"  EXPLICIT_ROOT: {ns}/{name} - {section}: {container['name']}\")
            elif run_as_user is None and not run_as_non_root:
                print(f\"  NOT_EXPLICIT_NON_ROOT: {ns}/{name} - {section}: {container['name']}\")
" | head -30

echo ""
echo "=== Containers with Host Network ==="
kubectl get pods -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    ns = pod['metadata']['namespace']
    name = pod['metadata']['name']
    if pod['spec'].get('hostNetwork', False):
        print(f\"  HOST_NETWORK: {ns}/{name}\")
"
SCRIPT

chmod +x /tmp/pod-security-audit.sh
/tmp/pod-security-audit.sh
```

## Step 4: Audit Network Policies

```bash
# Audit NetworkPolicy presence by namespace
cat > /tmp/network-policy-audit.sh << 'SCRIPT'
#!/bin/bash
echo "=== Network Policy Audit ==="

echo ""
echo "=== Namespaces WITHOUT Any NetworkPolicies ==="
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  policy_count=$(kubectl get networkpolicy -n "$ns" -o name 2>/dev/null | wc -l)
  if [ "$policy_count" -eq 0 ]; then
    # Check if it's a system namespace
    case "$ns" in
      kube-system|kube-public|kube-node-lease|cattle-system|cattle-monitoring-system)
        echo "  [SYSTEM] $ns - No network policies (system namespace)"
        ;;
      *)
        echo "  [WARNING] $ns - No network policies"
        ;;
    esac
  fi
done

echo ""
echo "=== Network Policy Presence Summary ==="
total_ns=$(kubectl get namespaces --no-headers | wc -l)
ns_with_policy=0
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  count=$(kubectl get networkpolicy -n "$ns" -o name 2>/dev/null | wc -l)
  if [ "$count" -gt 0 ]; then
    ns_with_policy=$((ns_with_policy + 1))
  fi
done

echo "  Total namespaces: $total_ns"
echo "  With at least one NetworkPolicy: $ns_with_policy"
echo "  Without any NetworkPolicies: $((total_ns - ns_with_policy))"
SCRIPT

chmod +x /tmp/network-policy-audit.sh
/tmp/network-policy-audit.sh
```

## Step 5: Audit Secrets and Sensitive Data

```bash
# Audit secrets for potential issues
cat > /tmp/secrets-audit.sh << 'SCRIPT'
#!/bin/bash
echo "=== Secrets Security Audit ==="

echo ""
echo "=== Secrets Referenced Through Environment Variables ==="
kubectl get pods -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    ns = pod['metadata']['namespace']
    name = pod['metadata']['name']
    for section in ('initContainers', 'containers', 'ephemeralContainers'):
        for container in pod['spec'].get(section, []):
            for env in container.get('env', []):
                if env.get('valueFrom', {}).get('secretKeyRef'):
                    secret = env['valueFrom']['secretKeyRef']['name']
                    print(f\"  {ns}/{name}: {section} env var from secret '{secret}'\")
            for env_from in container.get('envFrom', []):
                if env_from.get('secretRef', {}).get('name'):
                    secret = env_from['secretRef']['name']
                    print(f\"  {ns}/{name}: {section} envFrom secret '{secret}'\")
" | head -20

echo ""
echo "=== Checking Encryption at Rest Configuration (Self-Managed Control Planes) ==="
# On self-managed clusters, verify the kube-apiserver static pod includes --encryption-provider-config.
# On hosted control planes such as EKS, AKS, and GKE, use the provider's control-plane encryption documentation.
kubectl -n kube-system get pods -l component=kube-apiserver -o yaml 2>/dev/null | \
  grep -- "--encryption-provider-config" || \
  echo "  NOTE: Verify the kube-apiserver manifest or startup arguments include --encryption-provider-config"
SCRIPT

chmod +x /tmp/secrets-audit.sh
/tmp/secrets-audit.sh
```

## Step 6: Generate a Comprehensive Audit Report

```bash
# Combine all audit results into a single report
cat > /tmp/full-security-audit.sh << 'SCRIPT'
#!/bin/bash
REPORT_DIR="/tmp/security-audit-$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="security-audit-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p "$REPORT_DIR"

echo "Running comprehensive security audit..."
echo "Report directory: $REPORT_DIR"

# Run all audit scripts
/tmp/rbac-audit.sh > "$REPORT_DIR/01-rbac-audit.txt" 2>&1
/tmp/pod-security-audit.sh > "$REPORT_DIR/02-pod-security-audit.txt" 2>&1
/tmp/network-policy-audit.sh > "$REPORT_DIR/03-network-policy-audit.txt" 2>&1
/tmp/secrets-audit.sh > "$REPORT_DIR/04-secrets-audit.txt" 2>&1

# Collect cluster configuration
kubectl get nodes -o wide > "$REPORT_DIR/05-nodes.txt"
kubectl get namespaces > "$REPORT_DIR/06-namespaces.txt"
kubectl get clusterrolebindings > "$REPORT_DIR/07-crbs.txt"
kubectl get clusterscans > "$REPORT_DIR/08-clusterscans.txt" 2>/dev/null || true
kubectl get clusterscanreports > "$REPORT_DIR/09-clusterscanreports.txt" 2>/dev/null || true

# Create summary
echo "Security Audit Report - $(date)" > "$REPORT_DIR/00-summary.txt"
echo "Cluster: $(kubectl config current-context)" >> "$REPORT_DIR/00-summary.txt"

# Package the report
tar -czf "$ARCHIVE_NAME" "$REPORT_DIR"
echo "Audit complete. Report saved to: $ARCHIVE_NAME"
SCRIPT

chmod +x /tmp/full-security-audit.sh
/tmp/full-security-audit.sh
```

## Conclusion

A thorough security audit of your Rancher-managed Kubernetes clusters requires more than just running the CIS benchmark scan. By combining automated CIS scanning with custom RBAC audits, container security checks, network policy analysis, and secrets management review, you get a comprehensive view of your cluster's security posture. Schedule regular audits and track improvements over time to demonstrate continuous security improvement to stakeholders and auditors.
