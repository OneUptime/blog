# How to Configure MDS Health Probes in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, Health Probe, CephFS

Description: Learn how to configure liveness and readiness health probes for MDS daemons in Rook-Ceph to improve CephFS reliability and Kubernetes pod management.

---

## Overview

The Metadata Server (MDS) daemon manages file system metadata for CephFS. In Rook, MDS daemons run as Kubernetes pods, and you can configure custom startup and liveness health probes to control how Kubernetes monitors their health. Properly tuned probes prevent Kubernetes from prematurely restarting healthy MDS daemons during normal operations like standby-replay transitions.

## Default MDS Health Probe Behavior

By default, Rook configures basic health probes for MDS pods. These probes check whether the MDS process is responsive. However, the default settings may be too aggressive for large CephFS deployments where MDS daemons take longer to become active after a failover.

## Configuring Custom Health Probes in CephFilesystem

Health probes are configured in the `CephFilesystem` resource under the `metadataServer` section:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
  - name: replicated
    replicated:
      size: 3
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
    healthCheck:
      startupProbe:
        disabled: false
        probe:
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 30
      livenessProbe:
        disabled: false
        probe:
          initialDelaySeconds: 15
          periodSeconds: 30
          failureThreshold: 5
          successThreshold: 1
          timeoutSeconds: 5
```

## Understanding Probe Parameters

```text
initialDelaySeconds - Time to wait before starting probes after container starts
periodSeconds       - How often to run the probe
failureThreshold    - Number of failures before marking pod unhealthy
successThreshold    - Number of successes to mark pod healthy after failure
timeoutSeconds      - Probe timeout duration
```

For MDS daemons, set `initialDelaySeconds` generously (15-30s) to allow the daemon time to load the metadata cache before probes begin.

## Disabling Probes Temporarily

During large filesystem recovery operations, MDS daemons may appear temporarily unresponsive while processing large journals. You can disable probes temporarily:

```yaml
spec:
  metadataServer:
    healthCheck:
      livenessProbe:
        disabled: true
```

```bash
kubectl apply -f myfs-no-probe.yaml
```

Re-enable after the recovery operation completes.

## Tuning Probes for Standby-Replay MDS

When using `activeStandby: true`, the standby MDS enters replay mode and may briefly appear unresponsive during journal replay. Increase the failure threshold for environments with large metadata journals:

```yaml
spec:
  metadataServer:
    healthCheck:
      livenessProbe:
        probe:
          initialDelaySeconds: 30
          periodSeconds: 30
          failureThreshold: 10
```

## Verifying Probe Configuration

Check the actual probe configuration applied to MDS pods:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-mds -o yaml | \
  grep -A 20 livenessProbe
```

Check MDS daemon health directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds stat

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

## Monitoring MDS Restarts

Track unexpected MDS restarts caused by probe failures:

```bash
kubectl -n rook-ceph get events | grep -i mds
kubectl -n rook-ceph describe pod -l app=rook-ceph-mds | grep -A 10 Events
```

Frequent restarts suggest probes are too aggressive for your workload.

## Summary

Configuring MDS health probes in Rook prevents Kubernetes from prematurely killing MDS daemons during normal operations like journal replay and metadata cache loading. Set generous `initialDelaySeconds` values for large CephFS deployments, increase `failureThreshold` for standby-replay setups, and monitor pod events to detect probe-related restarts. Properly tuned probes improve CephFS availability by reducing unnecessary MDS failovers.
