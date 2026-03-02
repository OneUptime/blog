# How to Set Up Flannel Networking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Flannel, Kubernetes, Networking, Containers

Description: Learn how to set up Flannel as a CNI network overlay for Kubernetes clusters on Ubuntu, covering installation, configuration, and the different backend options.

---

Flannel is one of the simplest Kubernetes CNI (Container Network Interface) plugins to deploy. It creates a flat overlay network that gives every pod in your cluster a unique IP address, allowing pods to communicate with each other across nodes without NAT. If you're building a bare-metal Kubernetes cluster or need a network plugin that "just works" with minimal configuration, Flannel is worth considering.

## How Flannel Works

Flannel runs as a DaemonSet on every Kubernetes node. Each node gets a subnet from the cluster-wide CIDR range (e.g., a node might get `10.244.1.0/24` from the cluster CIDR `10.244.0.0/16`). Flannel then creates a virtual network interface on each node and configures routing so that pods on one node can reach pods on other nodes.

The actual packet transport between nodes is handled by a "backend":
- `vxlan` - Encapsulates pod traffic in VXLAN (UDP) packets. Works on most networks. Default.
- `host-gw` - Uses the host as a gateway, routing traffic directly. Faster but requires all nodes to be on the same L2 subnet.
- `wireguard` - Encrypts inter-node traffic using WireGuard. Good for clusters spanning multiple networks.
- `udp` - Fallback software backend. Slow, for debugging only.

## Prerequisites

This guide assumes you have a Kubernetes cluster initialized with kubeadm. If not:

```bash
# Install kubeadm, kubelet, kubectl
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# Initialize the cluster with Flannel's default CIDR
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Configure kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

The `--pod-network-cidr=10.244.0.0/16` flag is important - Flannel expects this specific CIDR by default.

## Installing Flannel

### Using the Official YAML Manifest

```bash
# Apply the Flannel manifest
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Watch Flannel pods start up
kubectl get pods -n kube-flannel -w
```

The manifest creates:
- A `kube-flannel` namespace
- Necessary RBAC roles and bindings
- A DaemonSet that runs `flanneld` on every node
- A ConfigMap with the network configuration

### Verify the Installation

```bash
# Check Flannel DaemonSet status
kubectl get ds -n kube-flannel

# Check Flannel pods
kubectl get pods -n kube-flannel

# Check node status (should become Ready after Flannel is running)
kubectl get nodes

# View Flannel logs on a node
kubectl logs -n kube-flannel -l app=flannel
```

## Viewing the Flannel Configuration

```bash
# View the ConfigMap Flannel uses
kubectl get cm -n kube-flannel kube-flannel-cfg -o yaml
```

The default configuration:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan"
  }
}
```

## Changing the Backend

### Editing the ConfigMap

```bash
kubectl edit cm -n kube-flannel kube-flannel-cfg
```

Or apply a modified manifest:

```yaml
# flannel-hostgw.yaml (partial)
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "host-gw"
      }
    }
```

```bash
kubectl apply -f flannel-hostgw.yaml

# Restart the DaemonSet to pick up changes
kubectl rollout restart ds/kube-flannel-ds -n kube-flannel
```

### Using the host-gw Backend

The `host-gw` backend is faster than vxlan because it doesn't encapsulate packets:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "host-gw"
  }
}
```

Requirements for host-gw:
- All nodes must be on the same L2 network (same VLAN/subnet)
- IP forwarding must be enabled on all nodes

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-forward.conf
sudo sysctl -p /etc/sysctl.d/99-forward.conf
```

### Using the WireGuard Backend (Encrypted)

For clusters where inter-node traffic crosses untrusted networks:

```bash
# Install WireGuard on all nodes
sudo apt install wireguard
```

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "wireguard"
  }
}
```

## What Flannel Creates on the Host

Understanding what Flannel creates helps with troubleshooting:

```bash
# View the flannel network interface
ip link show flannel.1
ip addr show flannel.1

# View routes Flannel created
ip route show | grep flannel
# Each node's pod CIDR should appear as a route

# View the VXLAN FDB (with vxlan backend)
bridge fdb show dev flannel.1

# View the CNI configuration Flannel wrote
cat /etc/cni/net.d/10-flannel.conflist
```

The `/etc/cni/net.d/10-flannel.conflist` file is written by Flannel and used by kubelet when starting pods:

```json
{
  "name": "cbr0",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "flannel",
      "delegate": {
        "hairpinMode": true,
        "isDefaultGateway": true
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    }
  ]
}
```

## Deploying a Test Application

After Flannel is running, test pod networking:

```bash
# Deploy test pods
kubectl create deployment nginx --image=nginx --replicas=2
kubectl expose deployment nginx --port=80

# Get the pod IPs
kubectl get pods -o wide

# Test pod-to-pod communication (should work across nodes)
kubectl run test --image=busybox --restart=Never --rm -it -- \
  wget -qO- http://nginx

# Test that pods from different nodes can communicate
POD1=$(kubectl get pods -l app=nginx -o jsonpath='{.items[0].status.podIP}')
kubectl run test --image=busybox --restart=Never --rm -it -- \
  ping -c 3 $POD1
```

## Troubleshooting Flannel

### Pods Stuck in ContainerCreating

```bash
# Check kubelet logs
sudo journalctl -u kubelet -n 50

# Check Flannel logs
kubectl logs -n kube-flannel -l app=flannel

# Check CNI config exists
ls /etc/cni/net.d/

# Common fix: check that the flannel binary exists
ls /opt/cni/bin/flannel
```

### Pods Cannot Communicate Across Nodes

```bash
# Verify flannel.1 interface exists on both nodes
ip link show flannel.1

# Check that routes exist for other nodes' pod CIDRs
ip route show | grep flannel

# Test connectivity between node IPs
ping <other-node-ip>

# Check that VXLAN traffic isn't being blocked
# Flannel's vxlan backend uses UDP port 8472
sudo ufw status
sudo iptables -L -n | grep 8472

# Allow VXLAN traffic if blocked
sudo ufw allow 8472/udp
```

### Wrong Pod CIDR

If Flannel is using a different CIDR than what kubeadm was initialized with:

```bash
# Check what kubeadm configured
kubectl cluster-info dump | grep -m 1 cluster-cidr

# Check Flannel's configuration
kubectl get cm -n kube-flannel kube-flannel-cfg -o jsonpath='{.data.net-conf\.json}'
```

They must match. If they don't, you'll need to either reinitialize the cluster or update Flannel's ConfigMap.

## Network Policy Limitations

Flannel itself does not implement Kubernetes NetworkPolicy. If you need to enforce network policies (restricting which pods can communicate), you have two options:

1. Replace Flannel with a CNI that supports NetworkPolicy, like Calico
2. Add Calico's network policy engine on top of Flannel:

```bash
# Install Calico for policy enforcement only (not networking)
kubectl apply -f https://docs.projectcalico.org/manifests/canal.yaml
# Canal is Flannel + Calico policy engine combined
```

## Removing Flannel

```bash
# Remove the Flannel DaemonSet and related resources
kubectl delete -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# On each node, clean up the interfaces and routes
sudo ip link delete flannel.1
sudo ip link delete cni0

# Remove Flannel CNI config
sudo rm /etc/cni/net.d/10-flannel.conflist

# Remove allocated subnets
sudo rm -rf /var/lib/cni/flannel/
```

Flannel's simplicity is both its strength and its limitation. It's the right choice for straightforward clusters where all nodes can reach each other directly and you don't need network policy enforcement. For more complex requirements, Calico or Cilium offer more features at the cost of more configuration.
