# Automating Datastore Migration with calicoctl datastore migrate lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Automation, Kubernetes

Description: Automate the Calico datastore migration process using calicoctl datastore migrate lock with scripts that handle validation, execution, and verification.

---

## Introduction

While datastore migration is typically a one-time operation, automating the lock step with scripts ensures it is repeatable, testable, and less error-prone. This is especially valuable when migrating multiple clusters or when you need to practice the migration before performing it in production.

## Prerequisites

- Access to the Calico datastore being locked
- `calicoctl` configured for the migration datastore
- A test environment to validate the automation

## Automated Migration Script

```bash
#!/bin/bash
# automated-migration-datastore-migrate-lock.sh

set -euo pipefail

echo "=== Calico Datastore Migration ==="
echo "Step: datastore migrate lock"
echo "Date: $(date)"
echo ""

# Pre-flight checks
echo "--- Pre-flight Checks ---"
calicoctl version || { echo "FAIL: Cannot connect to datastore"; exit 1; }
echo "Connectivity: OK"

# Count resources before
echo ""
echo "--- Resource Counts (Before) ---"
for r in nodes ippools globalnetworkpolicies networkpolicies bgpconfigurations bgppeers felixconfigurations; do
  if [ "$r" = "networkpolicies" ]; then
    COUNT=$(calicoctl get "$r" --all-namespaces 2>/dev/null | tail -n +2 | wc -l || echo 0)
  else
    COUNT=$(calicoctl get "$r" 2>/dev/null | tail -n +2 | wc -l || echo 0)
  fi
  echo "  $r: $COUNT"
done

# Create a pre-lock resource snapshot
echo ""
echo "--- Creating Resource Snapshot ---"
BACKUP_DIR="migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for r in nodes ippools globalnetworkpolicies networkpolicies bgpconfigurations bgppeers felixconfigurations; do
  if [ "$r" = "networkpolicies" ]; then
    calicoctl get "$r" --all-namespaces -o yaml > "$BACKUP_DIR/$r.yaml" 2>/dev/null || true
  else
    calicoctl get "$r" -o yaml > "$BACKUP_DIR/$r.yaml" 2>/dev/null || true
  fi
done
echo "Resource snapshot saved to $BACKUP_DIR"

# Execute migration step
echo ""
echo "--- Executing: calicoctl datastore migrate lock ---"
calicoctl datastore migrate lock
echo "Step complete."

# Post-step verification
echo ""
echo "--- Post-Step Verification ---"
calicoctl version
calicoctl get nodes -o wide | head -5
```

## CI/CD Pipeline for Migration Testing

```yaml
name: Test Datastore Migration
on:
  workflow_dispatch:

jobs:
  test-migration:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Verify migration test cluster
        run: |
          # Use a non-production cluster configured for the same Calico datastore migration path.
          calicoctl version
          kubectl get nodes

      - name: Run migration lock step
        run: |
          ./automated-migration-datastore-migrate-lock.sh
```

## Verification

```bash
./automated-migration-datastore-migrate-lock.sh
```

## Troubleshooting

- **Script fails at pre-flight**: Fix connectivity before proceeding.
- **Resource snapshot step fails**: Ensure write permissions to the snapshot directory.
- **Migration step returns error**: Check the specific error and refer to the troubleshooting guide.

## Conclusion

Automating `calicoctl datastore migrate lock` with a structured script that includes pre-flight checks, resource snapshots, and post-step verification makes the lock step safer and repeatable. Always test the automation in a non-production environment first, then continue with the export, import, and unlock steps required by the full datastore migration.
