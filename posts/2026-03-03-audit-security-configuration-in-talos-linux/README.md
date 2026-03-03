# How to Audit Security Configuration in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Security Audit, Compliance, Kubernetes, Configuration Management

Description: Learn how to audit and verify the security configuration of Talos Linux clusters with automated checks, compliance validation, and reporting tools.

---

Running a secure cluster means regularly verifying that your security controls are actually in place and working correctly. It is easy for configurations to drift over time, especially when multiple people are making changes or when operational pressure leads to shortcuts. Auditing your Talos Linux security configuration on a regular schedule catches problems before they become incidents.

This guide covers what to audit, how to perform the checks, and how to automate the process.

## What to Audit

A comprehensive security audit of a Talos Linux cluster covers these areas:

1. Machine configuration settings
2. Certificate health and expiration
3. RBAC configuration (both Talos and Kubernetes)
4. Pod security enforcement
5. Network policies
6. Encryption settings
7. Running workloads and their security context
8. API server configuration
9. etcd security settings

## Auditing Machine Configuration

The machine configuration defines the security posture of each node. Start by pulling configs from all nodes and comparing them against your security baseline.

```bash
#!/bin/bash
# audit-machine-configs.sh
# Pulls and audits machine configurations from all nodes

AUDIT_DIR="audit-$(date +%Y%m%d)"
mkdir -p "$AUDIT_DIR"

NODES="10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11"

for node in $NODES; do
  echo "Pulling config from $node..."
  talosctl -n $node get machineconfig -o yaml > "${AUDIT_DIR}/config-${node}.yaml"
done

echo "Checking security settings..."

for config in ${AUDIT_DIR}/config-*.yaml; do
  NODE=$(basename "$config" | sed 's/config-//' | sed 's/.yaml//')
  echo ""
  echo "=== Node: $NODE ==="

  # Check RBAC
  if grep -q "rbac: true" "$config"; then
    echo "  RBAC: ENABLED"
  else
    echo "  RBAC: DISABLED [WARNING]"
  fi

  # Check disk encryption
  if grep -q "systemDiskEncryption" "$config"; then
    echo "  Disk Encryption: ENABLED"
  else
    echo "  Disk Encryption: DISABLED [WARNING]"
  fi

  # Check KubeSpan
  if grep -q "kubespan" "$config" && grep -A1 "kubespan" "$config" | grep -q "enabled: true"; then
    echo "  KubeSpan: ENABLED"
  else
    echo "  KubeSpan: DISABLED [INFO]"
  fi

  # Check for insecure settings
  if grep -q "allowSchedulingOnControlPlanes: true" "$config"; then
    echo "  Scheduling on CP: ALLOWED [WARNING]"
  else
    echo "  Scheduling on CP: BLOCKED"
  fi
done
```

## Auditing Certificate Health

Check all certificates for upcoming expirations and proper configuration.

```bash
#!/bin/bash
# audit-certificates.sh

WARNING_DAYS=90
CONTROL_PLANE="10.0.1.10"

echo "=== Certificate Audit ==="

# Check Talos CA
TALOS_CA_EXPIRY=$(talosctl -n $CONTROL_PLANE get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
TALOS_CA_DAYS=$(( ( $(date -d "$TALOS_CA_EXPIRY" +%s) - $(date +%s) ) / 86400 ))
echo "Talos API CA: expires in $TALOS_CA_DAYS days ($TALOS_CA_EXPIRY)"
[ "$TALOS_CA_DAYS" -lt "$WARNING_DAYS" ] && echo "  [WARNING] Approaching expiration!"

# Check Kubernetes CA
K8S_CA_EXPIRY=$(talosctl -n $CONTROL_PLANE get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
K8S_CA_DAYS=$(( ( $(date -d "$K8S_CA_EXPIRY" +%s) - $(date +%s) ) / 86400 ))
echo "Kubernetes CA: expires in $K8S_CA_DAYS days ($K8S_CA_EXPIRY)"
[ "$K8S_CA_DAYS" -lt "$WARNING_DAYS" ] && echo "  [WARNING] Approaching expiration!"

# Check API server certificate
API_CERT_EXPIRY=$(talosctl -n $CONTROL_PLANE read /etc/kubernetes/pki/apiserver.crt | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$API_CERT_EXPIRY" ]; then
  API_CERT_DAYS=$(( ( $(date -d "$API_CERT_EXPIRY" +%s) - $(date +%s) ) / 86400 ))
  echo "API Server cert: expires in $API_CERT_DAYS days ($API_CERT_EXPIRY)"
fi

# Check certificate key sizes
echo ""
echo "=== Key Size Audit ==="
TALOS_KEY_SIZE=$(talosctl -n $CONTROL_PLANE get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d | \
  openssl x509 -noout -text 2>/dev/null | grep "Public-Key" | grep -o "[0-9]*")
echo "Talos CA key size: $TALOS_KEY_SIZE bits"
[ "$TALOS_KEY_SIZE" -lt 2048 ] && echo "  [CRITICAL] Key size below 2048 bits!"
```

## Auditing Kubernetes RBAC

Review RBAC bindings to find overly permissive configurations.

```bash
#!/bin/bash
# audit-k8s-rbac.sh

echo "=== Kubernetes RBAC Audit ==="

# Find all cluster-admin bindings
echo "Cluster-Admin Bindings:"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") |
    "  \(.metadata.name): \(.subjects // [] | map("\(.kind)/\(.name)") | join(", "))"'

echo ""

# Find service accounts with cluster-wide permissions
echo "Service Accounts with ClusterRoleBindings:"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.subjects[]?.kind=="ServiceAccount") |
    "  \(.metadata.name) -> \(.roleRef.name) [\(.subjects[] | select(.kind=="ServiceAccount") | "\(.namespace)/\(.name)")]"'

echo ""

# Check for default service account usage
echo "Pods using default service account:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.serviceAccountName=="default" or .spec.serviceAccountName==null) |
    "  \(.metadata.namespace)/\(.metadata.name)"' | head -20

echo ""

# Check for automounted service account tokens
echo "Pods with automounted service account tokens:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.automountServiceAccountToken != false) |
    "  \(.metadata.namespace)/\(.metadata.name)"' | wc -l
echo "  (Consider setting automountServiceAccountToken: false where not needed)"
```

## Auditing Pod Security

Check running pods for security violations.

```bash
#!/bin/bash
# audit-pod-security.sh

echo "=== Pod Security Audit ==="

# Find privileged containers
echo "Privileged containers:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | .spec.containers[] as $c |
    select($c.securityContext.privileged == true) |
    "  \(.metadata.namespace)/\(.metadata.name) [\($c.name)]"'

echo ""

# Find containers running as root
echo "Containers running as root (UID 0):"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | .spec.containers[] as $c |
    select($c.securityContext.runAsUser == 0 or
      ($c.securityContext.runAsNonRoot != true and .spec.securityContext.runAsNonRoot != true)) |
    "  \(.metadata.namespace)/\(.metadata.name) [\($c.name)]"' | head -20

echo ""

# Find containers with host networking
echo "Pods with host networking:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.hostNetwork == true) |
    "  \(.metadata.namespace)/\(.metadata.name)"'

echo ""

# Find containers with host PID
echo "Pods with host PID namespace:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.hostPID == true) |
    "  \(.metadata.namespace)/\(.metadata.name)"'

echo ""

# Check Pod Security Admission labels
echo "Namespace Pod Security labels:"
kubectl get namespaces -o json | \
  jq -r '.items[] |
    "  \(.metadata.name): enforce=\(.metadata.labels["pod-security.kubernetes.io/enforce"] // "none") warn=\(.metadata.labels["pod-security.kubernetes.io/warn"] // "none")"'
```

## Auditing Network Policies

Verify that network policies are in place and functioning.

```bash
#!/bin/bash
# audit-network-policies.sh

echo "=== Network Policy Audit ==="

# Check which namespaces have network policies
echo "Network policies per namespace:"
kubectl get networkpolicies --all-namespaces --no-headers | \
  awk '{print $1}' | sort | uniq -c | sort -rn

echo ""

# Find namespaces without any network policies
echo "Namespaces WITHOUT network policies:"
ALL_NS=$(kubectl get namespaces -o json | jq -r '.items[].metadata.name')
NP_NS=$(kubectl get networkpolicies --all-namespaces --no-headers | awk '{print $1}' | sort -u)

for ns in $ALL_NS; do
  if ! echo "$NP_NS" | grep -q "^${ns}$"; then
    echo "  $ns [WARNING]"
  fi
done

echo ""

# Check for default-deny policies
echo "Default-deny policies:"
kubectl get networkpolicies --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.podSelector == {} or .spec.podSelector.matchLabels == null) |
    "  \(.metadata.namespace)/\(.metadata.name) types=\(.spec.policyTypes | join(","))"'
```

## Auditing API Server Configuration

Verify the API server is configured securely.

```bash
#!/bin/bash
# audit-apiserver.sh

echo "=== API Server Audit ==="
CONTROL_PLANE="10.0.1.10"

# Get API server manifest
API_CONFIG=$(talosctl -n $CONTROL_PLANE read /etc/kubernetes/manifests/kube-apiserver.yaml)

# Check authorization mode
echo -n "Authorization Mode: "
echo "$API_CONFIG" | grep "authorization-mode" | awk -F= '{print $2}'

# Check anonymous auth
echo -n "Anonymous Auth: "
if echo "$API_CONFIG" | grep -q "anonymous-auth=false"; then
  echo "DISABLED (good)"
else
  echo "ENABLED [WARNING]"
fi

# Check TLS settings
echo -n "TLS Min Version: "
echo "$API_CONFIG" | grep "tls-min-version" | awk -F= '{print $2}' || echo "DEFAULT [INFO]"

# Check audit logging
echo -n "Audit Logging: "
if echo "$API_CONFIG" | grep -q "audit-log-path"; then
  echo "ENABLED"
else
  echo "DISABLED [WARNING]"
fi

# Check encryption config
echo -n "Secrets Encryption: "
if echo "$API_CONFIG" | grep -q "encryption-provider-config"; then
  echo "ENABLED"
else
  echo "DISABLED [WARNING]"
fi
```

## Generating Audit Reports

Combine all checks into a single report.

```bash
#!/bin/bash
# full-audit-report.sh

REPORT_FILE="security-audit-$(date +%Y%m%d).txt"

{
  echo "========================================="
  echo "Talos Linux Security Audit Report"
  echo "Date: $(date)"
  echo "Cluster: $(kubectl config current-context)"
  echo "========================================="
  echo ""

  echo "--- Machine Configuration ---"
  bash audit-machine-configs.sh
  echo ""

  echo "--- Certificates ---"
  bash audit-certificates.sh
  echo ""

  echo "--- Kubernetes RBAC ---"
  bash audit-k8s-rbac.sh
  echo ""

  echo "--- Pod Security ---"
  bash audit-pod-security.sh
  echo ""

  echo "--- Network Policies ---"
  bash audit-network-policies.sh
  echo ""

  echo "--- API Server ---"
  bash audit-apiserver.sh
  echo ""

  echo "========================================="
  echo "End of Report"
  echo "========================================="
} > "$REPORT_FILE"

echo "Audit report saved to: $REPORT_FILE"
```

## Automating Audits with CI/CD

Run audits automatically on a schedule.

```yaml
# .github/workflows/security-audit.yaml
name: Weekly Security Audit

on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8 AM
  workflow_dispatch:

jobs:
  audit:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Run security audit
        run: bash scripts/full-audit-report.sh

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: security-audit
          path: security-audit-*.txt

      - name: Check for critical findings
        run: |
          if grep -q "CRITICAL" security-audit-*.txt; then
            echo "Critical findings detected!"
            exit 1
          fi
```

## Conclusion

Regular security auditing of your Talos Linux cluster ensures that your hardening measures remain effective over time. Automate the checks, run them weekly, and review the reports. Focus on the areas that are most likely to drift: RBAC bindings, pod security contexts, network policies, and certificate expiration. Build a culture where security audits are routine, not reactive, and you will catch issues while they are still easy to fix.
