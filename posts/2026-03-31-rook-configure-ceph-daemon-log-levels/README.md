# How to Configure Ceph Daemon Log Levels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Logging, Debugging, Configuration, OSD

Description: Adjust Ceph daemon log verbosity levels for OSDs, monitors, MDS, and RGW in Rook to control log volume and capture detailed debug information when needed.

---

Ceph daemons produce detailed logs at multiple verbosity levels. Raising log levels helps diagnose issues while lowering them reduces noise and disk usage in production. Rook allows you to configure log levels per-daemon type.

## Understanding Ceph Log Subsystems

Ceph uses subsystem-based logging with debug levels from 0 (no debug output, errors still logged) to 20 (maximum verbosity). Common subsystems include:

- `ms` - messaging layer
- `osd` - OSD operations
- `filestore` / `bluestore` - storage backend
- `mon` - monitor operations
- `mds` - metadata server
- `rgw` - RADOS gateway

## Set Log Levels via Ceph Config

Temporarily increase OSD log verbosity for debugging:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd debug_osd 5

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd debug_bluestore 5
```

Lower log levels for production to reduce log volume:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global log_to_stderr false

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global debug_osd 0/3
```

The format `x/y` sets the log-to-disk level to `x` and the in-memory level to `y`.

## Configure Log Levels in Rook CephCluster

Set default log levels through the cluster spec:

```yaml
spec:
  cephConfig:
    global:
      debug_ms: "0/1"
      debug_osd: "0/3"
      debug_mon: "0/5"
    osd:
      debug_bluestore: "0/1"
      debug_filestore: "0/1"
    mds:
      debug_mds: "0/5"
    "client.rgw":
      debug_rgw: "0/5"
```

## Set Log Levels for RGW

Increase RGW debug logging temporarily:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw debug_rgw 20
```

View current config for a daemon class:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config dump | grep debug
```

## View Daemon Logs

Read logs directly from Kubernetes pods:

```bash
# OSD logs
kubectl -n rook-ceph logs deploy/rook-ceph-osd-0 --tail=100

# Monitor logs
kubectl -n rook-ceph logs -l app=rook-ceph-mon --tail=100

# RGW logs
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=100
```

## Summary

Ceph's subsystem-based log level system lets you target verbose output to specific daemons without flooding all logs. Use the `ceph config set` command for immediate, temporary changes and the `cephConfig` section of `CephCluster` for persistent settings. Always lower debug levels back to production defaults after troubleshooting.
