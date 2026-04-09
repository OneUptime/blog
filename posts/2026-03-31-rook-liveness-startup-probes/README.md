# How to Configure Liveness and Startup Probes in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Probe, Liveness, Reliability

Description: Customize liveness and startup probe settings for Rook-Ceph daemon containers to prevent premature restarts during slow startups and to detect genuinely stuck processes.

---

## Default Probe Behavior

Rook sets default liveness and startup probes on all Ceph daemon containers. These probes use the Ceph admin socket to check whether the daemon is alive and responsive. If the probe fails enough times, Kubernetes restarts the container.

The defaults are conservative but may need adjustment in two scenarios:
1. Slow-starting OSDs on busy nodes with many devices (startup probe)
2. Clusters where you want more aggressive detection of stuck daemons (liveness probe)

## Configuring Startup Probes

Startup probes prevent liveness probes from killing a container before it has had time to initialize. This is especially important for OSD processes that must scan and initialize BlueStore on startup.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  healthCheck:
    startupProbe:
      mon:
        disabled: false
        probe:
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 30
      mgr:
        disabled: false
        probe:
          initialDelaySeconds: 15
          periodSeconds: 10
          failureThreshold: 20
      osd:
        disabled: false
        probe:
          initialDelaySeconds: 20
          periodSeconds: 10
          failureThreshold: 60
```

The `failureThreshold` for OSDs is set high because an OSD on a slow HDD can take several minutes to complete initialization. With `periodSeconds: 10` and `failureThreshold: 60`, the startup probe allows up to 10 minutes.

## Configuring Liveness Probes

Liveness probes run continuously after startup. They detect daemons that have become unresponsive without crashing (deadlocked processes, stuck I/O):

```yaml
spec:
  healthCheck:
    livenessProbe:
      mon:
        disabled: false
        probe:
          initialDelaySeconds: 10
          periodSeconds: 15
          failureThreshold: 5
          successThreshold: 1
          timeoutSeconds: 5
      mgr:
        disabled: false
        probe:
          periodSeconds: 15
          failureThreshold: 5
      osd:
        disabled: false
        probe:
          periodSeconds: 20
          failureThreshold: 5
          timeoutSeconds: 10
```

Set `timeoutSeconds` higher for OSDs since a disk under heavy I/O load may take several seconds to respond to the admin socket probe.

## Disabling Probes

During debugging or when a probe is causing spurious restarts, disable it temporarily:

```yaml
healthCheck:
  livenessProbe:
    osd:
      disabled: true
```

Disabling probes is a diagnostic tool, not a permanent solution. Re-enable them after resolving the underlying issue.

## Diagnosing Probe Failures

Check the event log for probe-related restarts:

```bash
kubectl -n rook-ceph describe pod -l app=rook-ceph-osd | grep -A 5 "Liveness probe"
```

View restart history to identify recurring probe failures:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-osd \
  -o custom-columns='NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,REASON:.status.containerStatuses[0].lastState.terminated.reason'
```

If the restart reason is `OOMKilled`, the container ran out of memory rather than being killed due to a probe failure. Both OOM kills and probe kills result in exit code `137` (SIGKILL), but Kubernetes sets the reason to `OOMKilled` specifically for out-of-memory terminations.

## Summary

Startup and liveness probe settings in Rook provide the Kubernetes-level health loop that complements Ceph's own daemon monitoring. Tune startup probe failure thresholds to accommodate slow OSD initialization on large or busy disks, and set liveness probe timeouts to reflect expected I/O latency in your environment. Disable probes only temporarily when debugging unexpected restarts.
