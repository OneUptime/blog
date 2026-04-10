# How to Configure Ceph Logging and Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Logging, Debugging, Observability

Description: Learn how to configure Ceph logging and debugging levels to troubleshoot cluster issues while minimizing performance overhead.

---

## Ceph Logging Architecture

Ceph daemons write logs to files on each node, and optionally to the system journal. Log verbosity is controlled per-subsystem. Each subsystem has two log levels: the in-memory log level and the on-disk log level. The in-memory buffer is flushed to disk when a fatal signal is raised or an assertion failure occurs within the Ceph code.

In Rook environments, OSD and monitor logs appear in the container stdout and can be retrieved with `kubectl logs`.

## Log Level Syntax

Log levels range from 0 (errors only) to 20 (maximum verbosity). The format is:

```text
debug_<subsystem> = <log_level>/<memory_level>
```

For example, `debug_osd = 5/5` sets both the on-disk log level and in-memory level for OSD logging to 5.

## Common Debug Subsystems

```ini
[global]
debug_ms = 1/5
debug_osd = 0/5
debug_bluestore = 0/5
debug_bluefs = 0/5
debug_monc = 0/5
debug_mon = 0/5
debug_rgw = 0/5
debug_mds = 0/5
```

Setting the log level to 0 and memory level to 5 means only critical messages are written to the log file on disk, but verbose entries up to level 5 are kept in the in-memory buffer and flushed only on fatal signals or assertions - useful when debugging without impacting disk I/O.

## Enabling Debug Logging Dynamically

You can change log levels at runtime without restarting daemons:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.* injectargs '--debug-osd 10'
```

To increase OSD debug logging on a specific OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.2 injectargs '--debug-osd 20/20'
```

Reset to defaults after debugging:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.2 injectargs '--debug-osd 0/5'
```

## Viewing Logs in Rook

Retrieve logs for a specific OSD pod:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-osd,ceph-osd-id=0 --tail=100
```

Retrieve monitor logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mon --tail=200
```

## Configuring Log Rotation

In Rook, logs are containerized and managed by Kubernetes. For bare-metal Ceph clusters, configure log rotation via `logrotate`:

```text
/var/log/ceph/*.log {
    rotate 7
    daily
    compress
    missingok
    notifempty
    sharedscripts
    postrotate
        killall -q -1 ceph-mon ceph-mgr ceph-mds ceph-osd radosgw || true
    endscript
}
```

## Ceph Log Channels

Ceph also supports named log channels. The `cluster` channel captures cluster-level events:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph log last 100 cluster
```

## Summary

Ceph logging is per-subsystem and uses a memory/disk dual-level system. Use `ceph tell` with `injectargs` to change log levels dynamically without restarting daemons. In Rook, access logs via `kubectl logs`. Always reset debug levels after troubleshooting to avoid excessive disk usage and performance degradation.
