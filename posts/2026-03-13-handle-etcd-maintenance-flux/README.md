# How to Handle etcd Maintenance with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, etcd, Cluster Operations, Database Maintenance

Description: Perform etcd maintenance operations in a Flux-managed cluster including compaction, defragmentation, and backup/restore while maintaining GitOps integrity.

---

## Introduction

etcd is the distributed key-value store that holds the entire state of your Kubernetes cluster, including all Flux-managed resources, their statuses, and the managed field metadata that enables Flux's drift correction. When etcd becomes fragmented, grows too large, or needs maintenance, the performance of the entire cluster degrades - including Flux's ability to reconcile resources efficiently.

etcd maintenance in a Flux-managed cluster requires understanding the interaction between etcd operations and Flux's reconciliation loop. During operations like defragmentation, etcd has brief unavailability windows that Flux's controllers handle with backoff retries. During restore operations, Flux should be suspended to prevent reconciliation from interfering with the restored cluster state.

This guide covers routine etcd maintenance (compaction and defragmentation), backup procedures, and keeping Flux quiet during maintenance windows.

## Prerequisites

- Access to etcd endpoints and certificates
- `etcdctl`, `etcdutl`, and `jq` installed and configured
- Flux CD v2 managing the cluster
- kubectl with cluster-admin access
- Sufficient disk space for etcd snapshots

## Step 1: Check etcd Health and Size

Before performing maintenance, assess the current etcd state.

```bash
# Configure etcd environment

export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key
export ETCD_ENDPOINTS=https://127.0.0.1:2379

# Check etcd cluster health
etcdctl endpoint health --endpoints=$ETCD_ENDPOINTS
# Output: https://127.0.0.1:2379 is healthy

# Check etcd member list
etcdctl member list --endpoints=$ETCD_ENDPOINTS

# Check etcd size (look for DB size)
etcdctl endpoint status --endpoints=$ETCD_ENDPOINTS --write-out=table
# +---------------------------+------------------+---------+------+----+--------+
# |         ENDPOINT          |        ID        | VERSION |  DB SIZE | ... |
# +---------------------------+------------------+---------+------+----+--------+
# | https://127.0.0.1:2379    | d35f9ce9fdcc3523 | 3.5.9   |  2.8 GB  | ... |

# Check alarm status (important: SIZE alarm means etcd is full)
etcdctl alarm list --endpoints=$ETCD_ENDPOINTS
```

## Step 2: Perform etcd Compaction

etcd keeps a history of all changes (revisions). Compacting removes old revisions that are no longer needed, freeing up space.

```bash
# Get the current revision
REVISION=$(etcdctl endpoint status --endpoints=$ETCD_ENDPOINTS \
  --write-out=json | jq -r '.[0].Status.header.revision')
echo "Current revision: $REVISION"

# Compact to the current revision (removes historical data)
etcdctl compact $REVISION --endpoints=$ETCD_ENDPOINTS

# Note: This does not immediately free disk space - defragmentation does that
echo "Compaction complete at revision $REVISION"
```

## Step 3: Suspend Flux Before Defragmentation

Defragmentation briefly blocks reads and writes on the etcd member being defragmented. Suspend Flux to prevent reconciliation failures being logged during this window.

```bash
# Suspend all Flux reconcilers
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend kustomization "$name" -n "$ns"
  done

kubectl get helmreleases --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend helmrelease "$name" -n "$ns"
  done

echo "Flux suspended. Proceeding with defragmentation."
```

## Step 4: Defragment etcd

Defragmentation reclaims the disk space freed by compaction. In a multi-member cluster, defragment followers before the leader.

```bash
# Identify the leader and followers
etcdctl endpoint status --endpoints=$ETCD_ENDPOINTS --write-out=table

# Defragment followers first (replace with actual endpoints)
for endpoint in \
  https://etcd-1.example.com:2379 \
  https://etcd-2.example.com:2379; do

  echo "Defragmenting $endpoint..."
  etcdctl defrag --endpoints=$endpoint

  # Wait for the member to recover
  sleep 30

  # Verify it's healthy before proceeding
  etcdctl endpoint health --endpoints=$endpoint
done

# Defragment the leader last
echo "Defragmenting leader..."
etcdctl defrag --endpoints=https://etcd-leader.example.com:2379

# Verify cluster health after all defragmentations
etcdctl endpoint health \
  --endpoints=https://etcd-1.example.com:2379,https://etcd-2.example.com:2379,https://etcd-leader.example.com:2379

# Check new DB size (should be significantly reduced)
etcdctl endpoint status --write-out=table \
  --endpoints=https://etcd-1.example.com:2379,https://etcd-2.example.com:2379,https://etcd-leader.example.com:2379
```

## Step 5: Take an etcd Backup

Take a backup before starting maintenance and again after it completes.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH=/backup/etcd-snapshot-${BACKUP_DATE}.db
SNAPSHOT_ENDPOINT=https://127.0.0.1:2379

# Take an etcd snapshot from a single endpoint
etcdctl snapshot save $BACKUP_PATH \
  --endpoints=$SNAPSHOT_ENDPOINT

# Verify the snapshot
etcdutl snapshot status $BACKUP_PATH --write-out=table
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | 8b3c4d2a |   452891 |      15234 |   156 MB   |

# Upload to object storage for off-cluster backup
aws s3 cp $BACKUP_PATH s3://acme-cluster-backups/etcd/${BACKUP_DATE}.db

echo "Backup saved: $BACKUP_PATH"
```

## Step 6: Automate etcd Maintenance via Flux

Manage etcd maintenance jobs as Flux-deployed CronJobs.

```yaml
# infrastructure/etcd-maintenance/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-maintenance
  namespace: kube-system
spec:
  schedule: "0 3 * * 0"   # Weekly at 3 AM Sunday
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true   # Access etcd on the host network
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
            - key: node-role.kubernetes.io/control-plane
              effect: NoSchedule
          containers:
            - name: etcd-maintenance
              image: ghcr.io/acme/etcd-maintenance:3.5.12  # Include etcdctl, jq, date, and /bin/sh
              command:
                - /bin/sh
                - -c
                - |
                  # Compact to current revision
                  REVISION=$(etcdctl endpoint status \
                    --endpoints=$ETCD_ENDPOINTS \
                    --write-out=json | jq -r '.[0].Status.header.revision')
                  etcdctl compact $REVISION --endpoints=$ETCD_ENDPOINTS
                  # Defragment
                  etcdctl defrag --endpoints=$ETCD_ENDPOINTS
                  # Take backup
                  etcdctl snapshot save /backup/weekly-$(date +%Y%m%d).db --endpoints=$ETCD_ENDPOINTS
              env:
                - name: ETCDCTL_API
                  value: "3"
                - name: ETCD_ENDPOINTS
                  value: https://127.0.0.1:2379
                - name: ETCDCTL_CACERT
                  value: /etc/kubernetes/pki/etcd/ca.crt
                - name: ETCDCTL_CERT
                  value: /etc/kubernetes/pki/etcd/server.crt
                - name: ETCDCTL_KEY
                  value: /etc/kubernetes/pki/etcd/server.key
              volumeMounts:
                - name: etcd-certs
                  mountPath: /etc/kubernetes/pki/etcd
                  readOnly: true
                - name: backup
                  mountPath: /backup
          volumes:
            - name: etcd-certs
              hostPath:
                path: /etc/kubernetes/pki/etcd
            - name: backup
              hostPath:
                path: /var/lib/etcd-backup
          restartPolicy: OnFailure
```

## Step 7: Resume Flux After Maintenance

```bash
# Resume all reconcilers in dependency order
flux resume kustomization infrastructure -n flux-system
flux reconcile kustomization infrastructure -n flux-system --with-source

# Wait for infrastructure to stabilize
sleep 60

# Resume remaining Kustomizations
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.suspend == true) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume kustomization "$name" -n "$ns"
  done

# Resume HelmReleases
kubectl get helmreleases --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.suspend == true) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume helmrelease "$name" -n "$ns"
  done

# Verify cluster health
flux get all --all-namespaces | grep "False"
echo "etcd maintenance complete. All systems nominal."
```

## Best Practices

- Monitor etcd DB size weekly - set an alert well below your configured quota (for example, 4 GiB only if the quota is 8 GiB; etcd's default storage limit is 2 GiB)
- Schedule compaction and defragmentation monthly if you have high write rates (many reconciliations)
- Always compress and upload etcd snapshots to off-cluster storage immediately after creation
- Test backup restoration in a separate cluster annually to verify your backup is actually recoverable
- Configure etcd's `--auto-compaction-mode` and `--auto-compaction-retention` for automatic compaction
- Never defragment all etcd members simultaneously - always do one at a time starting with followers

## Conclusion

etcd maintenance in a Flux-managed cluster is manageable when you treat it as a first-class operational concern. By suspending Flux before disruptive operations, following the compaction-before-defragmentation sequence, and automating routine maintenance through Flux-managed CronJobs, you keep etcd healthy and Flux's reconciliation fast. The GitOps model even helps here: the maintenance CronJob itself is in Git, version-controlled, and automatically deployed to every cluster you manage.
