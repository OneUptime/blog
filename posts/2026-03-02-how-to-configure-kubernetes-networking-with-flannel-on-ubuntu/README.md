# How to Configure Kubernetes Networking with Flannel on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Flannel, Networking, CNI

Description: Detailed guide to configuring Flannel as the CNI plugin for Kubernetes on Ubuntu, covering installation, backend modes, troubleshooting, and network policy basics.

---

Kubernetes does not ship with a built-in pod networking solution. Instead, it defines the Container Network Interface (CNI) specification and leaves the choice of implementation to operators. Flannel is one of the oldest and most straightforward CNI plugins - it creates an overlay network that allows pods on different nodes to communicate as if they were on the same subnet.

## How Flannel Works

Flannel assigns each node a subnet from a larger CIDR block (typically `10.244.0.0/16`). Pods on a node get IPs from that node's subnet. Traffic between pods on different nodes is encapsulated and forwarded through one of several backend mechanisms:

- **VXLAN** (default): Encapsulates pod traffic in UDP packets. Works across most network environments including cloud VPCs.
- **host-gw**: Adds static routes directly - faster than VXLAN but requires all nodes to be on the same L2 network segment.
- **WireGuard**: Encrypted overlay using WireGuard tunnels, useful when network encryption is required.

For most Ubuntu deployments, VXLAN is the right choice. host-gw is worth considering for bare metal clusters where all nodes share a switch.

## Prerequisites

A Kubernetes cluster initialized with kubeadm where you have not yet applied a CNI plugin. The cluster will show nodes in `NotReady` state until CNI is installed.

```bash
# Verify nodes are waiting for CNI
kubectl get nodes
# NAME           STATUS     ROLES           AGE
# k8s-control    NotReady   control-plane   2m
# k8s-worker-1   NotReady   <none>          1m
```

Flannel requires that the cluster was initialized with `--pod-network-cidr=10.244.0.0/16`. If you used a different CIDR during `kubeadm init`, you will need to adjust the Flannel configuration to match.

## Installing Flannel

The simplest installation uses the official Flannel manifest:

```bash
# Apply the Flannel CNI manifest
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Watch flannel pods start up
kubectl get pods -n kube-flannel --watch

# Once flannel-ds pods are Running on each node, nodes should become Ready
kubectl get nodes
```

### Installing a Specific Flannel Version

For production, pin to a specific version rather than using latest:

```bash
# Download the manifest for version 0.24.0
curl -LO https://github.com/flannel-io/flannel/releases/download/v0.24.0/kube-flannel.yml

# Review the manifest before applying
grep -E 'image:|flannel' kube-flannel.yml

# Apply it
kubectl apply -f kube-flannel.yml
```

## Configuring the Backend Mode

Flannel's configuration is stored in a ConfigMap in the `kube-flannel` namespace. To change the backend mode, edit this ConfigMap.

```bash
# View the current Flannel configuration
kubectl get configmap kube-flannel-cfg -n kube-flannel -o yaml
```

The relevant section looks like:

```yaml
net-conf.json: |
  {
    "Network": "10.244.0.0/16",
    "Backend": {
      "Type": "vxlan"
    }
  }
```

### Switching to host-gw Backend

For bare metal clusters where nodes share a Layer 2 network:

```bash
# Edit the configmap
kubectl edit configmap kube-flannel-cfg -n kube-flannel
```

Change the Backend section:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "host-gw"
  }
}
```

After saving, restart the Flannel DaemonSet to apply the change:

```bash
kubectl rollout restart daemonset kube-flannel-ds -n kube-flannel
```

### Enabling VXLAN with DirectRouting

DirectRouting is a hybrid mode - it uses host-gw for nodes on the same subnet and falls back to VXLAN for nodes across subnets:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "DirectRouting": true
  }
}
```

## Verifying Flannel Operation

### Check Pod-to-Pod Communication

```bash
# Deploy two pods on different nodes
kubectl run pod1 --image=busybox --command -- sleep 3600
kubectl run pod2 --image=busybox --command -- sleep 3600

# Get pod IPs
kubectl get pods -o wide

# Test connectivity from pod1 to pod2's IP
kubectl exec pod1 -- ping -c 3 <pod2-ip>

# Clean up
kubectl delete pod pod1 pod2
```

### Inspect Flannel on a Node

SSH into a worker node and examine the network setup Flannel created:

```bash
# View the flannel interface (VXLAN creates a flannel.1 interface)
ip link show flannel.1
ip addr show flannel.1

# Check routes Flannel added
ip route show | grep flannel

# View the subnet Flannel assigned to this node
cat /run/flannel/subnet.env
```

### Check Flannel Logs

```bash
# View logs from a specific Flannel pod
kubectl logs -n kube-flannel -l app=flannel --tail=50

# Follow logs in real time
kubectl logs -n kube-flannel -l app=flannel -f
```

## Firewall Configuration

Flannel requires specific ports to be open between nodes. If you are using UFW:

```bash
# Allow VXLAN traffic (UDP 8472)
sudo ufw allow 8472/udp comment 'Flannel VXLAN'

# Allow Flannel health check
sudo ufw allow 8285/udp comment 'Flannel health'

# Allow pod network CIDR through UFW
sudo ufw allow from 10.244.0.0/16

# Reload UFW
sudo ufw reload
```

## Custom Pod CIDR Configuration

If you need a different pod CIDR (for example, to avoid conflicts with existing network ranges):

During `kubeadm init`, specify the custom CIDR:

```bash
sudo kubeadm init --pod-network-cidr=172.16.0.0/16
```

Then modify the Flannel manifest before applying:

```bash
# Download the manifest
curl -LO https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Replace the default CIDR with your custom one
sed -i 's|10.244.0.0/16|172.16.0.0/16|g' kube-flannel.yml

# Apply the modified manifest
kubectl apply -f kube-flannel.yml
```

## Troubleshooting Common Issues

### Pods Stuck in ContainerCreating

```bash
# Check events on the stuck pod
kubectl describe pod <pod-name>

# Common error: CNI plugin not initialized
# Check flannel pod on the same node
kubectl get pods -n kube-flannel -o wide

# If flannel pod is CrashLoopBackOff, check its logs
kubectl logs -n kube-flannel <flannel-pod-name>
```

### Cross-Node Pods Cannot Communicate

```bash
# On a worker node, check if the route to the remote pod subnet exists
ip route show | grep 10.244

# If missing, check that Flannel is running and the node is in Ready state
kubectl get nodes

# Verify VXLAN interface is up
ip link show flannel.1

# Check for dropped packets
netstat -su | grep -i 'receive errors\|bad'
```

### IP Address Exhaustion

Each node gets a /24 subnet by default, supporting 254 pods per node. For very large clusters, adjust the SubnetLen in the Flannel config:

```json
{
  "Network": "10.244.0.0/16",
  "SubnetLen": 26,
  "Backend": {
    "Type": "vxlan"
  }
}
```

This gives each node a /26 (62 usable IPs) but allows more nodes to be supported from the same /16 pool.

## Upgrading Flannel

When upgrading Kubernetes, you often need to upgrade Flannel too:

```bash
# Apply the new Flannel manifest
kubectl apply -f https://github.com/flannel-io/flannel/releases/download/vX.Y.Z/kube-flannel.yml

# Watch the rolling update
kubectl rollout status daemonset kube-flannel-ds -n kube-flannel

# Verify the new version is running
kubectl get pods -n kube-flannel -o jsonpath='{.items[*].spec.containers[*].image}'
```

Flannel remains a solid choice for clusters where simplicity and stability matter more than advanced network policy features. For clusters requiring network policies, consider Calico or Cilium, which offer richer policy support while still providing similar overlay networking capabilities.
