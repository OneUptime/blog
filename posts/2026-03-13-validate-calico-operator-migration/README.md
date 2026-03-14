# How to Validate Calico Operator Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Operator, Migration, Validation

Description: Validate a successful Calico manifest-to-operator migration by checking resource ownership, network connectivity, policy enforcement, and operator management status.

---

## Introduction

Validating a Calico operator migration goes beyond confirming that pods are running. You need to verify that all network configurations were preserved, that the operator now owns and manages all Calico resources, that network policies continue to enforce correctly, and that no workload connectivity was disrupted during the transition.

A thorough migration validation compares the pre-migration state (captured in backups) with the post-migration state, tests actual network connectivity through policy-allowed paths, and confirms that the operator lifecycle management is working correctly for future changes.

## Prerequisites

- Calico operator migration completed
- Pre-migration backup files available
- `calicoctl` and `kubectl` access
- Test workloads for connectivity verification

## Validation 1: Operator Ownership

```bash
# Verify the operator now manages calico resources (not the kube-system manifests)
echo "=== Checking operator management ==="

# Should show no Calico pods in kube-system
echo "kube-system Calico pods (should be empty):"
kubectl get pods -n kube-system | grep calico || echo "None - correct!"

# Should show all Calico pods in calico-system
echo ""
echo "calico-system pods (should be running):"
kubectl get pods -n calico-system

# Check TigeraStatus - all components should be Available
echo ""
echo "TigeraStatus:"
kubectl get tigerastatus
```

## Validation 2: IP Pool Preservation

```bash
# Compare IP pools with pre-migration backup
echo "=== IP Pool Validation ==="

echo "Current IP pools:"
calicoctl get ippools -o yaml

echo ""
echo "Pre-migration backup:"
cat calico-migration-backup-*/ippools.yaml

# Verify CIDR ranges match
current_cidr=$(calicoctl get ippool default-ipv4-ippool \
  -o jsonpath='{.spec.cidr}' 2>/dev/null)
backup_cidr=$(grep "cidr:" calico-migration-backup-*/ippools.yaml | head -1 | awk '{print $2}')

if [[ "${current_cidr}" == "${backup_cidr}" ]]; then
  echo "OK: IP pool CIDR preserved: ${current_cidr}"
else
  echo "FAIL: CIDR mismatch - current: ${current_cidr}, backup: ${backup_cidr}"
fi
```

## Validation 3: Network Policy Preservation

```bash
# Verify all global network policies are present
echo "=== Network Policy Validation ==="

current_gnps=$(calicoctl get globalnetworkpolicies --no-headers | wc -l)
backup_gnps=$(grep "^- apiVersion" calico-migration-backup-*/gnps.yaml | wc -l)

echo "Current GNPs: ${current_gnps}"
echo "Pre-migration GNPs: ${backup_gnps}"

if [[ "${current_gnps}" -eq "${backup_gnps}" ]]; then
  echo "OK: Global network policy count matches"
else
  echo "WARNING: Count mismatch. Review policies."
  diff <(calicoctl get gnp -o json | jq '[.[].metadata.name] | sort') \
       <(cat calico-migration-backup-*/gnps.yaml | \
         grep "^  name:" | awk '{print $2}' | sort | jq -R . | jq -s .)
fi
```

## Validation 4: Network Connectivity Test

```bash
#!/bin/bash
# test-network-connectivity.sh
echo "=== Network Connectivity Validation ==="

# Deploy test pods in different namespaces
kubectl run test-client -n default --image=busybox:latest \
  --restart=Never -- sleep 3600

kubectl run test-server -n kube-system --image=nginx:alpine \
  --restart=Never --expose --port=80

sleep 10

# Test pod-to-pod connectivity
SERVER_IP=$(kubectl get pod test-server -n kube-system \
  -o jsonpath='{.status.podIP}')

echo "Testing connectivity to ${SERVER_IP}..."
kubectl exec test-client -n default -- \
  wget -qO- --timeout=5 "http://${SERVER_IP}" > /dev/null \
  && echo "OK: Pod-to-pod connectivity working" \
  || echo "FAIL: Pod-to-pod connectivity failed"

# Test DNS resolution
kubectl exec test-client -n default -- \
  nslookup kubernetes.default.svc.cluster.local > /dev/null \
  && echo "OK: DNS resolution working" \
  || echo "FAIL: DNS resolution failed"

# Cleanup
kubectl delete pod test-client -n default
kubectl delete pod,svc test-server -n kube-system
```

## Validation 5: Felix Configuration Preservation

```bash
# Compare Felix configuration
echo "=== Felix Configuration Validation ==="

echo "Current FelixConfiguration:"
calicoctl get felixconfiguration default -o yaml

echo ""
echo "Pre-migration FelixConfiguration:"
cat calico-migration-backup-*/felixconfig.yaml
```

## Validation Summary Report

```bash
#!/bin/bash
# migration-validation-report.sh
echo "CALICO OPERATOR MIGRATION VALIDATION REPORT"
echo "Date: $(date)"
echo "Cluster: $(kubectl config current-context)"
echo ""

echo "1. Operator Status"
kubectl get tigerastatus

echo ""
echo "2. Pod Status"
kubectl get pods -n calico-system

echo ""
echo "3. TigeraStatus Conditions"
kubectl get tigerastatus -o jsonpath='{range .items[*]}{.metadata.name}{": "}{range .status.conditions[*]}{.type}={.status}{" "}{end}{"\n"}{end}'

echo ""
echo "4. Node Network Status"
kubectl get nodes -o custom-columns=\
"NAME:.metadata.name,STATUS:.status.conditions[?(@.type=='Ready')].status"
```

## Conclusion

Validating a Calico operator migration requires checking four key areas: operator ownership (no legacy kube-system pods), configuration preservation (IP pools, FelixConfig, network policies), actual network connectivity (pod-to-pod and DNS), and operator health (TigeraStatus). Run all validation checks immediately after migration and save the results as migration evidence. If any validation fails, use the pre-migration backup files to compare expected vs actual configuration and identify what was not properly migrated.
