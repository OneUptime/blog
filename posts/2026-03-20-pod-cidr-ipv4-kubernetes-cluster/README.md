# How to Configure Pod CIDR Range for IPv4 in a Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv4, Pod CIDR, CNI, Networking, Kubeadm

Description: Set the IPv4 Pod CIDR range during Kubernetes cluster initialization and understand how it is allocated across nodes by the controller manager.

The Pod CIDR defines the IPv4 address pool from which Kubernetes assigns addresses to pods. It must not overlap with host network ranges or service CIDRs, and must be large enough to accommodate the expected number of pods.

## Planning the Pod CIDR

```text
Recommended: 10.244.0.0/16 (default for Flannel)
Alternative: 192.168.0.0/16 (common default for Calico manifests)
Custom:      10.100.0.0/16 (use any private range not in use)

With /16 Pod CIDR and the default /24 per-node allocation:
- Total addresses: 65,536
- Addresses per node block: 256 (~254 usable in a /24)
- Maximum node CIDR blocks: 256
- Actual pods per node also depend on kubelet maxPods (110 by default) and CNI behavior
```

## Setting Pod CIDR with kubeadm

```bash
# Create a kubeadm configuration file

cat > kubeadm-config.yaml << 'EOF'
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  # IPv4 CIDR for pod addresses
  podSubnet: "10.244.0.0/16"
  # IPv4 CIDR for service ClusterIP addresses
  serviceSubnet: "10.96.0.0/12"
  dnsDomain: "cluster.local"
EOF

# Initialize the cluster with the configuration
sudo kubeadm init --config kubeadm-config.yaml
```

Or pass directly via flags:

```bash
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --service-cidr=10.96.0.0/12
```

## Verifying the Pod CIDR

```bash
# Check the cluster configuration
kubectl get cm kubeadm-config -n kube-system -o yaml | grep -A5 networking

# Check kube-controller-manager arguments
kubectl get pod -n kube-system kube-controller-manager-<node> -o yaml | \
  grep -i cidr

# View node CIDR allocations
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

## Per-Node CIDR Allocation

When kubeadm is given a Pod CIDR, it configures the kube-controller-manager to carve the cluster Pod CIDR into per-node blocks. With the default IPv4 mask size, these are /24 blocks:

```bash
# Check what CIDR is assigned to a specific node
kubectl get node worker-1 -o jsonpath='{.spec.podCIDR}'
# Example: 10.244.1.0/24

kubectl get node worker-2 -o jsonpath='{.spec.podCIDR}'
# Example: 10.244.2.0/24
```

## What Happens After cluster init

After setting the Pod CIDR, install a CNI plugin and make sure its configured pod range matches:

```bash
# For Flannel, this manifest assumes podSubnet 10.244.0.0/16
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
# If you chose a different podSubnet, download the manifest and change the
# Network value in net-conf.json before applying it.

# For Calico, set CALICO_IPV4POOL_CIDR in the manifest before the first apply
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/calico.yaml
# Edit calico.yaml so CALICO_IPV4POOL_CIDR matches your podSubnet
kubectl apply -f calico.yaml
```

## Verifying Pod IP Assignment

```bash
# Deploy a test pod and check its IP
kubectl run test-pod --image=alpine --restart=Never -- sleep 3600

kubectl get pod test-pod -o wide
# The pod should have an IP within the podSubnet range
# e.g., 10.244.1.5

# All pod IPs should be within the CIDR
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort -u
```

Choosing the correct Pod CIDR at cluster creation time is important - changing it later requires significant effort and potential downtime.
