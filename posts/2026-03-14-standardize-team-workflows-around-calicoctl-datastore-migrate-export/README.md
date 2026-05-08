# Standardizing Team Workflows Around calicoctl datastore migrate export

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Team Workflows, Best Practice

Description: Establish team-wide procedures for Calico datastore migration operations using calicoctl datastore migrate export with proper planning, execution, and verification.

---

## Introduction

Datastore migration affects the entire Calico deployment and should follow strict change management procedures. Standardizing how your team approaches migration ensures that the process is well-planned, properly executed, and fully verified every time.

## Prerequisites

- Team agreement on migration plan
- Change management process in place
- Test environment for migration rehearsal

## Migration Runbook

```markdown
## Datastore Migration Runbook: datastore migrate export

### Pre-Migration (Day Before)
- [ ] Notify all stakeholders of maintenance window
- [ ] Verify backup procedures
- [ ] Test migration in staging environment
- [ ] Prepare rollback plan
- [ ] Confirm team availability during migration

### Migration Day
- [ ] Take final backup of all Calico resources
- [ ] Verify source datastore health
- [ ] Lock the source datastore for migration
- [ ] Execute: calicoctl datastore migrate export > etcd-migration
- [ ] Validate the export file was created and is non-empty
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
- [ ] Step: datastore migrate export - [Status]
- [ ] Validation - [Status]
- [ ] All clear - [Status]

### Impact
- Expected: New pods will not start while the datastore is locked for migration
- Actual: [To be filled during migration]
```

## Standard Migration Script

```bash
#!/bin/bash
# team-migration-datastore-migrate-export.sh

echo "=== Team Migration: datastore migrate export ==="
echo "Operator: $USER"
echo "Date: $(date)"
OUTPUT_FILE="${OUTPUT_FILE:-etcd-migration}"

# Confirm readiness

read -p "Have you completed the pre-migration checklist? (yes/no): " READY
if [ "$READY" != "yes" ]; then
  echo "Complete the checklist first."
  exit 1
fi

# Execute
echo "Executing migration step..."
calicoctl datastore migrate export > "$OUTPUT_FILE"

# Validate
echo "Running validation..."
test -s "$OUTPUT_FILE"
calicoctl get nodes -o wide
calicoctl get ippools

echo ""
echo "Export step complete. Continue with the import and unlock steps, then update the team communication channel."
```

## Verification

```bash
# Run the team migration script
./team-migration-datastore-migrate-export.sh
```

## Troubleshooting

- **Team member runs migration without checklist**: Require the confirmation prompt in the script.
- **Migration fails during window**: Follow the rollback runbook. Do not improvise.
- **Post-migration issues discovered later**: Diagnostics collected before migration help identify what changed.

## Conclusion

Standardized migration workflows ensure that datastore migrations are safe, predictable operations rather than high-risk adventures. By following runbooks, communicating clearly, and validating at every step, your team completes migrations successfully.
