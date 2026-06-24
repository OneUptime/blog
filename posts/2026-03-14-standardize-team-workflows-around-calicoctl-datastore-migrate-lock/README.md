# Standardizing Team Workflows Around calicoctl datastore migrate lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Team Workflows, Best Practice

Description: Establish team-wide procedures for Calico datastore migration operations using calicoctl datastore migrate lock with proper planning, execution, and verification.

---

## Introduction

Datastore migration affects the entire Calico deployment and should follow strict change management procedures. Standardizing how your team approaches the migration lock step ensures that the process is well-planned, properly executed, and fully verified every time.

## Prerequisites

- Team agreement on an etcdv3-to-Kubernetes datastore migration plan
- Change management process in place
- Test environment for migration rehearsal
- `calicoctl` installed as a binary on a host with access to etcd and the Kubernetes API

## Migration Runbook

```markdown
## Datastore Migration Runbook: datastore migrate lock

### Pre-Migration (Day Before)
- [ ] Notify all stakeholders of maintenance window
- [ ] Verify backup procedures
- [ ] Test migration in staging environment
- [ ] Prepare rollback plan
- [ ] Confirm team availability during migration

### Migration Day
- [ ] Verify source datastore health
- [ ] Execute: calicoctl datastore migrate lock
- [ ] Export the locked etcd datastore contents
- [ ] Reconfigure calicoctl for the Kubernetes datastore
- [ ] Import the exported datastore contents
- [ ] Configure Calico to read from the Kubernetes datastore
- [ ] Wait for calico-node rollout to finish
- [ ] Execute: calicoctl datastore migrate unlock
- [ ] Validate resource counts match pre-migration state
- [ ] Test pod connectivity
- [ ] Monitor for 30 minutes

### Post-Migration
- [ ] Run full validation suite
- [ ] Update documentation with new datastore details
- [ ] Remove old datastore access (after confirmation period)
- [ ] Close change management ticket
```

## Team Communication Template

```markdown
## Calico Datastore Migration - [Date]

**Status**: [Planning/In Progress/Complete/Rolled Back]
**Lead**: [Engineer Name]
**Window**: [Start Time] - [End Time]

### Progress
- [ ] Step: datastore migrate lock - [Status]
- [ ] Export/import - [Status]
- [ ] Datastore unlock - [Status]
- [ ] Validation - [Status]
- [ ] All clear - [Status]

### Impact
- Expected: Existing networking should continue, but Calico configuration changes and new pod networking are paused while the datastore is locked
- Actual: [To be filled during migration]
```

## Standard Migration Script

```bash
#!/bin/bash
# team-migration-datastore-migrate-lock.sh

echo "=== Team Migration: datastore migrate lock ==="
echo "Operator: $USER"
echo "Date: $(date)"

# Confirm readiness

read -p "Have you completed the pre-migration checklist? (yes/no): " READY
if [ "$READY" != "yes" ]; then
  echo "Complete the checklist first."
  exit 1
fi

# Execute
echo "Locking datastore for migration..."
calicoctl datastore migrate lock

echo "Exporting locked etcd datastore..."
calicoctl datastore migrate export > etcd-data

echo "Reconfigure calicoctl to access the Kubernetes datastore before continuing."
read -p "Is calicoctl now configured for the Kubernetes datastore? (yes/no): " CONFIGURED
if [ "$CONFIGURED" != "yes" ]; then
  echo "Configure calicoctl for the Kubernetes datastore before importing."
  exit 1
fi

echo "Importing datastore contents..."
calicoctl datastore migrate import -f etcd-data

echo "Apply the Calico manifest that configures Calico to read from the Kubernetes datastore."
read -p "Have you applied the Kubernetes datastore Calico manifest? (yes/no): " APPLIED
if [ "$APPLIED" != "yes" ]; then
  echo "Apply the Calico manifest before unlocking the datastore."
  exit 1
fi

kubectl rollout status daemonset calico-node -n kube-system

echo "Unlocking datastore..."
calicoctl datastore migrate unlock

# Validate
echo "Running validation..."
calicoctl get nodes -o wide
calicoctl get ippools

echo ""
echo "Step complete. Update the team communication channel."
```

## Verification

```bash
# Run the team migration script
./team-migration-datastore-migrate-lock.sh
```

## Troubleshooting

- **Team member runs migration without checklist**: Require the confirmation prompt in the script.
- **Migration fails during window**: Follow the rollback runbook. Do not improvise.
- **Post-migration issues discovered later**: Diagnostics collected before migration help identify what changed.

## Conclusion

Standardized migration workflows ensure that datastore migrations are safe, predictable operations rather than high-risk adventures. By following runbooks, communicating clearly, and validating at every step, your team completes migrations successfully.
