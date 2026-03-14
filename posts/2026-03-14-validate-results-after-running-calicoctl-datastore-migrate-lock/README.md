# Validating Results After Running calicoctl datastore migrate lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Validation, Kubernetes

Description: Verify that calicoctl datastore migrate lock completed successfully by checking resource integrity, counts, and cluster connectivity.

---

## Introduction

After running `calicoctl datastore migrate lock`, thorough validation ensures that your Calico data is intact and the migration step completed correctly. Skipping validation risks discovering data loss or corruption only after the migration is finalized.

## Prerequisites

- Completed execution of `calicoctl datastore migrate lock`
- Access to source and/or target datastore
- Pre-migration resource counts for comparison

## Validation Checklist

```bash
#!/bin/bash
# validate-migration-step.sh

echo "=== Migration Step Validation ==="

# 1. Verify calicoctl connectivity
echo "--- Connectivity ---"
calicoctl version && echo "OK" || echo "FAIL"

# 2. Count resources
echo ""
echo "--- Resource Counts ---"
for r in nodes ippools globalnetworkpolicies networkpolicies bgpconfigurations bgppeers felixconfigurations; do
  COUNT=$(calicoctl get "$r" 2>/dev/null | tail -n +2 | wc -l || echo 0)
  echo "  $r: $COUNT"
done

# 3. Check critical resources
echo ""
echo "--- Critical Resources ---"
calicoctl get ippools -o wide
echo ""
calicoctl get bgpconfigurations default -o yaml 2>/dev/null | head -10

# 4. Verify node health
echo ""
echo "--- Node Health ---"
calicoctl get nodes -o wide

# 5. Test pod connectivity
echo ""
echo "--- Connectivity Test ---"
kubectl run migration-test --image=busybox --restart=Never -- sleep 30 2>/dev/null
sleep 5
POD_IP=$(kubectl get pod migration-test -o jsonpath='{.status.podIP}' 2>/dev/null)
echo "Test pod IP: ${POD_IP:-FAILED}"
kubectl delete pod migration-test --grace-period=0 2>/dev/null
```

## Comparing with Pre-Migration State

```bash
#!/bin/bash
# compare-migration-state.sh

BACKUP_DIR="$1"
if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: $0 <backup-directory>"
  exit 1
fi

echo "=== Comparing with Pre-Migration State ==="

for r in nodes ippools globalnetworkpolicies bgpconfigurations; do
  BEFORE=$(grep -c "name:" "$BACKUP_DIR/$r.yaml" 2>/dev/null || echo 0)
  AFTER=$(calicoctl get "$r" 2>/dev/null | tail -n +2 | wc -l || echo 0)
  
  if [ "$BEFORE" = "$AFTER" ]; then
    echo "  $r: OK ($BEFORE -> $AFTER)"
  else
    echo "  $r: MISMATCH ($BEFORE -> $AFTER)"
  fi
done
```

## Verification

```bash
./validate-migration-step.sh
./compare-migration-state.sh migration-backup-*/
```

## Troubleshooting

- **Resource count mismatch**: Some system resources may be auto-created or excluded. Check which specific resources differ.
- **Connectivity test fails**: The migration may have temporarily disrupted networking. Wait 30 seconds and retry.
- **Cannot connect after migration**: Verify the DATASTORE_TYPE is set correctly for the target datastore.

## Conclusion

Thorough validation after each migration step prevents data loss from going undetected. By comparing resource counts, checking critical configurations, and testing connectivity, you confirm that `calicoctl datastore migrate lock` completed successfully.
