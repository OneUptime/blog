# Validating Results After Running calicoctl datastore migrate export

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Validation, Kubernetes

Description: Verify that calicoctl datastore migrate export completed successfully by checking resource integrity, counts, and cluster connectivity.

---

## Introduction

After running `calicoctl datastore migrate export`, thorough validation ensures that your Calico data is intact and the migration step completed correctly. Skipping validation risks discovering data loss or corruption only after the migration is finalized.

## Prerequisites

- Completed execution of `calicoctl datastore migrate export > etcd-data`
- Access to the source etcdv3 datastore
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

# 5. Check existing pod networking
echo ""
echo "--- Existing Pod IPs ---"
kubectl get pods --all-namespaces -o wide
```

## Comparing with Pre-Migration State

```bash
#!/bin/bash
# compare-migration-state.sh

EXPORT_FILE="$1"
if [ -z "$EXPORT_FILE" ]; then
  echo "Usage: $0 <export-file>"
  exit 1
fi

echo "=== Comparing with Pre-Migration State ==="

for r in nodes ippools globalnetworkpolicies bgpconfigurations; do
  case "$r" in
    nodes) KIND="Node" ;;
    ippools) KIND="IPPool" ;;
    globalnetworkpolicies) KIND="GlobalNetworkPolicy" ;;
    bgpconfigurations) KIND="BGPConfiguration" ;;
  esac

  BEFORE=$(grep -c "kind: $KIND" "$EXPORT_FILE" 2>/dev/null || echo 0)
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
./compare-migration-state.sh etcd-data
```

## Troubleshooting

- **Resource count mismatch**: Some system resources may be auto-created or excluded. Check which specific resources differ.
- **Existing pods have no IPs**: The migration may have temporarily disrupted networking. Wait 30 seconds and retry.
- **Cannot connect after export**: Verify the DATASTORE_TYPE is set to `etcdv3` for the source datastore.

## Conclusion

Thorough validation after each migration step prevents data loss from going undetected. By comparing resource counts, checking critical configurations, and testing connectivity, you confirm that `calicoctl datastore migrate export` completed successfully.
