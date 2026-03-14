# Rolling Back Safely After Using calicoctl ipam configure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Rollback, Kubernetes

Description: Safely revert IPAM configuration changes made with calicoctl ipam configure when they cause IP allocation issues or unexpected behavior.

---

## Introduction

IPAM configuration changes can have immediate effects on pod IP allocation. If enabling strict affinity causes pods to fail to get IP addresses, or if disabling it creates routing conflicts, you need to roll back quickly. The rollback procedure is straightforward since `calicoctl ipam configure` modifies a single configuration.

## Prerequisites

- A cluster where IPAM configuration was recently changed
- `calicoctl` access
- Knowledge of the previous configuration

## Rolling Back Strict Affinity

```bash
# Check current setting
calicoctl ipam configure show

# Revert to the previous setting
# If you enabled strict affinity and need to revert:
calicoctl ipam configure --strictaffinity=false

# If you disabled strict affinity and need to revert:
calicoctl ipam configure --strictaffinity=true

# Verify
calicoctl ipam configure show
```

## Post-Rollback Verification

```bash
#!/bin/bash
# post-ipam-rollback-verify.sh

echo "=== Post-IPAM Rollback Verification ==="

# 1. Check configuration
echo "IPAM Configuration:"
calicoctl ipam configure show

# 2. Check IP utilization
echo ""
echo "IP Utilization:"
calicoctl ipam show

# 3. Test pod creation
echo ""
echo "Testing pod creation..."
kubectl run rollback-test --image=busybox --restart=Never -- sleep 30
sleep 5
POD_IP=$(kubectl get pod rollback-test -o jsonpath='{.status.podIP}' 2>/dev/null)
if [ -n "$POD_IP" ]; then
  echo "PASS: Pod got IP $POD_IP"
else
  echo "FAIL: Pod did not get an IP"
fi
kubectl delete pod rollback-test --grace-period=0 2>/dev/null

# 4. Check for IPAM errors
echo ""
echo "IPAM Health:"
calicoctl ipam check 2>&1 | tail -5
```

## Handling Stuck Pods After Rollback

If pods were unable to get IPs during the misconfiguration:

```bash
# Find pods stuck without IPs
kubectl get pods --all-namespaces --field-selector=status.podIP="" -o wide

# Restart stuck pods
kubectl get pods --all-namespaces --field-selector=status.podIP="" -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    ns = pod['metadata']['namespace']
    name = pod['metadata']['name']
    print(f'kubectl delete pod -n {ns} {name}')
"
```

## Verification

```bash
./post-ipam-rollback-verify.sh
```

All checks should pass and pods should receive IPs normally.

## Troubleshooting

- **Rollback does not take effect immediately**: IPAM configuration changes may take a few seconds to propagate to all nodes. Wait 30 seconds and verify.
- **Some pods still without IPs**: Delete and recreate stuck pods. The IPAM system should allocate IPs from the corrected configuration.
- **Block affinities in inconsistent state**: Run `calicoctl ipam check` to identify and resolve inconsistencies.

## Conclusion

Rolling back `calicoctl ipam configure` changes is a simple one-command operation, but verifying the rollback and recovering affected pods requires systematic checking. Always verify pod IP allocation works correctly after any IPAM configuration change or rollback.
