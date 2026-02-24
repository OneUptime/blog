# How to Handle Data Plane Hot Restart

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Hot Restart, Envoy, Kubernetes

Description: Understanding and configuring Envoy hot restart in Istio to apply configuration changes and upgrade proxies without dropping active connections.

---

Hot restart is an Envoy feature that allows a new instance of the proxy to take over from an old instance without dropping any active connections. This is how Istio can update sidecar configurations and even upgrade proxy binaries while keeping your traffic flowing. Understanding how this works helps you avoid unnecessary downtime and troubleshoot issues when proxies are not behaving as expected.

## What Is Hot Restart?

When Envoy needs to restart (for a binary upgrade, configuration change that requires a full restart, or other reasons), it does not simply stop and start. Instead, it:

1. Starts a new Envoy process
2. The new process coordinates with the old process through a Unix domain socket
3. The new process starts accepting new connections
4. The old process stops accepting new connections but continues handling existing ones
5. After a drain period, the old process exits

This handoff means that at no point are there zero Envoy instances handling traffic. Connections that were established with the old process continue to be served by the old process until they complete naturally or the drain period expires.

## Hot Restart vs. Live Configuration Updates

It is important to understand that most Istio configuration changes do NOT trigger a hot restart. When you create or modify a VirtualService, DestinationRule, or other Istio resource, istiod pushes the updated configuration to the Envoy proxies over xDS (the Envoy discovery service protocol). Envoy applies these changes live without any restart.

Hot restart is only needed for changes that cannot be applied dynamically, such as:
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

Envoy's hot restart behavior is controlled by a few parameters in the bootstrap configuration. In Istio, you can influence these through proxy configuration.

The key settings are:

**Drain duration** - How long the old process keeps serving existing connections after the new process starts:

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

**Parent shutdown time** - How long the new process waits before asking the old process to shut down:

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
          parentShutdownDuration: 60s
```

The `parentShutdownDuration` should be longer than the `drainDuration` to give the old process time to finish draining before being told to shut down.

## Monitoring Hot Restarts

You can see how many times Envoy has hot restarted by checking the server info:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/server_info | python3 -m json.tool
```

Look for the `hot_restart_version` field. You can also check the restart epoch:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/hot_restart_version
```

Monitor for frequent hot restarts, which could indicate a problem:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "server.hot_restart_epoch"
```

If the epoch keeps incrementing, something is causing repeated restarts. Check the proxy logs:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=100
```

## Shared Memory in Hot Restart

Envoy uses shared memory to transfer state between the old and new processes during hot restart. This includes:
- Active connection counts
- Statistics counters
- Drain state information

The shared memory region is created in `/dev/shm` inside the container. If your container has a small `/dev/shm` limit, hot restarts can fail.

Check the shared memory size:

```bash
kubectl exec deploy/my-app -c istio-proxy -- df -h /dev/shm
```

If it is too small, increase it in your pod spec:

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
      volumes:
      - name: dshm
        emptyDir:
          medium: Memory
          sizeLimit: 128Mi
```

Then mount it in the istio-proxy container by adding the volume mount through an annotation:

```yaml
metadata:
  annotations:
    sidecar.istio.io/userVolume: '[{"name":"dshm","emptyDir":{"medium":"Memory","sizeLimit":"128Mi"}}]'
    sidecar.istio.io/userVolumeMount: '[{"name":"dshm","mountPath":"/dev/shm"}]'
```

## Handling Hot Restart Failures

If a hot restart fails, the new Envoy process will exit and the old process continues serving traffic. This is a safe failure mode because traffic is not interrupted. However, the proxy will be running with the old configuration or binary.

Common causes of hot restart failures:

**Shared memory incompatibility**: If the old and new Envoy versions have different shared memory layouts, hot restart will fail. This is why you should not skip minor versions during upgrades.

**Resource constraints**: If the container does not have enough memory to run two Envoy processes simultaneously (even briefly), the new process may OOM before it can take over.

Check memory limits:

```bash
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}'
```

Make sure the memory limit is high enough to accommodate two processes. A good rule of thumb is to set the limit to at least 2x the normal memory usage of a single Envoy process.

**Socket conflicts**: If the Unix domain socket used for coordination between old and new processes is in a bad state, hot restart will fail. This can happen if a previous restart was interrupted.

## Disabling Hot Restart

In some cases, you might want to disable hot restart entirely. For example, if you are running in an environment where shared memory is not available or if you are using a container runtime that does not support it.

You can disable hot restart through the proxy configuration:

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
          proxyMetadata:
            ISTIO_META_ENABLE_HOT_RESTART: "false"
```

When hot restart is disabled, any change that would normally trigger a hot restart will instead require a full pod restart.

## Hot Restart During Upgrades

When upgrading Istio, the sidecar binary changes. The way to "upgrade" sidecars is to restart the pods so they get the new sidecar injected. This is not technically a hot restart but a full pod replacement.

```bash
kubectl rollout restart deployment my-app -n default
```

True hot restarts happen within the lifecycle of a single pod, when Envoy needs to restart itself internally. During a Kubernetes rolling update, the old pod and new pod overlap, which achieves a similar effect at the pod level.

## Best Practices

1. Set `drainDuration` to match your longest expected request duration
2. Set `parentShutdownDuration` to be at least 10 seconds longer than `drainDuration`
3. Ensure sufficient memory limits for two concurrent Envoy processes
4. Monitor hot restart epochs to detect unexpected restarts
5. Keep the shared memory volume sized appropriately
6. Test hot restart behavior in a staging environment before production

Hot restart is one of those features that works quietly in the background and you rarely need to think about. But when something goes wrong during a restart, understanding how the handoff works, what shared memory does, and how to tune the drain and shutdown durations will save you a lot of debugging time.
