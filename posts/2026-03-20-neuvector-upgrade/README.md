# How to Upgrade NeuVector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Upgrade, Kubernetes, Helm, Maintenance

Description: Step-by-step guide to safely upgrading NeuVector to a new version using Helm, kubectl, or Rancher while maintaining security policy continuity.

## Introduction

Keeping NeuVector up to date ensures you benefit from the latest CVE database updates, security improvements, and feature enhancements. NeuVector follows semantic versioning and provides upgrade paths that preserve your existing security policies. This guide covers upgrading NeuVector using Helm (recommended), kubectl, and Rancher.

## Pre-Upgrade Checklist

Before upgrading:

- [ ] Back up all NeuVector policies and configuration
- [ ] Review the release notes for breaking changes
- [ ] Test the upgrade in a non-production cluster first
- [ ] Ensure your Kubernetes version is compatible with the new NeuVector version
- [ ] Schedule a maintenance window if possible
- [ ] Verify all NeuVector pods are healthy before upgrading

```bash
# Pre-upgrade health check

kubectl get pods -n neuvector
kubectl get pvc -n neuvector
kubectl get svc -n neuvector

# Export current policies as backup
kubectl get nvsecurityrules -A -o yaml > pre-upgrade-policies.yaml
kubectl get nvclusterSecurityrules -o yaml >> pre-upgrade-policies.yaml
```

## Step 1: Check the Current Version

```bash
# Get current NeuVector version
kubectl get deployment neuvector-controller-pod \
  -n neuvector \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check Helm release version
helm list -n neuvector
```

## Step 2: Upgrade Using Helm (Recommended)

```bash
# Update the Helm repository
helm repo update

# Check available versions
helm search repo neuvector/core --versions | head -10

# View the current values
helm get values neuvector -n neuvector > current-values.yaml

# Review what will change
helm diff upgrade neuvector neuvector/core \
  --namespace neuvector \
  --values current-values.yaml \
  --version 2.7.0

# Perform the upgrade
helm upgrade neuvector neuvector/core \
  --namespace neuvector \
  --values current-values.yaml \
  --version 2.7.0 \
  --wait \
  --timeout 15m

# Verify the upgrade
helm status neuvector -n neuvector
kubectl get pods -n neuvector
```

## Step 3: Upgrade Using kubectl

For non-Helm installations, update images directly:

```bash
#!/bin/bash
# kubectl-upgrade.sh

NEW_VERSION="5.3.2"
NAMESPACE="neuvector"

echo "Upgrading NeuVector to version ${NEW_VERSION}..."

# Upgrade Controller
kubectl set image deployment/neuvector-controller-pod \
  neuvector-controller-pod=neuvector/controller:${NEW_VERSION} \
  -n ${NAMESPACE}

# Upgrade Enforcer DaemonSet
kubectl set image daemonset/neuvector-enforcer-pod \
  neuvector-enforcer-pod=neuvector/enforcer:${NEW_VERSION} \
  -n ${NAMESPACE}

# Upgrade Manager
kubectl set image deployment/neuvector-manager-pod \
  neuvector-manager-pod=neuvector/manager:${NEW_VERSION} \
  -n ${NAMESPACE}

# Upgrade Scanner
kubectl set image deployment/neuvector-scanner-pod \
  neuvector-scanner-pod=neuvector/scanner:latest \
  -n ${NAMESPACE}

echo "Waiting for rollout to complete..."
kubectl rollout status deployment/neuvector-controller-pod -n ${NAMESPACE}
kubectl rollout status deployment/neuvector-manager-pod -n ${NAMESPACE}
kubectl rollout status daemonset/neuvector-enforcer-pod -n ${NAMESPACE}

echo "Upgrade complete!"
kubectl get pods -n ${NAMESPACE}
```

## Step 4: Upgrade CRDs

When upgrading between major versions, update the CRDs:

```bash
# Check the NeuVector version you're upgrading to
NEW_VERSION="5.3.2"

# Apply updated CRDs
kubectl apply -f \
  "https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/crd-k8s-1.19.yaml"

# Verify CRDs were updated
kubectl get crd | grep neuvector
```

## Step 5: Upgrade via Rancher UI

For Rancher-managed clusters:

1. Navigate to **Apps** > **Installed Apps** in your cluster
2. Find the NeuVector release
3. Click **Upgrade**
4. Review the new chart version's changes
5. Update any values if required by the new version
6. Click **Upgrade**
7. Monitor the upgrade in **Workloads** > **Pods**

## Step 6: Verify the Upgrade

After upgrading, validate that NeuVector is operating correctly:

```bash
#!/bin/bash
# post-upgrade-verification.sh

echo "=== Post-Upgrade Verification ==="

# Check pod status
echo ""
echo "--- Pod Status ---"
kubectl get pods -n neuvector

# Verify image versions
echo ""
echo "--- Image Versions ---"
kubectl get pods -n neuvector -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Check NeuVector API connectivity
echo ""
echo "--- API Health Check ---"
NV_URL="https://neuvector-manager:8443"
TOKEN=$(curl -sk -X POST "${NV_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"yourpassword"}}' \
  | jq -r '.token.token')

SYSTEM_INFO=$(curl -sk "${NV_URL}/v1/system/summary" \
  -H "X-Auth-Token: ${TOKEN}")

echo "Controller version: $(echo ${SYSTEM_INFO} | jq -r '.summary.controller_version')"
echo "Total enforcers: $(echo ${SYSTEM_INFO} | jq -r '.summary.total_enforcers')"
echo "Total workloads: $(echo ${SYSTEM_INFO} | jq -r '.summary.total_workloads')"

# Verify policies are intact
echo ""
echo "--- Policy Verification ---"
RULE_COUNT=$(curl -sk "${NV_URL}/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.rules | length')
echo "Network rules: ${RULE_COUNT}"

GROUP_COUNT=$(curl -sk "${NV_URL}/v1/group?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.groups | length')
echo "Groups: ${GROUP_COUNT}"
```

## Step 7: Rollback if Needed

If the upgrade causes issues:

```bash
# Rollback with Helm
helm rollback neuvector -n neuvector

# Or rollback to a specific revision
helm history neuvector -n neuvector
helm rollback neuvector 3 -n neuvector

# Verify rollback succeeded
kubectl get pods -n neuvector
```

## Conclusion

Regular NeuVector upgrades ensure you benefit from the latest CVE database updates, security fixes, and new capabilities. By following the step-by-step upgrade workflow above, taking backups before upgrading, and validating post-upgrade functionality, you can upgrade NeuVector with minimal risk. For production clusters, always test upgrades in a staging environment first and maintain rollback capability.
