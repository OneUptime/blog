# How to Configure Auto-Recovery for Failed Ceph Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Auto-Recovery, High Availability, OSD, Operator

Description: Configure automatic recovery for failed Ceph OSDs, monitors, and other components in Rook to minimize manual intervention and reduce downtime.

---

Rook's operator handles many recovery tasks automatically, but you can tune recovery behavior to match your SLA requirements. This guide covers auto-recovery settings for OSDs, monitors, and the overall cluster.

## Enable OSD Auto-Recovery

Configure health checks in the CephCluster spec to control how often the operator verifies daemon health:

```yaml
spec:
  healthCheck:
    daemonHealth:
      mon:
        disabled: false
        interval: 45s
      osd:
        disabled: false
        interval: 60s
      status:
        disabled: false
        interval: 60s
    livenessProbe:
      mon:
        probe:
          initialDelaySeconds: 10
          periodSeconds: 30
          failureThreshold: 3
      osd:
        probe:
          initialDelaySeconds: 10
          periodSeconds: 30
          failureThreshold: 3
```

## Configure Kubernetes Restart Policies

Rook OSD pods use `restartPolicy: Always` by default. Verify this is in place:

```bash
kubectl -n rook-ceph get pod rook-ceph-osd-0-<hash> -o jsonpath='{.spec.restartPolicy}'
```

Set resource limits so the scheduler can place replacement pods quickly:

```yaml
spec:
  resources:
    osd:
      limits:
        cpu: "2"
        memory: "4Gi"
      requests:
        cpu: "500m"
        memory: "2Gi"
```

## Auto-Remove Failed OSDs

Enable automatic OSD removal when an OSD is marked `out` and its data has been safely rebalanced:

```yaml
spec:
  removeOSDsIfOutAndSafeToRemove: true
```

For OSDs on permanently failed nodes, purge the OSD and delete its deployment:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-osd-2 --replicas=0
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd purge 2 --yes-i-really-mean-it
kubectl -n rook-ceph delete deploy rook-ceph-osd-2
```

## Configure Auto-Rebalancing Delays

Prevent excessive rebalancing during transient failures:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_osd_down_out_interval 300

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_delay_start 0
```

## Monitor Auto-Recovery Progress

Watch recovery operations in real time:

```bash
watch -n 5 "kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph -s | grep -E 'health|recovery|rebalance'"
```

## Summary

Rook automates most Ceph component recovery through Kubernetes restart policies and operator reconciliation loops. Tuning health check intervals, setting appropriate resource requests, and configuring `mon_osd_down_out_interval` ensures rapid but controlled recovery without excessive rebalancing during transient failures.
