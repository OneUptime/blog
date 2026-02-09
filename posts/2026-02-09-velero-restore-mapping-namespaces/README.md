# How to Use Velero Restore Mapping to Change Namespaces and Storage Classes During Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Disaster Recovery, Namespace Management

Description: Learn how to use Velero restore mapping to change namespaces and storage classes during recovery, enabling flexible disaster recovery scenarios and cluster migrations across different environments.

---

Restoring Kubernetes resources exactly as they were backed up works well for simple disaster recovery, but real-world scenarios often require modifications during restore. You might need to restore production backups to a testing environment with different namespaces, migrate workloads to a cluster with different storage classes, or restore multiple copies of the same application for testing.

Velero's restore mapping feature solves these challenges by transforming resources during the restore process.

## Understanding Restore Mapping

Restore mapping allows you to modify resource properties as Velero restores them. The most common use cases are:

- Changing namespace names (production to staging)
- Mapping storage classes (gp2 to gp3, or premium to standard)
- Restoring to a different cluster with different infrastructure
- Creating multiple copies of an application for testing

Velero applies these mappings before creating resources in the target cluster, ensuring consistency and avoiding conflicts.

## Basic Namespace Mapping

The simplest mapping changes the namespace during restore:

```bash
# Restore production backup to staging namespace
velero restore create production-to-staging \
  --from-backup production-backup-20260209 \
  --namespace-mappings production:staging
```

This restores all resources from the production namespace into the staging namespace instead. The original namespace in the backup remains unchanged.

## Multiple Namespace Mappings

Map multiple namespaces in a single restore operation:

```bash
# Restore multiple namespaces with mapping
velero restore create multi-ns-restore \
  --from-backup full-cluster-backup \
  --namespace-mappings production:staging,database:database-test,cache:cache-dev
```

This simultaneously maps:
- production to staging
- database to database-test
- cache to cache-dev

Resources from namespaces not in the mapping are restored to their original namespaces.

## Storage Class Mapping

When restoring to a cluster with different storage classes, map the old storage class names to new ones:

```bash
# Map storage classes during restore
velero restore create storage-migration \
  --from-backup production-backup \
  --storage-class-mappings gp2:gp3,standard:premium-rwo
```

This changes any PersistentVolumeClaim using the gp2 storage class to use gp3 instead, and standard to premium-rwo.

## Combined Namespace and Storage Mapping

Combine both types of mapping for complex scenarios:

```bash
# Restore with both namespace and storage class mapping
velero restore create complex-restore \
  --from-backup production-full \
  --namespace-mappings production:staging,monitoring:monitoring-test \
  --storage-class-mappings gp2:gp3,io1:io2
```

This gives you complete control over where and how resources are restored.

## Using ConfigMaps for Complex Mappings

For complex restore scenarios, create a restore configuration file:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: production-to-test-restore
  namespace: velero
spec:
  backupName: production-backup-20260209
  includedNamespaces:
  - production
  - database
  - cache
  namespaceMapping:
    production: test-env-1
    database: test-env-1-db
    cache: test-env-1-cache
  storageClassMapping:
    gp2: gp3
    io1: io2
    premium-ssd: standard-ssd
  restorePVs: true
```

Apply the restore configuration:

```bash
kubectl apply -f restore-config.yaml

# Monitor the restore
velero restore describe production-to-test-restore
velero restore logs production-to-test-restore
```

## Selective Resource Restoration with Mapping

Combine label selectors with mapping for precise control:

```bash
# Restore only specific applications with namespace mapping
velero restore create selective-restore \
  --from-backup full-backup \
  --namespace-mappings production:staging \
  --selector app=web-frontend \
  --include-resources deployments,services,configmaps
```

This restores only the web frontend components from production to staging, ignoring other applications.

## Creating Test Environments from Production Backups

Use restore mapping to spin up complete test environments:

```bash
#!/bin/bash
# create-test-environment.sh

BACKUP_NAME="production-backup-latest"
TEST_ENV_NAME="test-env-$(date +%Y%m%d-%H%M%S)"

# Create test namespace
kubectl create namespace ${TEST_ENV_NAME}

# Restore with mapping
velero restore create ${TEST_ENV_NAME}-restore \
  --from-backup ${BACKUP_NAME} \
  --namespace-mappings production:${TEST_ENV_NAME} \
  --storage-class-mappings gp2:gp3 \
  --wait

# Update ingress hostnames to avoid conflicts
kubectl get ingress -n ${TEST_ENV_NAME} -o json | \
  jq --arg ns "${TEST_ENV_NAME}" \
    '.items[].spec.rules[].host |= ($ns + "-" + .)' | \
  kubectl apply -f -

echo "Test environment created: ${TEST_ENV_NAME}"
```

## Cross-Cluster Migration with Mapping

Migrate workloads between clusters with different configurations:

```yaml
# Source cluster backup
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: cluster-a-migration
  namespace: velero
spec:
  includedNamespaces:
  - applications
  - databases
  storageLocation: migration-bucket
---
# Target cluster restore with mapping
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: cluster-b-migration
  namespace: velero
spec:
  backupName: cluster-a-migration
  namespaceMapping:
    applications: apps
    databases: data
  storageClassMapping:
    aws-gp2: azure-standard
    aws-io1: azure-premium
  excludedResources:
  - nodes
  - events
```

## Handling Service Dependencies During Mapping

When restoring with namespace mapping, update references between services:

```bash
# Restore application
velero restore create app-restore \
  --from-backup production-backup \
  --namespace-mappings production:staging

# Update service references in ConfigMaps
kubectl get configmap -n staging -o yaml | \
  sed 's/production\.svc\.cluster\.local/staging.svc.cluster.local/g' | \
  kubectl apply -f -
```

For more automated handling, use a post-restore hook:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: post-restore-hook
  namespace: velero
  labels:
    velero.io/restore-name: app-restore
data:
  script: |
    #!/bin/bash
    # Update all service references to new namespace
    kubectl get cm,deploy,sts -n staging -o yaml | \
      sed 's/production\.svc/staging.svc/g' | \
      kubectl apply -f -
```

## Validating Restore Mappings

Before restoring to production, validate mappings in a test namespace:

```bash
# Dry-run restore to see what would happen
velero restore create validation-restore \
  --from-backup production-backup \
  --namespace-mappings production:validation-test \
  --storage-class-mappings gp2:gp3

# Check the restored resources
kubectl get all -n validation-test

# Verify storage classes
kubectl get pvc -n validation-test -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.storageClassName}{"\n"}{end}'

# Clean up validation
kubectl delete namespace validation-test
velero restore delete validation-restore
```

## Common Mapping Pitfalls

Avoid these common mistakes:

**Issue**: Services fail because endpoints point to old namespace.
**Solution**: Update service DNS references and environment variables.

**Issue**: Storage class doesn't exist in target cluster.
**Solution**: Verify available storage classes before restore.

```bash
# Check available storage classes
kubectl get storageclass
```

**Issue**: RBAC policies reference old namespaces.
**Solution**: Update RoleBindings and ServiceAccount namespaces.

```bash
# Update role bindings after restore
kubectl get rolebindings -n staging -o yaml | \
  sed 's/namespace: production/namespace: staging/g' | \
  kubectl apply -f -
```

## Monitoring Restore with Mappings

Track restore progress and catch mapping issues:

```bash
# Watch restore status
kubectl get restore -n velero -w

# Check for errors in restore
velero restore describe my-restore --details

# View specific resource restore status
velero restore logs my-restore | grep -i error

# Check if all expected resources were created
kubectl get all -n target-namespace
```

## Automating Restore Mapping Workflows

Create reusable scripts for common mapping scenarios:

```python
#!/usr/bin/env python3
# velero-restore-mapper.py

import subprocess
import json
import sys

def create_restore(backup_name, source_ns, target_ns, storage_mapping):
    """Create a Velero restore with namespace and storage mapping."""

    cmd = [
        "velero", "restore", "create", f"{target_ns}-restore",
        "--from-backup", backup_name,
        "--namespace-mappings", f"{source_ns}:{target_ns}",
    ]

    if storage_mapping:
        mappings = ",".join([f"{k}:{v}" for k, v in storage_mapping.items()])
        cmd.extend(["--storage-class-mappings", mappings])

    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    return result.returncode == 0

if __name__ == "__main__":
    storage_map = {"gp2": "gp3", "io1": "io2"}
    create_restore("production-backup", "production", "staging", storage_map)
```

## Conclusion

Velero restore mapping transforms static backups into flexible recovery tools. By changing namespaces and storage classes during restore, you can test disaster recovery procedures without affecting production, migrate workloads between different cluster configurations, and create temporary environments for debugging.

Master namespace and storage class mapping to unlock Velero's full potential. Start with simple single-namespace mappings, then build up to complex multi-namespace, multi-storage-class scenarios as your confidence grows.

Remember to always validate mappings in test environments before applying them to production restores, and document your mapping strategies for your disaster recovery runbooks.
