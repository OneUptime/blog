# How to Disable Cluster Discovery in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Discovery, Security, Configuration, Air-Gapped

Description: Learn when and how to disable cluster discovery in Talos Linux, including the implications for KubeSpan and cluster operations.

---

Cluster discovery in Talos Linux is enabled by default and provides automatic node registration and peer discovery. But there are valid reasons to disable it, whether for security, compliance, or because you are running in an air-gapped environment. This guide explains how to disable cluster discovery properly and what to expect when you do.

## Why Disable Discovery

The most common reasons to disable cluster discovery include:

**Security policy compliance**: Some organizations prohibit cluster nodes from communicating with external services. The default discovery endpoint at `discovery.talos.dev` is a public service, and security teams may require that nodes never contact it.

**Air-gapped environments**: Networks completely isolated from the internet cannot reach the public discovery service. While you could self-host the service, some environments prefer to avoid the extra infrastructure.

**Minimal attack surface**: Reducing the number of external connections a cluster makes reduces the potential attack surface. Disabling discovery removes one external dependency.

**Privacy**: Although discovery data is encrypted, some organizations do not want even encrypted metadata about their cluster to exist on an external service.

## Disabling the Service Registry

The service registry is the component that communicates with the external discovery endpoint. To disable it while keeping the Kubernetes registry:

```yaml
# disable-service-registry.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: false
```

Apply this to your nodes:

```bash
# Apply to all nodes
talosctl patch machineconfig \
  --patch @disable-service-registry.yaml \
  --nodes <node-1-ip>,<node-2-ip>,<node-3-ip>
```

With this configuration, nodes will not contact the external discovery service. They will still use the Kubernetes registry to discover each other, but only after Kubernetes is running.

## Disabling Both Registries

To completely disable all discovery:

```yaml
# disable-all-discovery.yaml
cluster:
  discovery:
    enabled: false
```

Or more explicitly:

```yaml
# disable-all-registries.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: true
```

```bash
talosctl patch machineconfig \
  --patch @disable-all-discovery.yaml \
  --nodes <node-ip>
```

## Impact on KubeSpan

This is the most significant consequence of disabling discovery. KubeSpan depends on the discovery service to find peer endpoints and establish WireGuard tunnels. If you disable discovery, KubeSpan will not work.

```bash
# Check if KubeSpan is affected
talosctl get kubespanpeerstatus --nodes <node-ip>
# With discovery disabled, this will show no peers
```

If you need both disabled discovery and encrypted node-to-node traffic, consider alternatives:

1. Use your CNI's built-in encryption (Cilium supports WireGuard encryption at the CNI level)
2. Set up WireGuard manually outside of Talos (possible but defeats the purpose of Talos's immutability)
3. Self-host the discovery service on your private network

```yaml
# If you need KubeSpan without the public discovery service,
# self-host the discovery service and point to it
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.corp.example.com/
      kubernetes:
        disabled: false
```

## Disabling Discovery on an Existing Cluster

If you want to disable discovery on a running cluster, plan the transition carefully:

### Step 1: Check Current Dependencies

```bash
# Check if KubeSpan is in use
talosctl get kubespanpeerstatus --nodes <node-ip>

# Check discovery members
talosctl get discoveredmembers --nodes <node-ip>
```

### Step 2: Disable KubeSpan First (If Enabled)

If KubeSpan is running, disable it before disabling discovery:

```yaml
# disable-kubespan.yaml
machine:
  network:
    kubespan:
      enabled: false
```

```bash
talosctl patch machineconfig \
  --patch @disable-kubespan.yaml \
  --nodes <all-node-ips>
```

### Step 3: Disable Discovery

```yaml
# disable-discovery.yaml
cluster:
  discovery:
    enabled: false
```

```bash
talosctl patch machineconfig \
  --patch @disable-discovery.yaml \
  --nodes <all-node-ips>
```

### Step 4: Verify Everything Still Works

```bash
# Check node status
kubectl get nodes

# Check that pods are running
kubectl get pods -A

# Verify etcd health
talosctl etcd members --nodes <cp-node-ip>
```

## Impact on Cluster Bootstrap

Discovery plays a role during initial cluster bootstrapping, especially for multi-node control planes. Without the service registry, the bootstrapping process changes:

For single control plane node clusters, discovery is not critical for bootstrap because there is only one node to coordinate.

For multi-node control planes, you need to make sure control plane nodes can find each other through other means. The machine configuration includes the control plane endpoint, which nodes use to find the API server. Once the first control plane node is bootstrapped and the API server is running, other nodes join through the Kubernetes API:

```yaml
# The control plane endpoint in machine config handles bootstrap
cluster:
  controlPlane:
    endpoint: https://10.0.0.10:6443
```

## Partially Disabling Discovery

You can take a middle-ground approach by disabling only the external service registry while keeping the Kubernetes registry:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: false
```

This gives you the benefits of reduced external communication while maintaining discovery functionality once Kubernetes is running. The trade-off is that initial bootstrap cannot use discovery (since Kubernetes is not running yet), but subsequent node additions work fine.

## Verifying Discovery Is Disabled

After disabling, confirm the change:

```bash
# Check the machine config
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A15 "discovery:"

# Verify no discovery members are reported
talosctl get discoveredmembers --nodes <node-ip>
# Should return nothing or an error

# Check controller logs to confirm discovery is not running
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery
```

## Monitoring Without Discovery

Without discovery, you lose some observability into cluster membership at the Talos level. You can compensate with Kubernetes-level monitoring:

```bash
# Monitor node membership through Kubernetes
kubectl get nodes --watch

# Set up alerts for node readiness
# Example Prometheus alert rule
```

```yaml
# alert for missing nodes
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-alerts
spec:
  groups:
    - name: nodes
      rules:
        - alert: NodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 5m
          labels:
            severity: critical
```

## Re-Enabling Discovery

If you decide to re-enable discovery later:

```yaml
# re-enable-discovery.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
      kubernetes:
        disabled: false
```

```bash
talosctl patch machineconfig \
  --patch @re-enable-discovery.yaml \
  --nodes <all-node-ips>
```

Nodes will begin registering with the discovery service within a few seconds of the config being applied. Other nodes will discover them on their next polling cycle.

Disabling cluster discovery is a straightforward configuration change, but its implications ripple through several features. Make sure you understand the dependencies, especially on KubeSpan, before disabling. For most clusters, keeping at least the Kubernetes registry enabled provides a good balance between security and functionality.
