# Troubleshooting Errors in calicoctl datastore migrate lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Troubleshooting, Kubernetes

Description: Diagnose and resolve errors encountered during Calico datastore migration with calicoctl datastore migrate lock.

---

## Introduction

Datastore migration errors can be particularly stressful because they occur during a critical maintenance window. Understanding common failure modes and their solutions beforehand helps you resolve issues quickly and complete the migration successfully.

## Prerequisites

- Active migration attempt with errors
- Access to both source and target datastores
- `calicoctl` installed
- Backup of Calico resources

## Common Errors

### Error: Connection Refused to Source Datastore

```bash
# For etcd source
echo $ETCD_ENDPOINTS
curl --cacert /etc/calico/certs/ca.pem \
     --cert /etc/calico/certs/cert.pem \
     --key /etc/calico/certs/key.pem \
     $ETCD_ENDPOINTS/health

# For Kubernetes source
export DATASTORE_TYPE=kubernetes
kubectl cluster-info
```

### Error: Permission Denied

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calicoctl-migration
rules:
- apiGroups: ["crd.projectcalico.org"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: [""]
  resources: ["nodes", "pods", "namespaces"]
  verbs: ["get", "list"]
```

### Error: Resource Already Exists

```bash
# During import, resources may already exist in the target
# Use --allow-version-mismatch if version differs
calicoctl datastore migrate lock --allow-version-mismatch 2>&1

# Or clean the target datastore first (DANGEROUS - only if target is empty/new)
```

### Error: Data Format Mismatch

```bash
# The export file may be from a different Calico version
# Check the version in the export
head -20 calico-export.yaml

# Ensure calicoctl version matches the data version
calicoctl version
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-migration.sh

echo "=== Migration Diagnostics ==="

echo "--- calicoctl version ---"
calicoctl version

echo "--- Source datastore ---"
echo "DATASTORE_TYPE=$DATASTORE_TYPE"
calicoctl get nodes 2>&1 | head -5

echo "--- Target connectivity ---"
kubectl cluster-info 2>&1 | head -3

echo "--- Resource counts ---"
for r in nodes ippools globalnetworkpolicies bgpconfigurations; do
  COUNT=$(calicoctl get "$r" 2>/dev/null | tail -n +2 | wc -l)
  echo "  $r: $COUNT"
done
```

## Verification

After resolving errors:

```bash
# Retry the migration command
calicoctl datastore migrate lock

# Verify resources
calicoctl get nodes
calicoctl get ippools
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| Connection refused | Wrong datastore endpoint | Check ETCD_ENDPOINTS or kubeconfig |
| Permission denied | Missing RBAC | Apply migration ClusterRole |
| Resource exists | Target not clean | Clear target or use --allow-version-mismatch |
| Format mismatch | Version incompatibility | Align calicoctl version |

## Conclusion

Migration errors are best handled by verifying connectivity and permissions before starting, maintaining backups throughout, and having rollback procedures ready. Most errors are resolved by fixing the datastore connection configuration.
