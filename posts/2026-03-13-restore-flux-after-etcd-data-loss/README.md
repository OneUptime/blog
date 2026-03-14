# How to Restore Flux State After etcd Data Loss

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, etcd, Cluster Recovery

Description: Recover Flux state after catastrophic etcd data loss by combining etcd backup restoration with Flux's Git-based reconciliation.

---

## Introduction

etcd is the heart of Kubernetes — every resource object, configuration, and cluster state is stored there. When etcd data is lost, whether through hardware failure, operator error, or a corrupted snapshot, the entire cluster loses its state. Pods keep running on nodes thanks to the kubelet's local cache, but the API server can no longer serve requests, and the cluster cannot be managed.

Recovering from etcd data loss is a multi-stage process. The first stage is restoring the etcd cluster itself, either from a snapshot or by rebuilding. The second stage, where Flux CD shines, is restoring the cluster's workload state. Because every desired resource is stored in Git, Flux can reconcile the cluster back to its last committed state once the API server is available again.

This guide covers both etcd recovery and Flux-assisted state restoration, giving you a complete runbook for the worst-case scenario.

## Prerequisites

- Access to etcd backup snapshots (stored in S3, GCS, or similar)
- `etcdctl` CLI installed and configured
- `kubectl` access to the cluster API (or ability to restore it)
- Flux bootstrap credentials (Git token or deploy key)
- Sealed Secrets master key backup or ESO credentials

## Step 1: Restore etcd from Snapshot

If you have automated etcd backups (you should), restore the most recent snapshot.

```bash
# Download the latest snapshot from object storage
aws s3 cp s3://my-etcd-backups/snapshot-2026-03-13.db /tmp/snapshot.db

# Restore etcd data directory from snapshot
ETCDCTL_API=3 etcdctl snapshot restore /tmp/snapshot.db \
  --name etcd-0 \
  --initial-cluster etcd-0=https://10.0.0.10:2380 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-advertise-peer-urls https://10.0.0.10:2380 \
  --data-dir /var/lib/etcd-restored

# Move restored data into place
sudo mv /var/lib/etcd /var/lib/etcd-backup-corrupted
sudo mv /var/lib/etcd-restored /var/lib/etcd

# Restart etcd
sudo systemctl restart etcd
```

Verify etcd health after restore:

```bash
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/server.crt \
  --key=/etc/etcd/server.key
```

## Step 2: Verify Kubernetes API Server

Once etcd is restored, the API server should reconnect automatically.

```bash
# Check API server status
kubectl cluster-info

# If API server is not responding, restart it (control plane nodes)
sudo systemctl restart kube-apiserver

# Verify nodes are visible
kubectl get nodes
```

If the etcd snapshot is several hours old, there will be a gap between the snapshot state and the desired state in Git. Flux will fill that gap.

## Step 3: Re-Bootstrap Flux if Necessary

If the etcd snapshot predates the Flux installation, or if Flux's own resources were lost, re-bootstrap.

```bash
# Check if Flux is present
kubectl get namespace flux-system
kubectl get pods -n flux-system

# If flux-system is missing, re-bootstrap
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/production \
  --token-env=GITHUB_TOKEN
```

If Flux controllers are present but their state (GitRepository objects, Kustomization objects) is outdated or missing from the older snapshot, Flux will reconcile and restore them from Git automatically within minutes.

## Step 4: Force Full Reconciliation

After the API server is healthy and Flux is running, trigger a full reconciliation to fast-forward the cluster to the current Git state.

```bash
# Reconcile the root GitRepository source
flux reconcile source git flux-system

# Reconcile all top-level Kustomizations
flux reconcile kustomization flux-system --with-source
flux reconcile kustomization infrastructure --with-source
flux reconcile kustomization apps --with-source

# Monitor progress
flux get all -A --watch
```

Flux will apply any changes committed to Git between the etcd snapshot time and now, bringing the cluster fully up to date.

## Step 5: Restore Secrets

Secrets stored in etcd are encrypted at rest. After snapshot restore, secrets present in the snapshot will be available. However, any secrets created after the snapshot time will be missing.

```bash
# Check for missing secrets
kubectl get secrets -A | grep Opaque

# For Sealed Secrets - restore the master key first
kubectl apply -f backups/sealed-secrets-master-key.yaml -n kube-system

# Force re-sync of SealedSecret objects
kubectl get sealedsecrets -A -o name | \
  xargs -I{} kubectl annotate {} \
  sealedsecrets.bitnami.com/managed=true --overwrite
```

## Step 6: Automate etcd Backups to Prevent Recurrence

```yaml
# CronJob for automated etcd snapshots
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          containers:
            - name: etcd-backup
              image: bitnami/etcd:latest
              command:
                - /bin/sh
                - -c
                - |
                  ETCDCTL_API=3 etcdctl snapshot save /tmp/snapshot.db \
                    --endpoints=https://127.0.0.1:2379 \
                    --cacert=/etc/etcd/ca.crt \
                    --cert=/etc/etcd/healthcheck-client.crt \
                    --key=/etc/etcd/healthcheck-client.key
                  aws s3 cp /tmp/snapshot.db \
                    s3://my-etcd-backups/snapshot-$(date +%Y-%m-%d-%H%M).db
          restartPolicy: OnFailure
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
            - key: node-role.kubernetes.io/control-plane
              effect: NoSchedule
```

## Best Practices

- Take etcd snapshots every 1-6 hours and store them in geographically separate object storage.
- Test etcd snapshot restoration quarterly in a non-production environment.
- Set up Prometheus alerts for etcd size, latency, and leader changes — etcd degradation often precedes data loss.
- Use Flux's Git history as a secondary source of truth — even without an etcd snapshot, a fresh bootstrap can restore all workloads.
- Document the etcd restore procedure and store it outside the cluster (in your runbook wiki, not a ConfigMap).
- Run etcd on dedicated nodes with fast NVMe storage to reduce the risk of I/O-related corruption.

## Conclusion

etcd data loss is the most severe Kubernetes failure scenario, but the combination of etcd snapshot restoration and Flux's Git-based reconciliation provides a robust recovery path. Flux serves as the authoritative source for workload state, filling any gap left by an outdated snapshot and ensuring the cluster converges to the correct desired state regardless of how far back the etcd backup is.
