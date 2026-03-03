# How to Troubleshoot flannel CNI Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Flannel, CNI, Kubernetes, Networking, Troubleshooting

Description: Comprehensive guide to diagnosing and resolving flannel CNI issues on Talos Linux, including pod networking failures, VXLAN problems, and overlay configuration.

---

Flannel is the default Container Network Interface (CNI) plugin on Talos Linux. It creates an overlay network that allows pods on different nodes to communicate with each other. When flannel has problems, pod networking breaks down - pods cannot reach pods on other nodes, services become unreachable, and the cluster becomes partially or fully non-functional. This guide covers the most common flannel issues on Talos Linux and how to resolve them.

## How Flannel Works on Talos Linux

Flannel runs as a DaemonSet in the `kube-system` namespace. It allocates a subnet from the pod CIDR to each node and creates either VXLAN tunnels or host-gateway routes between nodes. On Talos Linux, VXLAN is the default backend.

Each flannel pod:

1. Registers the node's pod subnet with etcd (through the Kubernetes API)
2. Creates a `flannel.1` VXLAN interface on the host
3. Sets up routes so that traffic destined for other nodes' pod subnets goes through the VXLAN tunnel
4. Configures a CNI configuration file that the kubelet uses when creating new pods

## Checking Flannel Status

Start by verifying that flannel pods are running on every node:

```bash
# Check flannel DaemonSet status
kubectl -n kube-system get daemonset kube-flannel-ds

# Check individual flannel pods
kubectl -n kube-system get pods -l app=flannel -o wide

# Verify there is one flannel pod per node
kubectl get nodes --no-headers | wc -l
kubectl -n kube-system get pods -l app=flannel --no-headers | wc -l
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

On Talos Linux, especially on machines with multiple network interfaces, flannel may pick the wrong one. Configure the correct interface in the flannel ConfigMap:

```bash
# Edit the flannel ConfigMap
kubectl -n kube-system get configmap kube-flannel-cfg -o yaml
```

Look for the `net-conf.json` section and the flannel arguments. You can specify the interface:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan"
  }
}
```

And in the DaemonSet, add the `--iface` argument:

```bash
# Edit the flannel DaemonSet
kubectl -n kube-system edit daemonset kube-flannel-ds
```

Add `--iface=eth0` (or your correct interface name) to the container args.

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

VXLAN uses UDP port 8472 by default. If this port is blocked between nodes, the overlay network will not function:

```bash
# From a debug pod on one node, test connectivity to VXLAN port on another
kubectl run nettest --image=nicolaka/netshoot --restart=Never -- sleep 3600
kubectl exec nettest -- nc -zuv <other-node-ip> 8472
```

If port 8472 is blocked, update your firewall rules or security groups to allow UDP traffic on this port between all cluster nodes.

## Issue: MTU Mismatch

MTU mismatches cause subtle failures where small packets work but larger ones do not. Connections hang during TLS handshakes or when transferring data:

```bash
# Check the MTU on the flannel interface
talosctl -n <node-ip> get links | grep flannel
```

The flannel VXLAN interface should have an MTU 50 bytes smaller than the physical interface (to account for VXLAN encapsulation overhead). If your physical network has an MTU of 1500, the flannel interface should be 1450.

Configure the MTU in the flannel ConfigMap:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "MTU": 1450
  }
}
```

After changing the ConfigMap, restart the flannel pods:

```bash
# Restart flannel
kubectl -n kube-system rollout restart daemonset kube-flannel-ds
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
talosctl -n <node-ip> ls /etc/cni/net.d/
```

You should see a file like `10-flannel.conflist`. If it is missing, flannel may not have the correct permissions or the CNI directory may be misconfigured. Restart the flannel pod on that node:

```bash
# Delete the flannel pod to force a restart on the affected node
kubectl -n kube-system delete pod <flannel-pod-on-affected-node>
```

## Issue: Flannel Subnet Lease Expired

Flannel leases subnets for each node. If a lease expires (which can happen if the node was offline for a long time), the node may get a different subnet when it comes back:

```bash
# Check subnet assignments
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

This is usually handled automatically, but existing pods on the node may have IPs from the old subnet. Restarting the pods will assign new IPs from the current subnet.

## Switching from Flannel to Another CNI

If flannel is consistently giving you problems, Talos Linux supports other CNI plugins like Cilium or Calico. To switch, configure the CNI in the machine config:

```yaml
cluster:
  network:
    cni:
      name: custom
      urls:
        - https://raw.githubusercontent.com/cilium/cilium/main/install/kubernetes/quick-install.yaml
```

Or install the CNI manually after disabling the default:

```yaml
cluster:
  network:
    cni:
      name: none  # Disable default flannel
```

Then install your preferred CNI using Helm or kubectl.

## Summary

Flannel issues on Talos Linux most commonly involve wrong interface selection, blocked VXLAN ports, MTU mismatches, or subnet overlaps. Start by checking that all flannel pods are running, then verify VXLAN interface creation and inter-node connectivity on UDP port 8472. For persistent issues, check the flannel logs and ConfigMap configuration. If flannel continues to be problematic, consider switching to a more feature-rich CNI like Cilium.
