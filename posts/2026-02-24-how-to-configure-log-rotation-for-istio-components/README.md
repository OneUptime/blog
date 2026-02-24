# How to Configure Log Rotation for Istio Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Logging, Log Rotation, Kubernetes, Operations

Description: Practical guide to setting up log rotation for Istio control plane and data plane components to prevent disk exhaustion and manage log storage effectively.

---

Log rotation is one of those operational concerns that's easy to overlook until your nodes start running out of disk space. Istio components can be pretty chatty, especially the Envoy proxies. Without proper log rotation, you can end up in a situation where log files consume all available disk space and start causing real problems for your cluster.

The good news is that there are several layers where you can handle log rotation for Istio, from the container runtime level all the way up to dedicated log management solutions.

## Understanding Where Istio Logs Go

Before configuring rotation, you need to understand where the logs actually end up.

By default, Istio components log to stdout/stderr. In a Kubernetes environment, the container runtime (containerd or CRI-O) captures these streams and writes them to files on the node, typically under `/var/log/containers/` and `/var/log/pods/`.

The container runtime itself handles rotation of these files. For containerd, the default configuration lives at `/etc/containerd/config.toml`:

```toml
[plugins."io.containerd.grpc.v1.cri".containerd]
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
```

## Kubelet Log Rotation

Kubernetes itself handles log rotation at the kubelet level. The kubelet has flags that control this:

```yaml
# kubelet configuration
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerLogMaxSize: "50Mi"
containerLogMaxFiles: 5
```

These settings apply to all containers on the node, including Istio sidecars and control plane pods. Setting `containerLogMaxSize` to 50Mi and `containerLogMaxFiles` to 5 means each container gets at most 250Mi of log space.

For most clusters, tuning these kubelet settings is the primary way to handle log rotation for Istio. You'll want to adjust based on your log volume. If you have very verbose Envoy access logging enabled, you might need larger max sizes.

## Envoy File-Based Access Logs

If you're writing Envoy access logs to files instead of stdout (which is less common but some setups do it), you need to handle rotation differently.

You can configure file-based access logging in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /var/log/istio/access.log
```

When using file-based logging, you need a sidecar or init process to handle rotation. One approach is to add a log rotation sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
        - name: my-service
          image: my-service:v1
        - name: log-rotator
          image: busybox:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                if [ -f /var/log/istio/access.log ]; then
                  SIZE=$(stat -f%z /var/log/istio/access.log 2>/dev/null || stat -c%s /var/log/istio/access.log 2>/dev/null)
                  if [ "$SIZE" -gt 104857600 ]; then
                    mv /var/log/istio/access.log /var/log/istio/access.log.1
                    # Envoy will reopen the file
                  fi
                fi
                sleep 60
              done
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/istio
      volumes:
        - name: log-volume
          emptyDir:
            sizeLimit: 500Mi
```

But honestly, the better approach is to just log to stdout and let the container runtime handle it. That's the Kubernetes-native way to do things.

## Istiod Log Rotation

Istiod logs to stdout by default, so the container runtime handles rotation. However, Istiod has built-in log rotation support for when you configure file-based logging.

You can set these through command-line flags on the pilot-discovery binary:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        containers:
          - name: discovery
            args:
              - "discovery"
              - "--log_rotate=/var/log/istiod/istiod.log"
              - "--log_rotate_max_age=7"
              - "--log_rotate_max_size=100"
              - "--log_rotate_max_backups=3"
```

The parameters mean:
- `log_rotate` - Path to the log file (enables file-based logging with rotation)
- `log_rotate_max_age` - Maximum number of days to retain old log files
- `log_rotate_max_size` - Maximum size in megabytes before rotation
- `log_rotate_max_backups` - Maximum number of old log files to keep

## Using emptyDir Volume Limits

A safety net that's worth setting up is the `emptyDir` volume with a size limit. This prevents any single pod from consuming unbounded disk space:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        volumes:
          - name: local-logs
            emptyDir:
              sizeLimit: 1Gi
        volumeMounts:
          - name: local-logs
            mountPath: /var/log/istiod
```

When the emptyDir hits its size limit, the kubelet will evict the pod. That's a blunt instrument, but it prevents disk exhaustion on the node.

## Log Rotation with Fluentd/Fluent Bit

If you're running a log collection agent like Fluent Bit (which most production clusters should), the agent itself can handle rotation at the collection level:

```yaml
# Fluent Bit configuration for Istio logs
[INPUT]
    Name              tail
    Path              /var/log/containers/*istio*.log
    Parser            json
    Tag               istio.*
    Refresh_Interval  5
    Rotate_Wait       30
    DB                /var/log/flb_istio.db

[FILTER]
    Name              kubernetes
    Match             istio.*
    Kube_URL          https://kubernetes.default.svc:443
    Kube_Tag_Prefix   istio.var.log.containers.

[OUTPUT]
    Name              forward
    Match             istio.*
    Host              log-aggregator.logging.svc
    Port              24224
```

Fluent Bit handles file rotation automatically through its tail input plugin. The `DB` setting keeps track of the read position even across log file rotations.

## Setting Resource Limits

Another way to indirectly control log growth is through resource limits on the Istio sidecar. If the sidecar has an ephemeral storage limit, it can't grow its logs beyond that:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          limits:
            ephemeral-storage: "1Gi"
          requests:
            ephemeral-storage: "256Mi"
```

## Monitoring Log Volume

Set up monitoring to catch log volume issues before they become problems:

```bash
# Check log file sizes on a node
kubectl debug node/my-node -it --image=busybox -- du -sh /var/log/containers/*istio*

# Check ephemeral storage usage for Istio pods
kubectl get pods -n istio-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.ephemeralContainerStatuses}{"\n"}{end}'

# Check disk usage on nodes
kubectl top nodes
```

## Recommended Setup

For most production environments, here's what I'd recommend:

1. Keep Istio logging to stdout (the default)
2. Configure kubelet log rotation with appropriate size limits
3. Run a log collection agent (Fluent Bit or similar) to ship logs off-node
4. Set ephemeral storage limits on Istio sidecars
5. Monitor node disk usage with alerts

This gives you multiple layers of protection against disk exhaustion while still retaining the logs you need for troubleshooting.

The key thing to remember is that log rotation for Istio isn't really an Istio-specific problem. It's a Kubernetes operations problem. The same log rotation mechanisms that work for your application containers work for Istio. Handle it at the platform level and you'll have a much more consistent and maintainable setup.
