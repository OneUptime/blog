# How to Restore Specific Kubernetes Namespaces from Velero Backup Archives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, Restore, Namespaces

Description: Master selective namespace restoration with Velero for targeted recovery operations in Kubernetes. Learn filtering techniques, namespace mapping, and resource selection strategies.

---

Selective namespace restoration allows you to recover specific applications or environments from comprehensive backup archives without restoring your entire cluster. This capability is essential for disaster recovery scenarios, development environment replication, and troubleshooting production issues. Velero provides powerful filtering and mapping features that give you precise control over what gets restored and where it lands in your cluster.

## Understanding Velero Restore Architecture

Velero restore operations read backup archives and recreate Kubernetes resources in your cluster. Unlike database restores that overwrite existing data, Velero creates new resources, leaving existing ones untouched unless specifically configured otherwise. This design prevents accidental overwrites while enabling flexible restore scenarios like namespace duplication and cross-cluster migration.

When you restore from a backup containing multiple namespaces, Velero processes each namespace independently, applying your specified filters and transformations. This architecture enables surgical recovery operations that target specific applications without affecting other cluster workloads.

## Listing Namespaces in a Backup

Before restoring, identify which namespaces are included in a backup:

```bash
# Get detailed backup information
velero backup describe my-backup --details

# Extract namespace list
velero backup describe my-backup --details | grep "Namespace:" | sort -u
```

You can also query backup contents more precisely:

```bash
# Download backup contents for inspection
velero backup download my-backup

# Extract and examine the backup tarball
tar -tzf my-backup/my-backup.tar.gz | grep "namespaces/" | cut -d'/' -f2 | sort -u
```

This shows exactly which namespaces are available for restoration.

## Restoring a Single Namespace

Restore one namespace from a multi-namespace backup:

```bash
# Restore only the production namespace
velero restore create prod-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --wait
```

Verify the restore completed successfully:

```bash
# Check restore status
velero restore describe prod-restore

# Verify namespace and resources were created
kubectl get all -n production
```

This command recreates all resources from the production namespace while leaving other namespaces untouched.

## Restoring Multiple Specific Namespaces

Select multiple namespaces for restoration:

```bash
# Restore production and staging namespaces
velero restore create multi-namespace-restore \
  --from-backup my-backup \
  --include-namespaces production,staging \
  --wait
```

You can also exclude specific namespaces from a broader restore:

```bash
# Restore all namespaces except system namespaces
velero restore create selective-restore \
  --from-backup my-backup \
  --exclude-namespaces kube-system,kube-public,velero \
  --wait
```

This approach is useful when you want most namespaces but need to exclude a few.

## Mapping Namespaces During Restore

Restore a namespace under a different name:

```bash
# Restore production namespace as production-restore
velero restore create mapped-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --namespace-mappings production:production-restore \
  --wait
```

This creates a new namespace called `production-restore` containing all resources from the original production namespace. This technique is valuable for:

- Creating test environments from production backups
- Running parallel versions of applications
- Disaster recovery testing without affecting production

## Restoring to a Different Cluster

Move namespaces between clusters using backup and restore:

```bash
# On source cluster: create backup
velero backup create migration-backup \
  --include-namespaces app-namespace \
  --wait

# Wait for backup to sync to storage

# On target cluster: restore the namespace
velero restore create migration-restore \
  --from-backup migration-backup \
  --include-namespaces app-namespace \
  --wait
```

Both clusters must have access to the same backup storage location for this to work.

## Filtering Resources Within Namespaces

Restore specific resource types from a namespace:

```bash
# Restore only ConfigMaps and Secrets from production
velero restore create config-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --include-resources configmaps,secrets \
  --wait
```

Exclude certain resource types:

```bash
# Restore everything except Pods and ReplicaSets
velero restore create no-pods-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --exclude-resources pods,replicasets \
  --wait
```

This granular control helps when you need specific configurations without running workloads.

## Using Label Selectors for Targeted Restore

Restore only resources matching specific labels:

```bash
# Restore resources labeled with app=frontend
velero restore create frontend-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --selector app=frontend \
  --wait
```

Combine namespace and label filtering:

```bash
# Restore critical services from multiple namespaces
velero restore create critical-restore \
  --from-backup my-backup \
  --include-namespaces production,staging \
  --selector tier=critical \
  --wait
```

Label selectors enable application-centric restore operations independent of namespace boundaries.

## Creating a Declarative Restore Resource

Define restore operations as Kubernetes resources:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: declarative-namespace-restore
  namespace: velero
spec:
  backupName: my-backup
  includedNamespaces:
  - production
  - staging
  excludedResources:
  - nodes
  - events
  - backups.velero.io
  - restores.velero.io
  namespaceMapping:
    production: production-test
    staging: staging-test
  restorePVs: true
  preserveNodePorts: false
```

Apply this resource to trigger the restore:

```bash
kubectl apply -f restore.yaml

# Monitor restore progress
kubectl get restore declarative-namespace-restore -n velero -w
```

Declarative restores enable GitOps workflows and automated disaster recovery.

## Handling Persistent Volume Restoration

Restore namespaces with persistent volumes:

```bash
# Restore with PV restoration enabled
velero restore create pv-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --restore-volumes=true \
  --wait

# Check PVC status
kubectl get pvc -n production
```

Map PVCs to different storage classes during restore:

```bash
# Restore with storage class mapping
velero restore create storage-mapped-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --storage-class-mappings old-storage:new-storage \
  --wait
```

This is useful when restoring to clusters with different storage infrastructure.

## Preserving or Changing NodePorts

Control how NodePort services are restored:

```bash
# Preserve original NodePorts
velero restore create nodeport-preserve \
  --from-backup my-backup \
  --include-namespaces production \
  --preserve-nodeports=true \
  --wait

# Assign new NodePorts
velero restore create nodeport-new \
  --from-backup my-backup \
  --include-namespaces production \
  --preserve-nodeports=false \
  --wait
```

Setting `preserve-nodeports=false` lets Kubernetes assign new ports, avoiding conflicts in the target cluster.

## Verifying Namespace Restoration

Comprehensively verify restored resources:

```bash
# Get restore details
velero restore describe namespace-restore --details

# Check for warnings or errors
velero restore logs namespace-restore | grep -i error

# Compare resource counts
echo "Original backup:"
velero backup describe my-backup | grep "Total items to be backed up"

echo "Restored resources:"
kubectl get all -n production --no-headers | wc -l
```

Verify specific application components:

```bash
# Check deployments
kubectl get deployments -n production

# Check services
kubectl get services -n production

# Check configmaps and secrets
kubectl get configmaps,secrets -n production

# Test application connectivity
kubectl run test-pod -n production --image=curlimages/curl --rm -it -- \
  curl http://my-service.production.svc.cluster.local
```

## Automating Namespace Restore Testing

Create a script to validate restore operations:

```bash
#!/bin/bash

BACKUP_NAME=$1
NAMESPACE=$2
TEST_NAMESPACE="${NAMESPACE}-test"

echo "Testing restore of ${NAMESPACE} from ${BACKUP_NAME}"

# Create test restore
velero restore create test-restore-$(date +%s) \
  --from-backup ${BACKUP_NAME} \
  --include-namespaces ${NAMESPACE} \
  --namespace-mappings ${NAMESPACE}:${TEST_NAMESPACE} \
  --wait

# Verify resources were created
RESOURCE_COUNT=$(kubectl get all -n ${TEST_NAMESPACE} --no-headers 2>/dev/null | wc -l)

if [ ${RESOURCE_COUNT} -gt 0 ]; then
  echo "Restore test successful: ${RESOURCE_COUNT} resources created"

  # Cleanup test namespace
  kubectl delete namespace ${TEST_NAMESPACE}
  exit 0
else
  echo "Restore test failed: no resources created"
  exit 1
fi
```

Run this script regularly to validate backup integrity:

```bash
chmod +x test-restore.sh
./test-restore.sh my-backup production
```

## Handling Resource Dependencies

Some resources depend on others for proper restoration. Configure restore order:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: ordered-restore
  namespace: velero
spec:
  backupName: my-backup
  includedNamespaces:
  - production
  restorePVs: true
  # Restore resources in specific order
  hooks:
    resources:
    - name: wait-for-pvcs
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          app: database
      post:
      - exec:
          container: db
          command:
          - /bin/bash
          - -c
          - |
            echo "Waiting for PVC to be bound..."
            while [ $(kubectl get pvc -n production -l app=database -o jsonpath='{.items[0].status.phase}') != "Bound" ]; do
              sleep 5
            done
            echo "PVC bound, starting database initialization"
          onError: Fail
          timeout: 5m
```

This ensures dependent resources are ready before proceeding.

## Monitoring Restore Operations

Track restore progress in real-time:

```bash
# Watch restore status
kubectl get restore -n velero -w

# Stream restore logs
velero restore logs namespace-restore --follow

# Check Velero pod logs
kubectl logs -n velero -l name=velero --follow | grep -i restore
```

Set up alerts for restore failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-restore-alerts
  namespace: velero
spec:
  groups:
  - name: velero-restore
    interval: 30s
    rules:
    - alert: VeleroRestoreFailed
      expr: |
        velero_restore_failure_total > 0
      labels:
        severity: warning
      annotations:
        summary: "Velero restore operation failed"
        description: "Restore operation has failed"
```

## Troubleshooting Namespace Restore Issues

Common problems and solutions:

**Namespace already exists:**

```bash
# Error: namespace already exists
# Solution: Use namespace mapping to restore to different name
velero restore create mapped-restore \
  --from-backup my-backup \
  --include-namespaces production \
  --namespace-mappings production:production-new
```

**Resource conflicts:**

```bash
# Error: resource already exists
# Solution: Delete existing resources or restore with different names
kubectl delete namespace production
velero restore create clean-restore \
  --from-backup my-backup \
  --include-namespaces production
```

**Volume restoration failures:**

```bash
# Check PVC events
kubectl describe pvc -n production

# Verify volume snapshots exist
kubectl get volumesnapshots -A

# Check storage class availability
kubectl get storageclass
```

## Conclusion

Selective namespace restoration with Velero provides flexible recovery options for Kubernetes environments. Use namespace filtering to restore specific applications, apply label selectors for fine-grained resource control, and leverage namespace mapping for testing and migration scenarios. Regular restore testing validates your backup strategy while automated scripts ensure consistent recovery procedures. Understanding these techniques enables confident disaster recovery operations that minimize downtime and protect your critical workloads.
