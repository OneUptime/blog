# How to Monitor Ceph Log Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Logging, Monitoring, Diagnostic

Description: Monitor Ceph cluster and daemon log messages using the ceph log command, admin sockets, and Kubernetes log access to troubleshoot issues in Rook-Ceph.

---

Ceph generates logs at multiple levels: a central cluster log accessible via the `ceph log` command, and per-daemon logs accessible through pod logs or admin sockets. Understanding where to look for relevant messages speeds up troubleshooting.

## Cluster Log via ceph log

The cluster log records significant events across all Ceph services:

```bash
# Get last 50 log entries
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph log last 50
```

Filter by channel (audit, cluster, or channel name):

```bash
# Cluster channel (health events, OSD changes)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph log last 100 cluster

# Audit channel (admin command history)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph log last 100 audit
```

## Filter by Severity

```bash
# Warnings and errors only
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph log last 200 | grep -E "\[WRN\]|\[ERR\]"
```

## Per-Daemon Logs via kubectl

Each Ceph daemon runs as a pod in the `rook-ceph` namespace:

```bash
# List all Ceph pods
kubectl get pods -n rook-ceph

# OSD logs
kubectl logs -n rook-ceph $(kubectl get pod -n rook-ceph -l ceph_daemon_type=osd,ceph_daemon_id=0 -o name) -c osd

# Monitor logs
kubectl logs -n rook-ceph $(kubectl get pod -n rook-ceph -l ceph_daemon_type=mon -o name | head -1) -c mon

# Manager logs
kubectl logs -n rook-ceph $(kubectl get pod -n rook-ceph -l ceph_daemon_type=mgr -o name | head -1) -c mgr
```

## Stream OSD Logs in Real Time

```bash
kubectl logs -n rook-ceph -f \
  $(kubectl get pod -n rook-ceph -l ceph_daemon_type=osd,ceph_daemon_id=0 -o name) \
  -c osd
```

## Increase Log Verbosity for Debugging

```bash
# Set log level for a specific daemon subsystem
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Increase OSD log level (0-20, higher = more verbose)
  ceph tell osd.0 config set debug_osd 10
  ceph tell osd.0 config set debug_bluestore 10

  # Increase monitor log level
  ceph tell mon.a config set debug_mon 10
"
```

Reset to default after debugging:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell osd.0 config set debug_osd 1
```

## Configure Persistent Log Levels via Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    debug_ms = 0
    debug_osd = 0
    debug_mon = 1
    log_to_stderr = true
    log_to_file = false
```

## Forward Logs to External Systems

Rook pods write to stdout, so any log aggregation tool that collects Kubernetes pod logs (Fluentd, Loki, Datadog) will capture Ceph daemon logs automatically.

Example Loki query to find Ceph errors:

```text
{namespace="rook-ceph"} |= "ERR" | logfmt
```

## Summary

Ceph logs are accessible through `ceph log last` for cluster-level events, `kubectl logs` for per-daemon output, and admin sockets for runtime verbosity changes. Use the audit channel to track configuration changes, the cluster channel for health events, and increase `debug_osd` or `debug_mon` temporarily when investigating specific issues.
