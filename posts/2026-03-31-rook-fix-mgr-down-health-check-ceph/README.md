# How to Fix MGR_DOWN Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Manager, Health Check, Daemon

Description: Learn how to diagnose and fix the MGR_DOWN health warning in Ceph when the active manager daemon becomes unavailable, disrupting monitoring and orchestration.

---

## Understanding MGR_DOWN

The Ceph Manager (MGR) daemon provides cluster statistics, orchestration, and hosts modules like the Prometheus exporter, dashboard, and balancer. The `MGR_DOWN` health check fires when no active MGR is running. While the cluster can continue I/O without an active MGR, monitoring, metrics collection, and orchestration will stop working.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN mgr is down
[WRN] MGR_DOWN: no active mgr
```

Check MGR status:

```bash
ceph mgr stat
```

## Diagnosing the Issue in Rook

Check MGR pod status:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mgr
```

If the pod is in `CrashLoopBackOff`, check logs:

```bash
kubectl -n rook-ceph logs <mgr-pod> --previous
```

Common causes:
- Port conflict on the MGR host
- Module crash causing restart loop
- Insufficient memory (OOM kill)
- ConfigMap or secret misconfiguration

## Restarting the MGR Pod

Often the fastest fix is to delete and allow Kubernetes to recreate the pod:

```bash
kubectl -n rook-ceph delete pod -l app=rook-ceph-mgr
```

Watch it come back:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mgr -w
```

## Disabling a Faulty Module

If the MGR is crash-looping due to a module error, disable the problematic module:

```bash
# Identify which module is failing from logs
kubectl -n rook-ceph logs <mgr-pod> --previous | grep -i error

# Disable the module
ceph mgr module disable <module-name>
```

Common faulty modules:

```bash
ceph mgr module disable dashboard
ceph mgr module disable pg_autoscaler
ceph mgr module disable telemetry
```

After disabling, the MGR should stabilize.

## Increasing MGR Resources in Rook

If the MGR is being OOM killed, increase its memory limit:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Add resource limits for the `mgr` daemon under `spec.resources`:

```yaml
spec:
  resources:
    mgr:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "2000m"
```

## Adding a Standby MGR

Run two MGR instances so a standby is always available to take over:

```yaml
spec:
  mgr:
    count: 2
```

Apply the change:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type=merge \
  -p '{"spec":{"mgr":{"count":2}}}'
```

## Bare Metal Fix

On bare metal, restart the MGR service:

```bash
systemctl restart ceph-mgr@$(hostname)
journalctl -u ceph-mgr@$(hostname) -n 50
```

If the MGR on a host cannot start, failover to a standby:

```bash
ceph mgr fail $(ceph mgr stat | jq -r .active_name)
```

## Verifying Recovery

After the MGR comes back online:

```bash
ceph mgr stat
ceph health detail
```

The output should show an active MGR and `HEALTH_OK`.

## Summary

`MGR_DOWN` means no active Ceph Manager is running. In Rook, restart the MGR pod and check for crash-looping caused by module errors or OOM kills. Disable faulty modules and increase memory limits as needed. Run two MGR instances (`count: 2`) for automatic failover. On bare metal, use `ceph mgr fail` to trigger failover to a standby instance.
