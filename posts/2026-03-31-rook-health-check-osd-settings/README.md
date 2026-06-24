# How to Configure Health Check Settings for OSDs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, HealthCheck, Reliability

Description: Tune OSD health check intervals and timeouts in Rook so the operator detects disk failures quickly and initiates recovery without triggering false-positive OSD removals.

---

## Why OSD Health Checks Need Tuning

Ceph marks an OSD as down and starts recovery when the OSD fails to respond for a set period. Rook adds a second layer: the operator periodically polls OSD status and, if `removeOSDsIfOutAndSafeToRemove` is enabled, can remove OSD deployments that are both down and out once Ceph confirms they are safe to destroy.

Too-frequent health check polling on slow disks or network blips can surface transient issues, while too-infrequent polling delays detection when a disk genuinely fails. Finding the right balance is critical for maintaining cluster performance.

## Configuring OSD Health Checks

Set the `osd` block under `healthCheck.daemonHealth` in your `CephCluster` CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  healthCheck:
    daemonHealth:
      osd:
        disabled: false
        interval: 60s
```

`interval` is how often the operator polls OSD health (default: 60 seconds). `disabled` controls whether the health check runs at all. Note that the `timeout` field, while accepted in the YAML schema, is only used by the `mon` health checker - it has no effect under the `osd` section.

## OSD Removal vs Ceph's Own osd.down Mechanism

Ceph internally marks an OSD `down` after `mon_osd_report_timeout` seconds (default 900s). Rook's health check operates independently: it polls OSD status at the configured `interval` and checks for OSDs that are both down and out. If `removeOSDsIfOutAndSafeToRemove` is enabled on the CephCluster spec, the operator will delete the OSD deployment once Ceph confirms the OSD is safe to destroy and a grace period has elapsed.

For most production clusters, the default 60-second polling interval is sufficient:

```yaml
healthCheck:
  daemonHealth:
    osd:
      interval: 60s
```

## High-Latency Storage Environments

On clusters with slow HDDs or heavily loaded nodes, frequent polling may add unnecessary load. Increase the interval to reduce operator overhead:

```yaml
healthCheck:
  daemonHealth:
    osd:
      interval: 120s
```

## NVMe Clusters Requiring Fast Detection

For all-NVMe clusters where disk failures are clean and abrupt, reduce the interval for faster detection:

```yaml
healthCheck:
  daemonHealth:
    osd:
      interval: 30s
```

## Monitoring OSD Health Manually

Check OSD status through the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

List OSDs that are currently down:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep -E "down|out"
```

Watch OSD pod restarts as an indicator of recurring issues:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-osd \
  -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName,RESTARTS:.status.containerStatuses[0].restartCount'
```

## Disabling OSD Health Checks During Maintenance

Before draining a node or replacing disks, disable OSD health checks to prevent the operator from reacting to expected OSD absences:

```yaml
healthCheck:
  daemonHealth:
    osd:
      disabled: true
```

Restore after the maintenance window closes.

## Summary

OSD health check configuration in Rook controls how frequently the operator polls for OSD status. Match your `interval` value to your disk technology (fast NVMe vs slow HDD) and network reliability. If you want the operator to automatically remove failed OSDs, enable `removeOSDsIfOutAndSafeToRemove` in your CephCluster spec. Always disable health checks during planned maintenance to avoid triggering recovery operations that compete with your maintenance work.
