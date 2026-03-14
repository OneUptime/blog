# Standardizing Team Workflows Around calicoctl datastore migrate import

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Datastore Migration, Team Workflows, Best Practices

Description: Establish team-wide procedures for Calico datastore migration operations using calicoctl datastore migrate import with proper planning, execution, and verification.

---

## Introduction

Datastore migration affects the entire Calico deployment and should follow strict change management procedures. Standardizing how your team approaches migration ensures that the process is well-planned, properly executed, and fully verified every time.

## Prerequisites

- Team agreement on migration plan
- Change management process in place
- Test environment for migration rehearsal

## Migration Runbook

```markdown
## Datastore Migration Runbook: datastore migrate import

### Pre-Migration (Day Before)
- [ ] Notify all stakeholders of maintenance window
- [ ] Verify backup procedures
- [ ] Test migration in staging environment
- [ ] Prepare rollback plan
- [ ] Confirm team availability during migration

### Migration Day
- [ ] Take final backup of all Calico resources
- [ ] Verify source datastore health
- [ ] Execute: calicoctl datastore migrate import
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
- [ ] Step: datastore migrate import - [Status]
- [ ] Validation - [Status]
- [ ] All clear - [Status]

### Impact
- Expected: Brief networking disruption during migration
- Actual: [To be filled during migration]
```

## Standard Migration Script

```bash
#!/bin/bash
# team-migration-datastore-migrate-import.sh

echo "=== Team Migration: datastore migrate import ==="
echo "Operator: $USER"
echo "Date: $(date)"

# Confirm readiness
read -p "Have you completed the pre-migration checklist? (yes/no): " READY
if [ "$READY" != "yes" ]; then
  echo "Complete the checklist first."
  exit 1
fi

# Execute
echo "Executing migration step..."
calicoctl datastore migrate import

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
./team-migration-datastore-migrate-import.sh
```

## Troubleshooting

- **Team member runs migration without checklist**: Require the confirmation prompt in the script.
- **Migration fails during window**: Follow the rollback runbook. Do not improvise.
- **Post-migration issues discovered later**: Diagnostics collected before migration help identify what changed.

## Conclusion

Standardized migration workflows ensure that datastore migrations are safe, predictable operations rather than high-risk adventures. By following runbooks, communicating clearly, and validating at every step, your team completes migrations successfully.
