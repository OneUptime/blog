# How to Troubleshoot flannel CNI Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Flannel, CNI, Kubernetes, Networking, Troubleshooting

Description: Comprehensive guide to diagnosing and resolving flannel CNI issues on Talos Linux, including pod networking failures, VXLAN problems, and overlay configuration.

---

Flannel is the default Container Network Interface (CNI) plugin on Talos Linux. It creates an overlay network that allows pods on different nodes to communicate with each other. When flannel has problems, pod networking breaks down - pods cannot reach pods on other nodes, services become unreachable, and the cluster becomes partially or fully non-functional. This guide covers the most common flannel issues on Talos Linux and how to resolve them.

## How Flannel Works on Talos Linux

Flannel runs as a DaemonSet in the `kube-system` namespace. It allocates a subnet from the pod CIDR to each node and creates either VXLAN tunnels or host-gw routes between nodes. On Talos Linux, VXLAN is the default backend.

Each flannel pod:

1. Uses the Kubernetes API as the subnet manager for node pod CIDR information
2. Creates a `flannel.1` VXLAN interface on the host
3. Sets up routes so that traffic destined for other nodes' pod subnets goes through the VXLAN tunnel
4. Configures a CNI configuration file that the kubelet uses when creating new pods

## Checking Flannel Status

Start by verifying that flannel pods are running on every node:

```bash
# Check flannel DaemonSet status

kubectl -n kube-system get daemonset kube-flannel

# Check individual flannel pods
kubectl -n kube-system get pods -l k8s-app=flannel -o wide

# Verify there is one flannel pod per node
kubectl get nodes --no-headers | wc -l
kubectl -n kube-system get pods -l k8s-app=flannel --no-headers | wc -l
```

If the numbers do not match, some nodes are not running flannel, and those nodes will have networking problems.

## Issue: Flannel Pod Not Starting

If a flannel pod is not running on a node, describe it to see why:

```bash
# Describe the failing flannel pod
kubectl -n kube-system describe pod <flannel-pod-name>
```

Common reasons:

**Node taint preventing scheduling:**

```bash
# Check if the node has taints
kubectl describe node <node-name> | grep Taints
```

The flannel DaemonSet should have tolerations for common taints. If you added custom taints, you may need to add matching tolerations to the flannel DaemonSet.

**Image pull failure:**

```bash
# Check flannel pod events for image pull errors
kubectl -n kube-system describe pod <flannel-pod-name> | grep -A5 Events
```

If the flannel image cannot be pulled, check the node's internet connectivity and registry configuration.

## Issue: Flannel Cannot Find the Correct Interface

Flannel needs to know which network interface to use for inter-node communication. If it picks the wrong interface, VXLAN tunnels will not work:

```bash
# Check flannel logs for interface selection
kubectl -n kube-system logs <flannel-pod-name> | grep -i interface
```

On Talos Linux, especially on machines with multiple network interfaces, flannel may pick the wrong one. For Talos-managed flannel, configure the correct interface in the Talos machine config:

```yaml
cluster:
  network:
    cni:
      name: flannel
      flannel:
        extraArgs:
          - --iface=eth0
```

Use the interface name for your environment. You can also use `--iface-can-reach=<ip-address>` to let flannel select the interface that can reach a specific address:

```yaml
cluster:
  network:
    cni:
      name: flannel
      flannel:
        extraArgs:
          - --iface-can-reach=192.168.1.1
```

After applying the machine config change, restart the flannel DaemonSet if the pods do not roll automatically:

```bash
# Restart flannel
kubectl -n kube-system rollout restart daemonset kube-flannel
```

## Issue: Pod-to-Pod Communication Between Nodes Fails

If pods on the same node can communicate but pods on different nodes cannot:

```bash
# Test cross-node pod communication
kubectl run test1 --image=busybox --restart=Never -- sleep 3600
kubectl run test2 --image=busybox --restart=Never -- sleep 3600

# Make sure they are on different nodes
kubectl get pods -o wide

# Test connectivity
kubectl exec test1 -- ping -c 3 <test2-pod-ip>
```

If this fails, check the VXLAN interface on both nodes:

```bash
# Check if the flannel VXLAN interface exists
talosctl -n <node-1-ip> get links | grep flannel
talosctl -n <node-2-ip> get links | grep flannel
```

If the `flannel.1` interface is missing, flannel is not creating it. Check the flannel logs for errors:

```bash
# View flannel logs
kubectl -n kube-system logs <flannel-pod-on-node-1> --tail=100
```

## Issue: VXLAN Port Blocked

Talos-managed flannel configures VXLAN to use UDP port 4789. If this port is blocked between nodes, the overlay network will not function:

```bash
# From a debug pod on one node, test connectivity to VXLAN port on another
kubectl run nettest --image=nicolaka/netshoot --restart=Never -- sleep 3600
kubectl exec nettest -- nc -zuv <other-node-ip> 4789
```

If port 4789 is blocked, update your firewall rules or security groups to allow UDP traffic on this port between all cluster nodes.

## Issue: MTU Mismatch

MTU mismatches cause subtle failures where small packets work but larger ones do not. Connections hang during TLS handshakes or when transferring data:

```bash
# Check the MTU on the flannel interface
talosctl -n <node-ip> get links | grep flannel
```

The flannel VXLAN interface is commonly configured with an MTU 50 bytes smaller than the physical interface (to account for VXLAN encapsulation overhead). If your physical network has an MTU of 1500, the flannel interface is commonly 1450.

Talos does not expose flannel MTU as a machine config field for the managed flannel deployment. If you need to set a custom flannel MTU, disable the managed CNI and deploy a custom flannel manifest with the MTU in the `net-conf.json` backend configuration:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "MTU": 1450
  }
}
```

After changing the manifest, restart the flannel pods:

```bash
# Restart flannel
kubectl -n kube-system rollout restart daemonset kube-flannel
```

## Issue: Subnet Overlap

If the pod CIDR (configured in flannel) overlaps with the node network, routing conflicts will cause connectivity issues:

```bash
# Check the pod CIDR
kubectl -n kube-system get configmap kube-flannel-cfg -o jsonpath='{.data.net-conf\.json}'

# Check node IPs
kubectl get nodes -o wide
```

If the pod network (e.g., 10.244.0.0/16) overlaps with the node network (e.g., 10.244.1.0/24), you need to change one of them. Changing the pod CIDR after cluster creation requires recreating the cluster, so plan your network ranges carefully during initial setup.

## Issue: CNI Configuration File Missing

If flannel is running but new pods fail to get network configuration, the CNI config file might be missing:

```bash
# Check if the CNI configuration exists
talosctl -n <node-ip> list /etc/cni/net.d/
```

You should see a file like `10-flannel.conflist`. If it is missing, flannel may not have the correct permissions or the CNI directory may be misconfigured. Restart the flannel pod on that node:

```bash
# Delete the flannel pod to force a restart on the affected node
kubectl -n kube-system delete pod <flannel-pod-on-affected-node>
```

## Issue: Node Pod CIDR Changed

With Talos-managed flannel, Kubernetes node PodCIDR assignments are the source of truth for each node's pod subnet:

```bash
# Check subnet assignments
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

This is usually stable, but if a node is rebuilt or its PodCIDR changes, existing pods on the node may have IPs from the old subnet. Restarting the pods will assign new IPs from the current subnet.

## Switching from Flannel to Another CNI

If flannel is consistently giving you problems, Talos Linux supports other CNI plugins like Cilium or Calico. To switch to a CNI that is distributed as static manifests, configure the manifest URL in the machine config:

```yaml
cluster:
  network:
    cni:
      name: custom
      urls:
        - https://example.com/path/to/cni-manifest.yaml
```

Or install the CNI manually with Helm or kubectl after disabling the default, which is the common Talos approach for Cilium:

```yaml
cluster:
  network:
    cni:
      name: none  # Disable default flannel
```

Then install your preferred CNI using Helm or kubectl.

## Summary

Flannel issues on Talos Linux most commonly involve wrong interface selection, blocked VXLAN ports, MTU mismatches, or subnet overlaps. Start by checking that all flannel pods are running, then verify VXLAN interface creation and inter-node connectivity on UDP port 4789. For persistent issues, check the flannel logs and ConfigMap configuration. If flannel continues to be problematic, consider switching to a more feature-rich CNI like Cilium.
