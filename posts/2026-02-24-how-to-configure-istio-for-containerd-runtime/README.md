# How to Configure Istio for containerd Runtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Containerd, Container Runtime, Kubernetes, Service Mesh

Description: Guide to running Istio on Kubernetes clusters using the containerd container runtime including configuration best practices and troubleshooting.

---

containerd is now the default container runtime for most Kubernetes distributions. It's lighter than Docker (no Docker daemon needed), faster to start containers, and fully compatible with the Kubernetes CRI (Container Runtime Interface). If you're running a recent version of Kubernetes, you're probably already on containerd. Here's what you need to know about running Istio on containerd-based clusters.

## Why containerd Matters for Istio

From Istio's perspective, the container runtime is mostly transparent. The sidecar injection, iptables rules, and proxy configuration all work at the Kubernetes API level, not the runtime level. However, containerd does affect a few things:

- Container startup timing and ordering
- How images are pulled and cached
- Log format and access patterns
- Resource accounting and cgroup configuration

## Verifying Your Runtime

Check if you're running containerd:

```bash
kubectl get nodes -o wide
```

The `CONTAINER-RUNTIME` column should show something like `containerd://1.7.x`.

For more detail:

```bash
kubectl get node <node-name> -o jsonpath='{.status.nodeInfo.containerRuntimeVersion}'
```

## Installing Istio on containerd Clusters

Installation is standard. No special flags needed:

```bash
istioctl install --set profile=default
```

Or with an IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
```

The `holdApplicationUntilProxyStarts` setting works well with containerd. containerd tends to start containers faster than Docker, which means there's a slightly higher chance that your application container starts before the sidecar is ready. This flag prevents that race condition.

## Container Startup Order

containerd starts all containers in a pod concurrently by default. This can cause issues where your application tries to make network calls before the Istio sidecar proxy is ready to handle them.

The recommended solution is the `holdApplicationUntilProxyStarts` option:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

This works by adding a `postStart` lifecycle hook to the sidecar container that blocks until the proxy is ready. The application container's startup is delayed by the Kubernetes kubelet until the sidecar's `postStart` hook completes.

You can also set this per-pod via annotation:

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
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

## Image Pull Configuration

containerd uses a different image pull configuration than Docker. If you're using a private registry for Istio images, make sure containerd is configured to authenticate:

On the node, the containerd config file is typically at `/etc/containerd/config.toml`:

```toml
[plugins."io.containerd.grpc.v1.cri".registry.configs."my-registry.example.com".auth]
  username = "user"
  password = "pass"
```

Or better, use Kubernetes image pull secrets:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      imagePullSecrets:
      - name: my-registry-secret
```

## Cgroup Configuration

containerd supports both cgroup v1 and v2. Istio works with both, but if you're on cgroup v2, make sure your resource limits are set correctly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

On cgroup v2 systems, you can verify the cgroup settings for the sidecar:

```bash
# Find the pod's cgroup path
kubectl exec -it deploy/my-app -c istio-proxy -- cat /proc/self/cgroup
```

## Logging with containerd

containerd uses a different log format than Docker. Logs are stored in `/var/log/pods/` on the node rather than Docker's JSON log format. For Istio debugging, this doesn't matter if you're using kubectl:

```bash
kubectl logs deploy/my-app -c istio-proxy
```

But if you're accessing logs directly on the node:

```bash
# containerd log path
ls /var/log/pods/<namespace>_<pod-name>_<pod-uid>/istio-proxy/
```

The log format is slightly different from Docker's format, which can affect log aggregation tools if they're configured for Docker-specific parsing.

## Networking and CNI

containerd works with the same CNI plugins as Docker. If you're using the Istio CNI plugin (recommended), it works the same way:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
```

The CNI plugin is actually a better choice on containerd clusters because it eliminates the need for the init container that sets up iptables rules. Instead, the CNI plugin configures iptables when the pod's network namespace is created, which is more reliable and doesn't require the elevated privileges that the init container needs.

## Sidecar Container Management

You can inspect the sidecar container through containerd's CLI tool, `ctr` or `crictl`:

```bash
# Using crictl (recommended for Kubernetes)
crictl ps | grep istio-proxy

# Get container details
crictl inspect <container-id>
```

To check the sidecar's resource usage:

```bash
crictl stats | grep istio-proxy
```

## Troubleshooting containerd-Specific Issues

### Container Startup Failures

If the istio-proxy container fails to start, check containerd events:

```bash
crictl events
```

And the kubelet logs:

```bash
journalctl -u kubelet -n 50 | grep istio
```

### Image Pull Issues

containerd caches images differently than Docker. To check if the Istio proxy image is available:

```bash
crictl images | grep istio
```

To manually pull the image:

```bash
crictl pull docker.io/istio/proxyv2:1.20.0
```

### Network Namespace Issues

If traffic routing isn't working, verify the iptables rules in the pod's network namespace:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- iptables -t nat -L -n
```

You should see the ISTIO_REDIRECT and ISTIO_OUTPUT chains. If they're missing, the init container might have failed:

```bash
kubectl logs deploy/my-app -c istio-init
```

### RuntimeClass Configuration

If you're using RuntimeClass for different workloads (like running some pods with kata-containers), make sure the Istio sidecar is compatible with the runtime:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: containerd-default
handler: runc
```

Most Istio components work fine with the default `runc` handler. If you're using a different handler like `kata`, you may need additional configuration for the sidecar's iptables setup.

## Performance on containerd

containerd is generally faster than Docker for container operations:

- Container startup is about 20-30% faster
- Image pull is comparable
- Memory overhead is lower (no Docker daemon)

For Istio, the faster startup time means:
- Sidecar injection adds less overhead to pod startup
- Rolling updates are faster
- Scale-up events complete more quickly

containerd is the recommended runtime for production Istio deployments. It's simpler, lighter, and well-tested with Istio. If you're still running Docker as your container runtime, migrating to containerd is straightforward and Istio won't need any configuration changes.
