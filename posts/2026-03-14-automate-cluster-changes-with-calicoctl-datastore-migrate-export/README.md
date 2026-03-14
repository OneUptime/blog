# Automating Datastore Migration with calicoctl datastore migrate export

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Datastore Migration, Automation, Kubernetes

Description: Automate the Calico datastore migration process using calicoctl datastore migrate export with scripts that handle validation, execution, and verification.

---

## Introduction

While datastore migration is typically a one-time operation, automating the process with scripts ensures it is repeatable, testable, and less error-prone. This is especially valuable when migrating multiple clusters or when you need to practice the migration before performing it in production.

## Prerequisites

- Source and target datastore access
- `calicoctl` configured for migration
- A test environment to validate the automation

## Automated Migration Script

```bash
#!/bin/bash
# automated-migration-datastore-migrate-export.sh
set -euo pipefail

echo "=== Calico Datastore Migration ==="
echo "Step: datastore migrate export"
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
  COUNT=$(calicoctl get "$r" 2>/dev/null | tail -n +2 | wc -l || echo 0)
  echo "  $r: $COUNT"
done

# Create backup
echo ""
echo "--- Creating Backup ---"
BACKUP_DIR="migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for r in nodes ippools globalnetworkpolicies networkpolicies bgpconfigurations bgppeers felixconfigurations; do
  calicoctl get "$r" -o yaml > "$BACKUP_DIR/$r.yaml" 2>/dev/null || true
done
echo "Backup saved to $BACKUP_DIR"

# Execute migration step
echo ""
echo "--- Executing: calicoctl datastore migrate export ---"
calicoctl datastore migrate export
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
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup test cluster
        run: |
          # Create a kind cluster with Calico for testing
          kind create cluster
          kubectl apply -f calico-manifests/

      - name: Run migration
        run: |
          ./automated-migration-datastore-migrate-export.sh
```

## Verification

```bash
./automated-migration-datastore-migrate-export.sh
```

## Troubleshooting

- **Script fails at pre-flight**: Fix connectivity before proceeding.
- **Backup step fails**: Ensure write permissions to the backup directory.
- **Migration step returns error**: Check the specific error and refer to the troubleshooting guide.

## Conclusion

Automating `calicoctl datastore migrate export` with a structured script that includes pre-flight checks, backups, and post-step verification makes the migration process safer and repeatable. Always test the automation in a non-production environment first.
