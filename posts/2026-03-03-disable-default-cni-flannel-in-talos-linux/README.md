# How to Disable Default CNI (Flannel) in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CNI, Flannel, Networking, Kubernetes, Cilium, Calico

Description: Learn how to properly disable the default Flannel CNI in Talos Linux so you can install a custom CNI like Cilium or Calico for advanced networking features.

---

Talos Linux ships with Flannel as its default CNI plugin. While Flannel works well for basic networking, many production deployments need features that Flannel does not provide - network policy enforcement, eBPF-based networking, BGP peering, or advanced observability. To use a different CNI like Cilium, Calico, or Weave, you first need to disable the default Flannel CNI that Talos would otherwise install automatically.

This guide covers how to properly disable Flannel in Talos Linux and prepare your cluster for a custom CNI installation.

## Why Disable the Default CNI?

There are several reasons you might want to disable Flannel:

- **Network policies**: Flannel does not enforce Kubernetes NetworkPolicy resources. If you apply network policies with Flannel, they are silently ignored.
- **Performance**: eBPF-based CNIs like Cilium can outperform Flannel's iptables-based approach, especially under high connection counts.
- **Observability**: CNIs like Cilium provide deep traffic visibility through tools like Hubble.
- **BGP integration**: If you need to peer with your physical network routers, you need Calico or Cilium.
- **Layer 7 policies**: Only Cilium and Calico offer application-layer policy enforcement.
- **Encryption**: While Flannel has a WireGuard backend, Cilium and Calico offer more mature encryption options.

## Disabling Flannel in a New Cluster

The simplest approach is to disable Flannel before creating your cluster. In your Talos machine configuration, set the CNI name to "none":

```yaml
# Control plane machine config - disable default CNI
cluster:
  network:
    cni:
      name: none    # Prevents Talos from installing Flannel
    podSubnets:
      - 10.244.0.0/16    # Still define your pod CIDR
    serviceSubnets:
      - 10.96.0.0/12     # And service CIDR
```

This setting goes in both control plane and worker node configurations:

```bash
# Generate machine configs with custom CNI disabled
talosctl gen config my-cluster https://<api-endpoint>:6443 \
  --config-patch='[{"op": "add", "path": "/cluster/network/cni", "value": {"name": "none"}}]'
```

Or if you are editing existing config files:

```bash
# Apply the config to a control plane node
talosctl -n <cp-ip> apply-config --file controlplane.yaml

# Apply to worker nodes
talosctl -n <worker-ip> apply-config --file worker.yaml
```

## What Happens When CNI is Disabled

When you set `cni.name: none`, the following things happen during cluster bootstrap:

1. Talos does not create the Flannel DaemonSet
2. Talos does not deploy the Flannel ConfigMap
3. No CNI binaries are installed on the node
4. The kubelet starts but cannot schedule pods that need networking
5. Nodes appear as "NotReady" in kubectl because there is no CNI to report network readiness

```bash
# After bootstrapping with CNI disabled, nodes show NotReady
kubectl get nodes
# NAME     STATUS     ROLES           AGE   VERSION
# cp-01    NotReady   control-plane   1m    v1.29.0
# w-01     NotReady   <none>          1m    v1.29.0
```

This is expected. Nodes will become Ready once you install your custom CNI.

## Disabling Flannel on an Existing Cluster

If you have a running cluster with Flannel and want to switch to a different CNI, the process is more involved and will cause a brief networking outage.

### Step 1: Plan the Migration

Switching CNIs on a running cluster will disrupt pod networking. Plan for:

- Application downtime during the switch
- All pods will need to be restarted to get new IP addresses
- Any running jobs or stateful workloads should be gracefully stopped first

### Step 2: Cordon and Drain Nodes

```bash
# Cordon all nodes to prevent new pods from being scheduled
kubectl cordon <node-name>

# Drain workloads (repeat for each node)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

### Step 3: Remove Flannel

```bash
# Delete Flannel DaemonSet and related resources
kubectl delete namespace kube-flannel

# Clean up Flannel CNI configuration files
# On each node (via talosctl)
talosctl -n <node-ip> read /etc/cni/net.d/
```

### Step 4: Update Machine Configuration

```yaml
# Update the cluster config to disable CNI
cluster:
  network:
    cni:
      name: none
```

```bash
# Apply the updated config to each node
talosctl -n <node-ip> apply-config --file updated-config.yaml
```

### Step 5: Install the New CNI

Install your chosen CNI. For example, with Cilium:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<api-ip> \
  --set k8sServicePort=6443
```

### Step 6: Uncordon Nodes and Restart Pods

```bash
# Uncordon all nodes
kubectl uncordon <node-name>

# Restart all pods to get new network configuration
kubectl get pods --all-namespaces -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name --no-headers | while read ns name; do
  kubectl delete pod -n "$ns" "$name" --grace-period=30
done
```

## Disabling kube-proxy Too

If you are installing Cilium, which can replace kube-proxy, you should disable kube-proxy as well:

```yaml
# Disable both CNI and kube-proxy
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true
```

Without kube-proxy, Cilium handles all service routing using eBPF, which is more efficient. However, make sure you set the `kubeProxyReplacement=true` flag when installing Cilium.

If you are installing Calico instead, keep kube-proxy enabled because Calico works alongside kube-proxy rather than replacing it.

## Verifying CNI is Disabled

After applying the configuration, verify that Flannel is not running:

```bash
# Check for Flannel pods (should be empty)
kubectl get pods -n kube-flannel 2>/dev/null || echo "kube-flannel namespace does not exist"

# Check for CNI configuration files
talosctl -n <node-ip> ls /etc/cni/net.d/

# Check for Flannel interfaces (should not exist)
talosctl -n <node-ip> get links | grep flannel
```

## Common Issues After Disabling CNI

### Nodes Stuck in NotReady

This is expected when CNI is disabled. Install your custom CNI and nodes will become Ready:

```bash
# Check node conditions
kubectl describe node <node-name> | grep -A 5 "Conditions"

# The KubeletNotReady message should mention "network plugin"
```

### CoreDNS Pods Pending

CoreDNS cannot start without a CNI because it needs pod networking. This is a chicken-and-egg problem that resolves itself once the CNI is installed:

```bash
# Check CoreDNS status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# CoreDNS will show Pending until CNI is installed
```

### Control Plane Components Still Running

Even without a CNI, the Talos control plane components (etcd, kube-apiserver, kube-scheduler, kube-controller-manager) continue to run because they use host networking, not pod networking. This is by design and allows you to interact with the cluster via kubectl while installing the CNI.

```bash
# Control plane components should be running
kubectl get pods -n kube-system

# etcd, apiserver, scheduler, controller-manager use hostNetwork: true
```

## Using Config Patches for CNI Disable

If you want to disable the CNI using config patches (useful in automation), you can do it like this:

```bash
# Using strategic merge patch
talosctl gen config my-cluster https://cluster-api:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/network/cni", "value": {"name": "none"}},
    {"op": "add", "path": "/cluster/proxy", "value": {"disabled": true}}
  ]'
```

Or using a patch file:

```yaml
# cni-patch.yaml
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true
```

```bash
talosctl gen config my-cluster https://cluster-api:6443 \
  --config-patch-control-plane @cni-patch.yaml \
  --config-patch-worker @cni-patch.yaml
```

## Rollback: Re-enabling Flannel

If you need to go back to Flannel for any reason, update the machine config:

```yaml
# Re-enable Flannel
cluster:
  network:
    cni:
      name: flannel
  proxy:
    disabled: false    # Re-enable kube-proxy if it was disabled
```

Apply the config to all nodes and Talos will redeploy Flannel automatically. You will need to remove the custom CNI first to avoid conflicts.

## Conclusion

Disabling the default Flannel CNI in Talos Linux is a straightforward configuration change, but the timing matters. On a new cluster, just set `cni.name: none` before bootstrapping and install your preferred CNI immediately after. On an existing cluster, plan for a networking disruption and follow the drain-switch-uncordon pattern. The key thing to remember is that nodes will be NotReady and CoreDNS will be Pending until you install your replacement CNI, and that is perfectly normal behavior. Have your custom CNI installation ready to go before you pull the trigger on disabling Flannel.
