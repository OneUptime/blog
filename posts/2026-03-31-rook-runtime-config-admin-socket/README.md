# How to View Runtime Configuration via Admin Socket in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, Admin Socket, Runtime

Description: Use the Ceph admin socket to inspect and temporarily modify runtime configuration of OSD, MON, and MDS daemons without restarting them in Rook clusters.

---

Ceph daemons apply configuration from multiple sources in priority order: compiled defaults, config file, monitor centralized config, and runtime overrides. The admin socket lets you inspect the final resolved configuration and apply temporary runtime changes.

**Important:** The `ceph daemon` command communicates via a Unix domain socket that only exists inside the daemon's own pod. You must exec into the specific daemon pod, not the tools pod. Find the pod name for an OSD, MON, or MDS like this:

```bash
# Find OSD pod (e.g., osd.0)
OSD_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-osd,ceph-osd-id=0 -o jsonpath='{.items[0].metadata.name}')

# Find MON pod (e.g., mon.a)
MON_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-mon,ceph_daemon_id=a -o jsonpath='{.items[0].metadata.name}')

# Find MDS pod (e.g., mds.myfs-a)
MDS_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-mds -o jsonpath='{.items[0].metadata.name}')
```

## View Complete Runtime Configuration

```bash
kubectl exec -n rook-ceph $OSD_POD -- \
  ceph daemon osd.0 config show
```

This shows the full merged configuration including all sources. Pipe to `python3` for readable output:

```bash
kubectl exec -n rook-ceph $OSD_POD -- \
  ceph daemon osd.0 config show | python3 -m json.tool | less
```

## Get a Specific Configuration Key

```bash
kubectl exec -n rook-ceph $OSD_POD -- \
  ceph daemon osd.0 config get osd_recovery_max_active

kubectl exec -n rook-ceph $MON_POD -- \
  ceph daemon mon.a config get auth_cluster_required
```

## Set a Runtime Configuration Override

```bash
kubectl exec -n rook-ceph $OSD_POD -- \
  ceph daemon osd.0 config set osd_recovery_max_active 1
```

This change is temporary - it applies only to the running daemon instance and is lost on restart.

For persistent changes, use the centralized config store:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active 1
```

## Inspect Key OSD Configuration Values

```bash
kubectl exec -n rook-ceph $OSD_POD -- bash -c "
  OSD=osd.0
  for key in osd_recovery_max_active osd_max_backfills osd_scrub_load_threshold osd_deep_scrub_interval; do
    val=\$(ceph daemon \$OSD config get \$key 2>/dev/null | python3 -c \"import json,sys; d=json.load(sys.stdin); print(list(d.values())[0])\")
    echo \"\$key = \$val\"
  done
"
```

## Check Configuration Source

To see where a value came from (default, config file, monitor, or runtime override):

```bash
kubectl exec -n rook-ceph $OSD_POD -- \
  ceph daemon osd.0 config diff
```

This shows keys that differ from their compiled defaults, indicating active customizations.

## View Monitor Runtime Config

```bash
kubectl exec -n rook-ceph $MON_POD -- \
  ceph daemon mon.a config show | python3 -m json.tool | grep -E "auth|mon_"
```

## View MDS Runtime Config

```bash
kubectl exec -n rook-ceph $MDS_POD -- \
  ceph daemon mds.myfs-a config show | python3 -m json.tool | grep -E "mds_cache|mds_log"
```

## Temporarily Increase Debug Logging

For diagnosing specific issues, temporarily increase log verbosity at runtime:

```bash
kubectl exec -n rook-ceph $OSD_POD -- bash -c "
  # Increase OSD debug level for RADOS operations
  ceph daemon osd.0 config set debug_osd 10
  ceph daemon osd.0 config set debug_ms 1

  # After collecting logs, reset to normal
  ceph daemon osd.0 config set debug_osd 1
  ceph daemon osd.0 config set debug_ms 0
"
```

## Compare Configurations Across OSDs

```bash
#!/bin/bash
KEY="osd_recovery_max_active"
for i in 0 1 2 3 4 5; do
  POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-osd,ceph-osd-id=$i -o jsonpath='{.items[0].metadata.name}')
  val=$(kubectl exec -n rook-ceph $POD -- \
    ceph daemon osd.$i config get $KEY 2>/dev/null | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(list(d.values())[0])")
  echo "osd.$i: $KEY = $val"
done
```

## Summary

The Ceph admin socket exposes the fully resolved runtime configuration of each daemon via `ceph daemon <name> config show` and `config get <key>`. Use `config diff` to see deviations from defaults. Runtime `config set` is useful for temporary debugging changes, but use `ceph config set` for persistent changes that survive daemon restarts. In Rook clusters, persistent configuration is also managed via the `rook-config-override` ConfigMap.
