# Common Mistakes to Avoid with Calico Datastore Export and Import

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Operations

Description: Avoid common mistakes in Calico datastore operations including importing to the wrong cluster, not locking the source during migration, and importing without verifying resource compatibility.

---

## Introduction

Datastore export and import mistakes can cause configuration loss (importing to the wrong cluster overwrites existing policies) or migration failures (not locking the source causes drift between export time and cutover). Both are avoidable with careful pre-operation verification.

## Key Commands

```bash
# Export Calico datastore (backup or migration)
calicoctl datastore migrate export > calico-backup-$(date +%Y%m%d).yaml

# Verify export content
echo "Resources in backup: $(grep -c '^kind:' calico-backup.yaml)"
grep "^kind:" calico-backup.yaml | sort | uniq -c

# Lock source datastore (migration only, not backup)
calicoctl datastore migrate lock

# Import to destination datastore
calicoctl datastore migrate import < calico-backup.yaml

# Verify import
calicoctl get felixconfiguration
calicoctl get globalnetworkpolicy --all-namespaces | wc -l
```

## Operation Flow

```mermaid
flowchart TD
    A[Export: calicoctl datastore migrate export] --> B[Backup YAML file]
    B --> C[Encrypt and store]
    D[Restore needed] --> E[Retrieve backup from storage]
    E --> F[Import: calicoctl datastore migrate import]
    F --> G[Verify resource counts match]
    G --> H{Match?}
    H -->|Yes| I[Restore complete]
    H -->|No| J[Investigate partial import]
```

## Operational Checklist

```markdown
Before export:
[ ] Confirm source datastore connectivity
[ ] Confirm source kubeconfig or etcd credentials
[ ] Verify sufficient disk space for export file
[ ] Note current resource counts for post-export verification

After import:
[ ] Compare resource counts: source vs destination
[ ] Verify Calico components are operational
[ ] Test pod connectivity (cross-namespace, cross-node)
[ ] Verify network policies are being enforced
```

## Conclusion

Calico datastore export and import operations require careful verification at both ends: confirm resource counts before and after, verify connectivity and policy enforcement after import, and store exports encrypted in access-controlled storage. Regular automated exports with monthly restore testing ensure that disaster recovery is not just theoretically possible but practically verified.
