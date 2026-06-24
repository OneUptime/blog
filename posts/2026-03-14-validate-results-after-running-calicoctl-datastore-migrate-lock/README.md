# Validating Results After Running calicoctl datastore migrate lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Validation, Kubernetes

Description: Verify that calicoctl datastore migrate lock completed successfully by checking resource integrity, counts, and cluster connectivity.

---

## Introduction

After running `calicoctl datastore migrate lock`, validation ensures that `calicoctl` can still read the expected Calico resources before you continue with the export, import, and unlock steps. Skipping validation risks discovering unexpected datastore access or resource-count issues only after later migration steps.

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
  if [ "$r" = "networkpolicies" ]; then
    COUNT=$(calicoctl get "$r" --all-namespaces 2>/dev/null | tail -n +2 | wc -l || echo 0)
  else
    COUNT=$(calicoctl get "$r" 2>/dev/null | tail -n +2 | wc -l || echo 0)
  fi
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

# 5. Test pod scheduling and IP allocation
echo ""
echo "--- Pod IP Allocation Test ---"
kubectl run migration-test --image=busybox --restart=Never --command -- sleep 30 2>/dev/null
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
  BEFORE=$(grep -Ec "^[[:space:]]*kind:" "$BACKUP_DIR/$r.yaml" 2>/dev/null || echo 0)
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
- **Pod IP allocation test fails**: The datastore lock prevents new Calico resources from affecting the cluster, so new pods may not be networked until the migration is complete. Continue only when this behavior matches your migration plan.
- **Cannot connect after migration**: Verify the DATASTORE_TYPE is set correctly for the target datastore.

## Conclusion

Thorough validation after each migration step prevents datastore access and resource-count issues from going undetected. By comparing resource counts, checking critical configurations, and testing pod IP allocation, you confirm that the `calicoctl datastore migrate lock` step completed as expected before continuing the migration.
