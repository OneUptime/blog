# How to Compact and Defragment etcd in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Database Maintenance, Kubernetes, Compaction

Description: Step-by-step guide to compacting and defragmenting etcd in Talos Linux to keep your cluster database lean and performant.

---

etcd keeps a history of every change made to the cluster state. Over time, this history grows and the database gets larger, which slows down reads, increases snapshot times, and eventually hits the storage quota. Compaction removes old revisions that are no longer needed, and defragmentation reclaims the freed disk space. On Talos Linux, these operations are performed through talosctl and Kubernetes tooling since you cannot directly access the nodes.

## Why Compaction and Defragmentation Matter

Every time you create a pod, update a ConfigMap, or change a service, etcd stores that change as a new revision. etcd also keeps the previous revisions around so that watchers can replay changes from a specific point. Over days and weeks, these historical revisions add up.

Consider a cluster where you deploy and redeploy applications frequently. Each deployment creates dozens of etcd revisions for the deployment object, ReplicaSet, pods, endpoints, and events. Without compaction, your etcd database might grow from a few hundred megabytes to several gigabytes.

Compaction tells etcd to discard all revisions older than a specific revision number. After compaction, the space is marked as free internally, but the on-disk file size does not shrink. That is where defragmentation comes in. Defragmentation rewrites the database file to actually reclaim the freed space.

## Checking Current Database Size

Before running maintenance, check the current state of your etcd database:

```bash
# Check etcd status on all control plane nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status

# The output shows:
# - Member ID
# - DB Size (total on-disk size)
# - DB In Use (actual data size, after internal free space)
# - Leader
# - Raft Index
# - Raft Term
```

If "DB Size" is significantly larger than "DB In Use", defragmentation will reclaim that difference.

## Automatic Compaction in Talos Linux

Talos Linux configures etcd with automatic compaction by default. The Kubernetes API server passes the `--etcd-compaction-interval` flag, which triggers compaction periodically. However, automatic compaction does not include defragmentation. You still need to defragment manually or on a schedule.

Check if compaction is happening by looking at the etcd logs:

```bash
# Look for compaction entries in etcd logs
talosctl -n 192.168.1.10 logs etcd | grep -i "compact"
```

You should see periodic messages about compaction completing at specific revisions.

## Manual Compaction

If automatic compaction is not keeping up, or if you need to compact to a specific revision, you can do it manually. You will need to use etcdctl, which you can run from a pod since Talos does not include CLI tools on the host.

First, create a pod with etcdctl:

```yaml
# etcd-maintenance-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: etcd-maintenance
  namespace: kube-system
spec:
  # Schedule on a control plane node
  nodeSelector:
    node-role.kubernetes.io/control-plane: ""
  tolerations:
  - key: node-role.kubernetes.io/control-plane
    effect: NoSchedule
  hostNetwork: true
  containers:
  - name: etcdctl
    image: gcr.io/etcd-development/etcd:v3.5.12
    command: ["sleep", "3600"]
    env:
    - name: ETCDCTL_API
      value: "3"
    - name: ETCDCTL_ENDPOINTS
      value: "https://127.0.0.1:2379"
    - name: ETCDCTL_CACERT
      value: "/etc/kubernetes/pki/etcd/ca.crt"
    - name: ETCDCTL_CERT
      value: "/etc/kubernetes/pki/etcd/peer.crt"
    - name: ETCDCTL_KEY
      value: "/etc/kubernetes/pki/etcd/peer.key"
    volumeMounts:
    - name: etcd-certs
      mountPath: /etc/kubernetes/pki/etcd
      readOnly: true
  volumes:
  - name: etcd-certs
    hostPath:
      path: /system/secrets/etcd
      type: Directory
```

```bash
# Deploy the maintenance pod
kubectl apply -f etcd-maintenance-pod.yaml

# Wait for it to be ready
kubectl wait --for=condition=Ready pod/etcd-maintenance -n kube-system

# Get the current revision number
kubectl exec -it etcd-maintenance -n kube-system -- etcdctl endpoint status --write-out=table

# Compact to the current revision (replace REVISION with actual number)
kubectl exec -it etcd-maintenance -n kube-system -- etcdctl compact REVISION

# You should see: "compacted revision XXXXX"
```

## Running Defragmentation

After compaction, defragment each etcd member. Defragmentation should be done one member at a time because it blocks the member during the operation.

Using talosctl (the recommended way for Talos Linux):

```bash
# Defragment one control plane node at a time
talosctl -n 192.168.1.10 etcd defrag
# Wait for completion, then move to the next node
talosctl -n 192.168.1.11 etcd defrag
# Then the last one
talosctl -n 192.168.1.12 etcd defrag
```

Alternatively, using the etcdctl maintenance pod:

```bash
# Defragment the local member
kubectl exec -it etcd-maintenance -n kube-system -- etcdctl defrag

# Defragment a specific endpoint
kubectl exec -it etcd-maintenance -n kube-system -- etcdctl defrag \
  --endpoints=https://192.168.1.11:2379
```

After defragmentation, verify the database size decreased:

```bash
# Check the new database size
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status
```

You should see "DB Size" and "DB In Use" much closer together now.

## Automating Maintenance with a CronJob

For ongoing maintenance, set up a Kubernetes CronJob that compacts and defragments etcd on a schedule:

```yaml
# etcd-maintenance-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-defrag
  namespace: kube-system
spec:
  # Run every Sunday at 3 AM
  schedule: "0 3 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
          - key: node-role.kubernetes.io/control-plane
            effect: NoSchedule
          hostNetwork: true
          containers:
          - name: etcd-defrag
            image: gcr.io/etcd-development/etcd:v3.5.12
            command:
            - /bin/sh
            - -c
            - |
              # Set connection parameters
              export ETCDCTL_API=3
              export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
              export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/peer.crt
              export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/peer.key

              # Get all endpoints
              ENDPOINTS="https://127.0.0.1:2379"

              # Get current revision and compact
              REV=$(etcdctl --endpoints=$ENDPOINTS endpoint status --write-out=json | \
                python3 -c "import sys,json; print(json.load(sys.stdin)[0]['Status']['header']['revision'])")

              echo "Compacting to revision $REV"
              etcdctl --endpoints=$ENDPOINTS compact $REV

              echo "Starting defragmentation"
              etcdctl --endpoints=$ENDPOINTS defrag

              echo "Defragmentation complete"
              etcdctl --endpoints=$ENDPOINTS endpoint status --write-out=table
            volumeMounts:
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
          volumes:
          - name: etcd-certs
            hostPath:
              path: /system/secrets/etcd
              type: Directory
          restartPolicy: OnFailure
```

```bash
# Apply the CronJob
kubectl apply -f etcd-maintenance-cronjob.yaml

# Verify it was created
kubectl get cronjobs -n kube-system
```

## Best Practices

Run defragmentation during low-traffic periods. While defragmentation is running on a member, that member blocks all reads and writes. In a 3-member cluster, the other members handle traffic, but it is still best to avoid peak times.

Always defragment one member at a time. Never defragment all members simultaneously, as this could make the entire cluster unavailable.

Monitor the database size regularly. Set up Prometheus alerts when the database size exceeds a threshold, such as 4GB or 6GB. The default space quota in many configurations is 8GB, and hitting it will put etcd into read-only mode.

Take a backup before running manual compaction on a production cluster. While compaction is generally safe, having a snapshot gives you a safety net:

```bash
# Take a snapshot before maintenance
talosctl -n 192.168.1.10 etcd snapshot /backup/pre-maintenance.snapshot
```

## Summary

Compaction and defragmentation are essential maintenance tasks for etcd in Talos Linux. Compaction removes old revisions, defragmentation reclaims disk space, and together they keep your cluster database lean and fast. Use talosctl for direct defragmentation commands, set up automated CronJobs for ongoing maintenance, and always monitor your database size to catch growth before it becomes a problem.
