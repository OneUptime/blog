# How to Configure Dapr Scheduler Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Persistence, Storage, Kubernetes

Description: Configure persistent storage for the Dapr Scheduler service so scheduled jobs survive pod restarts and cluster upgrades without data loss.

---

## Why Scheduler Persistence Matters

The Dapr Scheduler service uses an embedded etcd cluster to persist job metadata. Without persistent storage, all scheduled jobs are lost when the Scheduler pod restarts. Configuring a PersistentVolume ensures your scheduled jobs survive pod restarts, node failures, and version upgrades.

## Configuring Persistent Volume Claims

The Scheduler StatefulSet requires a PVC for each replica. Configure this in your Helm values:

```yaml
dapr_scheduler:
  cluster:
    storageClassName: "standard"
    storageSize: "16Gi"
  etcdSpaceQuota: "16Gi"
```

Apply via Helm:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_scheduler.cluster.storageClassName=standard \
  --set dapr_scheduler.cluster.storageSize=16Gi \
  --set dapr_scheduler.etcdSpaceQuota=16Gi \
  --reuse-values
```

## Verifying PVC Creation

```bash
kubectl get pvc -n dapr-system | grep scheduler

# Expected output:
# dapr-scheduler-data-dir-dapr-scheduler-server-0   Bound    pvc-abc   16Gi   RWO   standard   2m
# dapr-scheduler-data-dir-dapr-scheduler-server-1   Bound    pvc-def   16Gi   RWO   standard   2m
# dapr-scheduler-data-dir-dapr-scheduler-server-2   Bound    pvc-ghi   16Gi   RWO   standard   2m
```

## Checking Data Directory

The Scheduler stores etcd data in the configured directory. Inspect it:

```bash
kubectl exec -it dapr-scheduler-server-0 -n dapr-system -- ls /var/run/data/dapr-scheduler/
```

## Testing Persistence After Restart

Schedule a test job, restart the Scheduler, and verify the job persists:

```bash
# Schedule a job
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/persistence-test \
  -H "Content-Type: application/json" \
  -d '{"schedule": "@every 1h", "data": "{\"value\": \"test\"}"}'

# Restart scheduler
kubectl rollout restart statefulset/dapr-scheduler-server -n dapr-system
kubectl rollout status statefulset/dapr-scheduler-server -n dapr-system

# Verify job still exists
curl http://localhost:3500/v1.0-alpha1/jobs/persistence-test
```

## Storage Class Recommendations

For production environments, use a storage class with:
- `reclaimPolicy: Retain` to prevent accidental data deletion
- SSD-backed storage for low-latency etcd writes
- Zone-redundant storage for multi-AZ clusters

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: scheduler-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Summary

Persistent storage for the Dapr Scheduler ensures scheduled jobs survive restarts and upgrades. Configure PVCs via Helm using the `dapr_scheduler.cluster` values with an appropriate storage class, verify PVCs are bound, and test persistence by scheduling a job and restarting the Scheduler StatefulSet. Use Retain reclaim policies in production to prevent accidental data loss.
