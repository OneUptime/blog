# How to Configure Longhorn Orphaned Replica Cleanup - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Orphaned Replicas, Cleanup, Kubernetes, Storage, Disk Space, SUSE Rancher

Description: Learn how to configure Longhorn's automatic orphaned replica cleanup to reclaim disk space consumed by replicas that are no longer associated with any volume.

---

Orphaned replicas are Longhorn replica data directories on nodes that are no longer tracked by the Longhorn system. They can appear when a disk already contains replica directories from another Longhorn cluster or when Longhorn loses track of replica directories after a node or disk outage, and they consume disk space unnecessarily.

---

## What Creates Orphaned Replicas

- A disk added to a Longhorn node already contains replica directories from another Longhorn cluster
- Replica CRs are removed while the node or disk is down
- A volume is accidentally deleted without properly detaching the replica directories

---

## Step 1: Enable Automatic Orphaned Replica Cleanup

Configure Longhorn to automatically detect and clean up orphaned replica directories:

```bash
# Enable automatic cleanup of orphaned replica directories

kubectl patch settings.longhorn.io orphan-resource-auto-deletion \
  -n longhorn-system \
  --type merge \
  -p '{"value":"replica-data"}'
```

---

## Step 2: Manually Identify Orphaned Data

View orphaned replica directories through the Longhorn UI or via kubectl:

```bash
# List detected orphaned replica directories
kubectl get orphans.longhorn.io -n longhorn-system \
  -l 'longhorn.io/orphan-type=replica'

# Get YAML details of a specific orphan resource
kubectl get orphans.longhorn.io <orphan-name> -n longhorn-system -o yaml
```

---

## Step 3: Manually Delete Specific Orphans

```bash
# Delete a specific orphaned replica directory
kubectl delete orphans.longhorn.io <orphan-name> -n longhorn-system

# Delete all detected orphaned replica directories (use with caution!)
kubectl delete orphans.longhorn.io -n longhorn-system \
  -l 'longhorn.io/orphan-type=replica'
```

---

## Step 4: Verify Disk Space Is Reclaimed

After cleanup, confirm disk space was recovered:

```bash
# Check Longhorn disk status before and after
kubectl get nodes.longhorn.io -n longhorn-system \
  -o custom-columns='NAME:.metadata.name,DISK_STATUS:.status.diskStatus'

# On the node directly (replace with your Longhorn disk path if different)
df -h /var/lib/longhorn
```

---

## Step 5: Prevent Orphaned Replica Accumulation

Tune how quickly Longhorn removes detected orphan resources after automatic cleanup is enabled:

```bash
# Set the automatic orphan cleanup grace period in seconds
kubectl patch settings.longhorn.io orphan-resource-auto-deletion-grace-period \
  -n longhorn-system \
  --type merge \
  -p '{"value":"300"}'
```

---

## Step 6: Scheduled Orphan Detection

Set up a CronJob to periodically check for orphans and report them:

```yaml
# orphan-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: longhorn-orphan-report
  namespace: longhorn-system
spec:
  schedule: "0 6 * * 0"   # Every Sunday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: longhorn-service-account
          containers:
            - name: reporter
              image: bitnami/kubectl:latest
              command:
                - sh
                - -c
                - |
                  COUNT=$(kubectl get orphans.longhorn.io -n longhorn-system -l 'longhorn.io/orphan-type=replica' -o name | wc -l)
                  echo "Orphaned Longhorn replica directories detected: $COUNT"
                  if [ "$COUNT" -gt 0 ]; then
                    kubectl get orphans.longhorn.io -n longhorn-system -l 'longhorn.io/orphan-type=replica'
                  fi
          restartPolicy: OnFailure
```

---

## Best Practices

- Enable `orphan-resource-auto-deletion` with `replica-data` included on production clusters to prevent disk space accumulation.
- Review orphans before mass deletion - occasionally an orphan may be a recoverable replica from a volume that still has data you need.
- Review orphan resources after node or disk recovery operations to clear replica directories that Longhorn no longer tracks.
- Monitor disk usage trends - rapidly increasing orphan count can indicate node, disk, or workload lifecycle issues that warrant investigation.
