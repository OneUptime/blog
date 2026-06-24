# How to Handle Data Plane Hot Restart

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Hot Restart, Envoy, Kubernetes

Description: Understanding and configuring Envoy hot restart in Istio to apply configuration changes and upgrade proxies without dropping active connections.

---

Hot restart is an Envoy feature that allows a new instance of the proxy to take over from an old instance without dropping active connections during the drain process. Existing connections are not transferred to the new process; they must finish during the drain period or be terminated.

In current Istio sidecars, Envoy is started with hot restart disabled. Istio normally updates routing, clusters, listeners, and secrets through xDS, and sidecar binary upgrades are handled by restarting pods so they receive a newly injected proxy. Understanding the difference helps you avoid unnecessary downtime and troubleshoot issues when proxies are not behaving as expected.

## What Is Hot Restart?

In a standalone Envoy deployment where hot restart is enabled, when Envoy needs to restart for a binary upgrade, configuration change that requires a full restart, or other reason, it does not simply stop and start. Instead, it:

1. Starts a new Envoy process
2. The new process coordinates with the old process through a Unix domain socket
3. The new process starts accepting new connections
4. The old process stops accepting new connections but continues handling existing ones
5. After a drain period, the old process exits

This handoff means that at no point are there zero Envoy instances handling traffic. Connections that were established with the old process continue to be served by the old process until they complete naturally or the drain period expires.

## Hot Restart vs. Live Configuration Updates

It is important to understand that most Istio configuration changes do NOT trigger a hot restart. When you create or modify a VirtualService, DestinationRule, or other Istio resource, istiod pushes the updated configuration to the Envoy proxies over xDS (the Envoy discovery service protocol). Envoy applies these changes live without any restart.

In standalone Envoy, hot restart is useful for changes that cannot be applied dynamically, such as:
- Envoy binary upgrades
- Changes to bootstrap configuration
- Changes to certain static listeners
- Some low-level Envoy settings

You can check the current Envoy configuration to see what is in the bootstrap (static) vs. what is dynamic:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/config_dump | python3 -c "
import json, sys
config = json.load(sys.stdin)
for item in config.get('configs', []):
    print(item.get('@type', 'unknown'))
"
```

## Hot Restart Configuration

Envoy's hot restart behavior is controlled by command-line settings such as `--drain-time-s` and `--parent-shutdown-time-s`. In current Istio sidecars, hot restart itself is disabled, but `drainDuration` still controls the drain time passed to Envoy for drain behavior.

The key settings are:

**Drain duration** - How long Envoy drains connections during a hot restart in Envoy, and the value Istio passes to Envoy as `--drain-time-s`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 45s
```

**Termination drain duration** - How long Istio allows connections to complete during proxy shutdown after `SIGTERM` or `SIGINT`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 60s
```

The old `parentShutdownDuration` setting is not part of current Istio `ProxyConfig`. It was tied to Envoy hot restart parent shutdown behavior, while current Istio uses `terminationDrainDuration` for proxy shutdown draining.

## Monitoring Hot Restarts

You can check whether a proxy is running with hot restart disabled by checking the server info:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/server_info | python3 -m json.tool
```

Look for `command_line_options.disable_hot_restart` and the `hot_restart_version` field. You can also check the hot restart compatibility version:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/hot_restart_version
```

You can inspect the restart epoch statistic:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "server.hot_restart_epoch"
```

In current Istio sidecars this should normally stay at `0` because hot restart is disabled. If Envoy is restarting unexpectedly, check the proxy logs:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=100
```

## Shared Memory in Hot Restart

Envoy uses Unix domain sockets to coordinate old and new processes during hot restart, and it uses shared memory regions as part of hot restart support. Current Envoy documentation describes counters and gauges being transferred over the Unix domain socket between processes.

In current Istio sidecars, hot restart is disabled, so you normally do not need to resize `/dev/shm` for Envoy hot restart.

Check the shared memory size:

```bash
kubectl exec deploy/my-app -c istio-proxy -- df -h /dev/shm
```

If you run a custom Envoy container with hot restart enabled and need a larger shared memory mount, add an in-memory `emptyDir` and mount it at `/dev/shm`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
      - name: envoy
        image: envoyproxy/envoy:latest
        volumeMounts:
        - name: dshm
          mountPath: /dev/shm
      volumes:
      - name: dshm
        emptyDir:
          medium: Memory
          sizeLimit: 128Mi
```

For an Istio-injected sidecar, the annotations for adding extra sidecar volumes and mounts are:

```yaml
metadata:
  annotations:
    sidecar.istio.io/userVolume: '[{"name":"dshm","emptyDir":{"medium":"Memory","sizeLimit":"128Mi"}}]'
    sidecar.istio.io/userVolumeMount: '[{"name":"dshm","mountPath":"/dev/shm"}]'
```

These annotations add the volume and mount to the injected sidecar; do not also define a duplicate volume with the same name in the pod spec.

## Handling Hot Restart Failures

In standalone Envoy, if a hot restart fails, the new Envoy process exits and the old process continues serving traffic. This is a safe failure mode because traffic is not interrupted. However, the proxy will be running with the old configuration or binary.

Common causes of hot restart failures:

**Hot restart compatibility mismatch**: Envoy exposes a hot restart compatibility version. If the new binary is not compatible with the running binary, hot restart should not be attempted.

**Resource constraints**: If the container does not have enough memory to run two Envoy processes simultaneously, the new process may OOM before it can take over.

Check memory limits:

```bash
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}'
```

Make sure the memory limit is high enough to accommodate two processes. A good rule of thumb is to set the limit to at least 2x the normal memory usage of a single Envoy process.

**Socket conflicts**: If the Unix domain socket used for coordination between old and new processes is in a bad state, hot restart can fail. This can happen if a previous restart was interrupted.

## Disabling Hot Restart

In current Istio sidecars, hot restart is already disabled by the way `istio-agent` starts Envoy. You can confirm this in the server info output:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/server_info | python3 -c "
import json, sys
info = json.load(sys.stdin)
print(info.get('command_line_options', {}).get('disable_hot_restart'))
"
```

If this prints `True`, Envoy was started with `--disable-hot-restart`. There is no supported `ISTIO_META_ENABLE_HOT_RESTART` proxy metadata setting in current Istio to re-enable it for sidecars.

## Hot Restart During Upgrades

When upgrading Istio, the sidecar binary changes. The way to "upgrade" sidecars is to restart the pods so they get the new sidecar injected. This is not technically a hot restart but a full pod replacement.

```bash
kubectl rollout restart deployment my-app -n default
```

True Envoy hot restarts happen within the lifecycle of a single proxy process supervisor when hot restart is enabled. During a Kubernetes rolling update, the old pod and new pod overlap, which achieves a similar effect at the pod level.

## Best Practices

1. Set `drainDuration` carefully for Envoy drain behavior
2. Use `terminationDrainDuration` for Istio proxy shutdown draining
3. Ensure sufficient memory limits for two concurrent Envoy processes only in custom deployments that enable hot restart
4. Check `disable_hot_restart` and restart epochs when debugging Envoy process behavior
5. Keep shared memory sizing in mind only for custom Envoy deployments that enable hot restart
6. Test rollout and drain behavior in a staging environment before production

Hot restart is one of those Envoy features that you rarely need to think about in current Istio sidecars because Istio disables it and uses xDS updates plus Kubernetes rollouts instead. But when something goes wrong during a proxy restart or rollout, understanding how the handoff works in Envoy, what shared memory does, and which Istio drain settings still apply will save you a lot of debugging time.
