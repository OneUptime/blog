# How to Handle etcd Out of Space Issues in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Troubleshooting, Storage, Kubernetes

Description: A practical guide to diagnosing and resolving etcd out of space (NOSPACE) issues in Talos Linux Kubernetes clusters.

---

Few things are more alarming than your Kubernetes cluster suddenly refusing all write operations. When etcd runs out of space, it triggers a NOSPACE alarm and enters a maintenance-only mode. No new pods can be created, no ConfigMaps updated, no deployments scaled. Your cluster is effectively frozen. On Talos Linux, dealing with this situation requires working through the Talos API since you cannot log into the nodes directly.

This guide covers how to identify, fix, and prevent etcd out of space issues in Talos Linux.

## Understanding the Space Quota

etcd enforces a storage quota to prevent the database from growing unbounded. When the backend database size reaches the configured quota, etcd sets a NOSPACE alarm and rejects all future write requests (put, delete, and transaction operations). Read operations still work, so you can still query the cluster state, but nothing can change.

The default quota varies by configuration. Upstream etcd defaults to 2GB, but Talos Linux may configure it differently. You can check the current quota:

```bash
# Check the etcd configuration on your Talos node
talosctl -n 192.168.1.10 get etcdmembers

# To see the exact quota, check the etcd process arguments
talosctl -n 192.168.1.10 processes | grep etcd
```

If you are using Prometheus, the metric `etcd_server_quota_backend_bytes` shows the configured quota.

## Recognizing the Symptoms

When etcd hits the space quota, you will see various errors depending on where you look:

```bash
# kubectl commands return errors like:
# Error from server: etcdserver: mvcc: database space exceeded

# The Kubernetes API server logs show:
# "etcdserver: mvcc: database space exceeded"

# etcd logs show the alarm being triggered:
talosctl -n 192.168.1.10 logs etcd | grep -i "space\|quota\|alarm"
# "applying raft message exceeded backend quota"
# "database space exceeded"
```

Confirm the alarm is active:

```bash
# Check for active alarms
talosctl -n 192.168.1.10 etcd alarm list

# Output will show:
# memberID:123456 alarm:NOSPACE
```

## Step-by-Step Recovery

Here is the recovery process. Follow these steps in order:

### Step 1: Check the Current Database Size

```bash
# Get the database size from all control plane members
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status

# Note the DB SIZE and IN USE columns
# DB SIZE: total file size on disk
# IN USE: actual data size
```

### Step 2: Compact Old Revisions

Compaction removes old revision history that is no longer needed. You need to create a pod with etcdctl since Talos does not have CLI tools on the host:

```yaml
# etcd-recovery-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: etcd-recovery
  namespace: kube-system
spec:
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

Note: Since writes are blocked, you may need to deploy this pod before the alarm triggers or use a pre-existing pod. If you cannot create new pods, skip to using talosctl directly.

```bash
# If the pod exists or can be created, get the current revision
kubectl exec -n kube-system etcd-recovery -- etcdctl endpoint status --write-out=json

# Compact to the current revision
kubectl exec -n kube-system etcd-recovery -- etcdctl compact <REVISION>
```

### Step 3: Defragment Each Member

After compaction, defragment to reclaim disk space:

```bash
# Defragment using talosctl (one node at a time)
talosctl -n 192.168.1.10 etcd defrag
talosctl -n 192.168.1.11 etcd defrag
talosctl -n 192.168.1.12 etcd defrag
```

Or using etcdctl from the recovery pod:

```bash
# Defragment the local member
kubectl exec -n kube-system etcd-recovery -- etcdctl defrag

# Defragment all endpoints
kubectl exec -n kube-system etcd-recovery -- etcdctl defrag \
  --endpoints=https://192.168.1.10:2379,https://192.168.1.11:2379,https://192.168.1.12:2379
```

### Step 4: Disarm the Alarm

After freeing up space, you must explicitly disarm the NOSPACE alarm:

```bash
# Disarm the alarm using talosctl
talosctl -n 192.168.1.10 etcd alarm disarm

# Or using etcdctl
kubectl exec -n kube-system etcd-recovery -- etcdctl alarm disarm

# Verify the alarm is cleared
talosctl -n 192.168.1.10 etcd alarm list
# Should return empty (no active alarms)
```

### Step 5: Verify Recovery

```bash
# Check that writes work again
kubectl create configmap test-recovery --from-literal=test=works
kubectl delete configmap test-recovery

# Check the new database size
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status

# Check cluster health
kubectl get nodes
kubectl get pods -A
```

## Increasing the Space Quota

If your cluster legitimately needs more than the default quota, you can increase it in the Talos machine configuration:

```yaml
# controlplane-patch.yaml
cluster:
  etcd:
    extraArgs:
      # Increase quota to 8GB (default might be lower)
      quota-backend-bytes: "8589934592"
```

Apply to all control plane nodes:

```bash
# Apply the configuration update
talosctl apply-config --nodes 192.168.1.10 --patch @controlplane-patch.yaml
talosctl apply-config --nodes 192.168.1.11 --patch @controlplane-patch.yaml
talosctl apply-config --nodes 192.168.1.12 --patch @controlplane-patch.yaml
```

Be cautious about setting the quota too high. etcd is not designed to be a large database. The recommended maximum is 8GB, and even that is generous. If you need more than 8GB, you likely have a workload or configuration problem that should be addressed differently.

## Finding What Is Consuming Space

If your database keeps growing, find out what is taking up the most room:

```bash
# Count keys by resource type
kubectl exec -n kube-system etcd-recovery -- etcdctl get /registry/ --prefix --keys-only | \
  sed 's|/registry/||' | cut -d'/' -f1 | sort | uniq -c | sort -rn | head -20

# Common culprits:
# events - Kubernetes events accumulate rapidly
# pods - High pod churn creates many revisions
# leases - Endpoint and node leases
# secrets - Service account tokens, TLS secrets
```

If events are the biggest consumer, consider reducing the event retention period in the API server configuration:

```yaml
# Talos machine config patch for shorter event TTL
cluster:
  apiServer:
    extraArgs:
      event-ttl: "1h"  # Default is usually much longer
```

## Preventing Future Issues

Set up monitoring and alerting to catch space issues before they become emergencies:

```yaml
# prometheus-alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-space-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd-space
    rules:
    - alert: EtcdSpaceWarning
      expr: etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes > 0.7
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd is using more than 70% of its space quota"

    - alert: EtcdSpaceCritical
      expr: etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes > 0.85
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "etcd is using more than 85% of its space quota - action required"
```

Schedule regular compaction and defragmentation:

```bash
# Add a weekly defragmentation CronJob
# See the "Compact and Defragment etcd" guide for details
```

## Emergency Procedure Checklist

When you get paged for an etcd out of space issue, follow this quick reference:

1. Confirm the NOSPACE alarm: `talosctl -n <CP_IP> etcd alarm list`
2. Check database size: `talosctl -n <CP_IP> etcd status`
3. Compact old revisions (via etcdctl pod or pre-existing tooling)
4. Defragment each member one at a time: `talosctl -n <CP_IP> etcd defrag`
5. Disarm the alarm: `talosctl -n <CP_IP> etcd alarm disarm`
6. Verify writes work: `kubectl create configmap test-recovery --from-literal=test=ok`
7. Clean up: `kubectl delete configmap test-recovery`
8. Investigate root cause and add prevention measures

## Summary

An etcd out of space issue on Talos Linux is serious but recoverable. The key steps are compact, defragment, and disarm the alarm. Once recovered, investigate what caused the growth and put preventive measures in place: monitoring alerts, scheduled maintenance, and possibly adjusting the space quota. With proper monitoring, you should never be surprised by this issue again.
