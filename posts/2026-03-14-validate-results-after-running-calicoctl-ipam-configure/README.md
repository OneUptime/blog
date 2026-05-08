# Validating Results After Running calicoctl ipam configure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Validation, Kubernetes

Description: Verify that calicoctl ipam configure changes are correctly applied and that IP address allocation continues to work properly after IPAM configuration changes.

---

## Introduction

After modifying IPAM configuration with `calicoctl ipam configure`, you must verify that the change took effect and that IP allocation continues to function correctly. Changes to settings like strict affinity can affect how pods get IP addresses across your cluster.

## Prerequisites

- A cluster where IPAM configuration was just changed
- `calicoctl` and `kubectl` access
- Understanding of the expected IPAM behavior

## Verification Steps

### Step 1: Confirm Configuration Applied

```bash
# Check the current configuration

calicoctl ipam show --show-configuration

# Expected output after enabling strict affinity:
# | StrictAffinity     | true  |
```

### Step 2: Verify IP Allocation Still Works

```bash
# Create test pods on different nodes
NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | head -3)
IDX=0
for NODE in $NODES; do
  IDX=$((IDX + 1))
  kubectl run "ipam-test-$IDX" --image=busybox --restart=Never --labels=app=ipam-test \
    --overrides="{\"spec\":{\"nodeName\":\"$NODE\"}}" -- sleep 60
done

# Wait for pods
sleep 10

# Check they got IPs
kubectl get pods -l app=ipam-test -o wide

# Verify IPs are from the correct pool
calicoctl ipam show

# Clean up
kubectl delete pods -l app=ipam-test
```

### Step 3: Verify Block Affinity

```bash
# Check block assignments with strict affinity
calicoctl ipam show --show-blocks

# Check for borrowed addresses
calicoctl ipam show --show-borrowed

# With strict affinity enabled, IP borrowing is not allowed
# With strict affinity disabled, this may show borrowed addresses
```

### Step 4: Cross-Node Connectivity

```bash
# Verify pods on different nodes can communicate
NODE_A=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
NODE_B=$(kubectl get nodes -o jsonpath='{.items[1].metadata.name}')
kubectl run sender --image=busybox --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE_A\"}}" -- sleep 300
kubectl run receiver --image=busybox --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE_B\"}}" -- sleep 300

sleep 10

RECEIVER_IP=$(kubectl get pod receiver -o jsonpath='{.status.podIP}')
kubectl exec sender -- ping -c 3 "$RECEIVER_IP"

kubectl delete pod sender receiver
```

## Comprehensive Validation Script

```bash
#!/bin/bash
# validate-ipam-configure.sh

EXPECTED_STRICT_AFFINITY="${1:-true}"
ERRORS=0

echo "=== IPAM Configuration Validation ==="

# Check configuration
ACTUAL=$(calicoctl ipam show --show-configuration | awk -F'|' '/StrictAffinity/ {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3); print $3}')
if [ "$ACTUAL" = "$EXPECTED_STRICT_AFFINITY" ]; then
  echo "PASS: StrictAffinity is $ACTUAL"
else
  echo "FAIL: StrictAffinity is $ACTUAL (expected $EXPECTED_STRICT_AFFINITY)"
  ERRORS=$((ERRORS + 1))
fi

# Check IP allocation works
kubectl run ipam-validate --image=busybox --restart=Never -- sleep 30 2>/dev/null
sleep 5
POD_IP=$(kubectl get pod ipam-validate -o jsonpath='{.status.podIP}' 2>/dev/null)
if [ -n "$POD_IP" ]; then
  echo "PASS: Pod allocated IP $POD_IP"
else
  echo "FAIL: Pod did not receive an IP"
  ERRORS=$((ERRORS + 1))
fi
kubectl delete pod ipam-validate 2>/dev/null

echo ""
echo "Validation complete. Errors: $ERRORS"
exit $ERRORS
```

## Verification

```bash
./validate-ipam-configure.sh true
```

## Troubleshooting

- **Pod IP allocation fails after change**: Check `calicoctl ipam show` for pool exhaustion. Verify block assignments with `calicoctl ipam show --show-blocks`.
- **Strict affinity shows false when set to true**: The change may not have been applied. Re-run the configure command and check for errors.
- **Cross-node connectivity broken**: Check that encapsulation settings (IPIP/VXLAN) are still correct and that BGP is distributing routes.

## Conclusion

Validating IPAM configuration changes is essential because IP allocation affects every pod in your cluster. By systematically checking the configuration, testing allocation, verifying block affinity, and confirming cross-node connectivity, you ensure that IPAM changes do not disrupt your workloads.
