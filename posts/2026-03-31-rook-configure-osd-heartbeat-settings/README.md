# How to Configure OSD Heartbeat Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Heartbeat, Network

Description: Learn how to configure Ceph OSD heartbeat settings to control failure detection timing and prevent false OSD down reports.

---

## How OSD Heartbeats Work

Ceph OSDs use heartbeat messages to detect peer failures. Each OSD sends heartbeat pings to its peers on both the public and cluster networks. If an OSD does not receive a response within a grace period, it reports the unresponsive OSD as down to the monitors.

Heartbeat configuration affects how quickly failures are detected and how sensitive the cluster is to transient network issues. Tuning these values helps reduce false positives in environments with variable network latency.

## Key Heartbeat Parameters

The main heartbeat settings are:

| Parameter | Default | Description |
| --- | --- | --- |
| `osd_heartbeat_interval` | 6s | How often OSDs send heartbeats to peers |
| `osd_heartbeat_grace` | 20s | Grace period before marking an OSD down |
| `osd_mon_heartbeat_interval` | 30s | How often OSDs send heartbeats to monitors |
| `osd_mon_report_interval` | 5s | Minimum interval between OSD reports to monitors on reportable events |

## Configuring Heartbeat Settings

To apply these settings dynamically:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_interval 6

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_grace 20
```

To configure via the Rook `CephCluster` CR:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    "osd.*":
      osd_heartbeat_interval: "6"
      osd_heartbeat_grace: "20"
      osd_mon_heartbeat_interval: "30"
```

## Tuning for High-Latency Networks

If your cluster spans nodes with higher network latency (for example, stretched clusters across availability zones), increase the grace period to avoid false positives:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_grace 40

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_interval 10
```

## Monitor-Side Heartbeat Settings

Monitors also have parameters that govern how they react to missed OSD heartbeats:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_osd_report_timeout 1800
```

This gives OSDs 30 minutes to report in before monitors mark them as failed. The default is 900 seconds (15 minutes). Increasing this value is useful in environments where OSDs may be temporarily unreachable due to planned maintenance.

## Verifying Heartbeat Configuration

Check current heartbeat settings on a running OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config show osd.0 | grep heartbeat
```

Watch for OSD flapping by monitoring the cluster log:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph log last 50 | grep "marked down"
```

## Summary

OSD heartbeat settings control how quickly Ceph detects and responds to OSD failures. The key parameters are `osd_heartbeat_interval`, `osd_heartbeat_grace`, and `osd_mon_heartbeat_interval`. In high-latency or stretched cluster environments, increase grace periods to prevent false OSD down events. Apply settings dynamically via `ceph config set` or declaratively through the Rook `CephCluster` CR.
