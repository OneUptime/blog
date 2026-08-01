# How to Give a Sidecar Time to Flush Logs During Pod Termination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Logging, Graceful Shutdown, Pod Termination, Observability

Description: Design and test a termination path that lets a native logging sidecar ship final records before Kubernetes forcibly removes the Pod.

---

Kubernetes-native sidecars solve one part of final-log delivery: during graceful Pod termination, the kubelet waits for main application containers to stop before it terminates native sidecars. That keeps a log shipper alive while the application writes its last records.

It does not give the shipper unlimited time. The application, lifecycle hooks, and every sidecar share one Pod termination grace period. If earlier shutdown work consumes the budget, the shipper can receive `SIGTERM` and then `SIGKILL` before its queue drains.

Reliable final-log delivery therefore needs both native ordering and an explicit time budget.

## Use Native Sidecar Semantics

Declare the collector as a restartable init container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: report-api
spec:
  terminationGracePeriodSeconds: 90
  initContainers:
    - name: log-shipper
      image: registry.example.com/log-shipper:4.6.0
      restartPolicy: Always
      args:
        - --file=/var/log/example/application.log
        - --flush-on-signal=true
        - --flush-timeout=25s
      volumeMounts:
        - name: application-logs
          mountPath: /var/log/example
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
  containers:
    - name: application
      image: registry.example.com/report-api:11.2.0
      args:
        - --log-file=/var/log/example/application.log
      volumeMounts:
        - name: application-logs
          mountPath: /var/log/example
  volumes:
    - name: application-logs
      emptyDir: {}
```

The argument names are illustrative; use the actual drain and flush settings supported by the chosen shipper. The Kubernetes behavior comes from two fields:

- placing the shipper in `initContainers` with `restartPolicy: Always` makes it a native sidecar;
- `terminationGracePeriodSeconds: 90` gives the *whole Pod* up to 90 seconds for graceful shutdown.

If the shipper remains in `spec.containers`, it is a legacy sidecar. Kubernetes treats it as another main container and does not guarantee that it stops after the application.

## Understand Where the 90 Seconds Go

When a graceful deletion begins:

1. The termination grace-period countdown starts.
2. The kubelet runs the main container's `preStop` hook, if any.
3. The runtime sends the main container its stop signal after the hook completes.
4. The application should stop accepting work, finish or checkpoint in-flight work, write final logs, flush its own userspace buffers, close the file, and exit.
5. Only after every main container is fully stopped does kubelet begin terminating native sidecars, in reverse declaration order.
6. The shipper's own `preStop` hook, if configured, runs before its stop signal.
7. The shipper handles the signal, sends buffered records, and exits.
8. When the Pod grace period expires, any remaining processes are forcibly killed.

There is no separate 90-second sidecar window. If the application uses 70 seconds, about 20 seconds remain for the sidecar chain. If an application `preStop` hook sleeps for 80 seconds, almost no useful drain time remains.

If a `preStop` hook is still running at expiry, the kubelet requests a small, one-off two-second extension. Treat that as an emergency allowance, not as flush capacity when sizing the normal shutdown path.

## Size the Budget from Measured Shutdown

Start with a conservative model:

```text
terminationGracePeriodSeconds
  >= maximum application preStop duration
   + maximum application drain and final-write duration
   + maximum sidecar preStop and flush duration
   + safety margin
```

For multiple native sidecars, include each sequential sidecar shutdown in reverse declaration order. Multiple main containers can terminate partly in parallel, so use the slowest observed main path rather than blindly summing all main-container times.

Measure high-percentile and worst-case behavior under load. Log flush duration changes with:

- queue size at termination;
- upstream latency, throttling, and retries;
- DNS and network availability;
- compression and serialization work;
- the sidecar's CPU request and limit;
- the application's time to finish its own writes.

If a strict delivery guarantee is required, an in-memory sidecar queue alone is not durable enough. Node loss and force deletion can bypass graceful behavior. Use a durable local or remote queue, or design records so they can be replayed without duplication.

## Make Both Processes Signal-Aware

Ordering is useful only when processes cooperate.

The application should:

- handle its stop signal in PID 1 or correctly forward it from a wrapper;
- stop starting new work;
- complete, checkpoint, or abandon current work according to policy;
- flush language-runtime and logging-library buffers;
- close or `fsync` files when required by the durability model;
- exit before the sidecar's portion of the grace budget is consumed.

The sidecar should:

- continue reading until it has observed the application's final writes;
- handle its stop signal instead of exiting abruptly;
- stop accepting new input, drain its queue, and bound retries;
- return a meaningful drain metric and log message;
- exit before its configured flush timeout exceeds the remaining Pod grace.

Shell wrappers can interfere with signal delivery. Prefer an image whose main process is the shipper itself or use an init process that forwards signals correctly.

## Use `preStop` Only for a Real Drain Action

A sidecar may expose an explicit local flush endpoint. A `preStop` hook can invoke it before the runtime signals the process:

```yaml
lifecycle:
  preStop:
    httpGet:
      path: /drain
      port: 2020
```

This can be useful, but it does not extend the grace period. The hook must complete before the stop signal is delivered, so a hanging hook leaves less time for the process itself. Kubernetes' hook delivery intent is at least once; make the operation idempotent.

Avoid an unconditional sleep as the main strategy. Waiting does not prove that the application closed its log, that the queue is empty, or that the upstream acknowledged the records. Prefer a drain endpoint, an EOF/marker protocol, or internal queue state that observes progress.

## Make File Sharing Explicit

Containers do not see each other's image filesystems. Both must mount the same volume at the paths they use. The two mount paths may differ, but they must refer to the same named volume and agree on the file location.

An `emptyDir` volume survives individual container restarts and remains available to the native sidecar during graceful Pod shutdown. It is deleted with the Pod and is not durable across node loss or Pod replacement.

Also account for rotation:

- a collector following an inode can continue reading a renamed file;
- a collector that reopens only by path can miss records depending on rotation timing;
- deleting an open file does not necessarily free its blocks until all handles close;
- the application and collector must agree on whether rotation is owned by the application, collector, or node-level logging system.

Prefer writing application logs to `stdout` and `stderr` when the platform's node-level collection path is sufficient. A file-sharing sidecar is justified when the format, source, or delivery contract truly requires Pod-local processing.

## Put Dependent Sidecars in the Right Order

Suppose a formatter sends records to a shipper:

```yaml
initContainers:
  - name: shipper
    image: registry.example.com/shipper:4.6.0
    restartPolicy: Always
  - name: formatter
    image: registry.example.com/formatter:2.1.0
    restartPolicy: Always
```

They start `shipper` then `formatter`, and stop `formatter` then `shipper`. That lets the downstream shipper outlive its producer. Declare foundation/dependency sidecars earlier so they stop later.

Remember that all of this ordering is best effort within the remaining grace period. Once time expires, Kubernetes forcibly terminates remaining containers.

## Test Normal and Failure Paths

Do not validate only that the Pod eventually disappears. Emit uniquely identifiable records before and during termination, then verify them at the destination:

```bash
kubectl logs report-api -c application -f
kubectl logs report-api -c log-shipper -f
kubectl delete pod report-api --wait=false
kubectl get pod report-api -w
```

Record timestamps for:

- deletion requested;
- application stop signal received;
- application final record written and process exited;
- sidecar stop signal received;
- sidecar queue reached zero and final acknowledgement arrived;
- sidecar exited;
- Pod deletion completed.

Then test adverse cases:

1. Fill the shipper queue before deletion.
2. Slow or temporarily block the upstream collector.
3. Make the application consume most of its shutdown budget.
4. Restart the shipper while the application is still running.
5. Let the grace period expire and verify expected loss/replay behavior.
6. Simulate node loss in an environment where doing so is safe.

Alert separately on shipper crashes during normal operation and on forced shutdowns. Kubernetes notes that a non-zero native-sidecar exit can be normal at Pod termination when other containers consumed the grace period; filtering every non-zero exit would hide real runtime failures.

Native ordering gives the collector the correct position in the shutdown sequence. Signal handling, a measured grace budget, and a durability strategy turn that position into reliable delivery.

## Official Documentation

- [Kubernetes: Pod Shutdown and Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-shutdown-and-sidecar-containers)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes: Volumes and `emptyDir`](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes: Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
