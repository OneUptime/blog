# How to Audit Dapr Security Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Audit, Compliance, Kubernetes

Description: Learn how to audit Dapr security configuration by checking mTLS status, access control policies, secret store usage, and component scoping across your cluster.

---

Auditing Dapr's security configuration ensures your microservices deployment meets security requirements and identifies misconfigurations before they become vulnerabilities. This guide covers the key areas to audit and the tools to do it.

## What to Audit in a Dapr Deployment

A comprehensive Dapr security audit covers:
1. mTLS enablement across all namespaces
2. Access control policy coverage
3. Secret reference usage (no plaintext credentials)
4. Component scoping
5. Certificate expiry
6. Sidecar injection coverage

## Audit mTLS Status

```bash
# Check mTLS configuration for all namespaces
kubectl get configurations --all-namespaces -o json | \
  jq '.items[] | {name: .metadata.name, namespace: .metadata.namespace, mtls: .spec.mtls}'

# Check if mTLS is enabled
dapr mtls -k

# Verify certificate expiry
dapr mtls expiry
```

## Audit Component Security

Check for plaintext secrets in component files:

```bash
# Search for plaintext values that should be secret references
kubectl get components --all-namespaces -o yaml | \
  grep -A2 "name: password\|name: secretKey\|name: connectionString" | \
  grep "value:" | grep -v "secretKeyRef"

# List all components and their secret store usage
kubectl get components --all-namespaces -o json | jq '
  .items[] | {
    name: .metadata.name,
    namespace: .metadata.namespace,
    type: .spec.type,
    scopes: .scopes,
    usesSecretRef: ([.spec.metadata[]?.secretKeyRef] | any)
  }'
```

## Audit Access Control Policies

```bash
# List all configurations with access control settings
kubectl get configurations --all-namespaces -o json | jq '
  .items[] | select(.spec.accessControl != null) | {
    name: .metadata.name,
    namespace: .metadata.namespace,
    defaultAction: .spec.accessControl.defaultAction,
    policyCount: (.spec.accessControl.policies | length)
  }'

# Identify services with no access control configuration
kubectl get deployments --all-namespaces -o json | jq -r '
  .items[] |
  select(.spec.template.metadata.annotations["dapr.io/enabled"] == "true") |
  "\(.metadata.namespace)/\(.metadata.name) \(.spec.template.metadata.annotations["dapr.io/config"] // "NONE")"'
```

## Audit Sidecar Injection Coverage

```bash
# Find pods without Dapr injection enabled
kubectl get pods --all-namespaces -o json | jq '
  .items[] |
  select(.metadata.annotations["dapr.io/enabled"] != "true") |
  {
    name: .metadata.name,
    namespace: .metadata.namespace,
    warning: "Dapr sidecar not enabled"
  }'
```

## Automated Security Audit Script

```bash
#!/bin/bash
echo "=== Dapr Security Audit Report ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

echo "--- mTLS Status ---"
dapr mtls -k 2>/dev/null || echo "ERROR: Could not retrieve mTLS status"

echo ""
echo "--- Certificate Expiry ---"
dapr mtls expiry 2>/dev/null || echo "ERROR: Could not check certificate expiry"

echo ""
echo "--- Components with Plaintext Credentials (FAIL if any) ---"
PLAIN_CREDS=$(kubectl get components --all-namespaces -o yaml | \
  grep -c "value: .*[Pp]assword\|value: .*[Ss]ecret")
if [ "$PLAIN_CREDS" -gt 0 ]; then
  echo "FAIL: Found $PLAIN_CREDS potential plaintext credential(s)"
else
  echo "PASS: No plaintext credentials detected"
fi

echo ""
echo "--- Component Scoping Coverage ---"
kubectl get components --all-namespaces -o json | jq '
  .items[] | {
    name: .metadata.name,
    scoped: (.scopes != null and (.scopes | length) > 0)
  }'
```

## Summary

Auditing Dapr security requires checking mTLS configuration, certificate expiry, component credential storage, access control policies, and sidecar injection coverage. Automate these checks with scripts that run on a schedule and integrate them into your CI/CD pipeline. Treat any component with plaintext credentials or disabled mTLS as a critical finding.
