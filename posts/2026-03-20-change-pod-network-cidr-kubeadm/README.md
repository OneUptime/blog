# How to Change the Default Pod Network CIDR for IPv4 in kubeadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeadm, IPv4, Pod CIDR, CNI, Networking

Description: Configure a custom IPv4 Pod CIDR when initializing a Kubernetes cluster with kubeadm to avoid conflicts with existing network ranges.

The default pod CIDR depends on the CNI plugin and install method. Flannel's default manifest uses `10.244.0.0/16`, while Calico can use `192.168.0.0/16` or detect the kubeadm pod CIDR automatically. In environments where these overlap with existing infrastructure, specify a custom CIDR during kubeadm init.

## Why Change the Default Pod CIDR?

- Your on-premises network already uses `10.244.0.0/16`
- Corporate policy requires a different private range
- You're connecting multiple clusters and need non-overlapping pod CIDRs
- You need a larger/smaller allocation than the default

## Method 1: kubeadm init Config File (Recommended)

```yaml
# kubeadm-init-config.yaml

apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  # Custom pod CIDR - avoids overlap with 10.x corporate networks
  podSubnet: "172.16.0.0/16"
  serviceSubnet: "10.96.0.0/12"
  dnsDomain: "cluster.local"
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
nodeRegistration:
  criSocket: "unix:///var/run/containerd/containerd.sock"
```

```bash
# Initialize with custom CIDR
sudo kubeadm init --config kubeadm-init-config.yaml

# Save the kubeconfig
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Method 2: Command Line Flag

```bash
# Quick single-node setup with custom CIDR
sudo kubeadm init \
  --pod-network-cidr=172.16.0.0/16 \
  --service-cidr=10.96.0.0/12
```

## Step 2: Install CNI with Matching CIDR

After init, install a CNI plugin. Flannel must be updated to use the same CIDR, while Calico detects the kubeadm pod CIDR automatically.

**Flannel with custom CIDR:**

```bash
# Download the Flannel manifest
wget https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Edit the Network field to match your pod CIDR
sed -i 's|10.244.0.0/16|172.16.0.0/16|g' kube-flannel.yml

# Apply the modified manifest
kubectl apply -f kube-flannel.yml
```

**Calico with custom CIDR:**

```bash
# With kubeadm, Calico detects the configured pod CIDR automatically
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml
```

## Verifying the CIDR is Applied

```bash
# Check that nodes receive the correct per-node CIDR
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
kubectl describe node <node-name> | grep PodCIDR

# Test with a pod
kubectl run test --image=busybox --restart=Never -- sleep 3600
kubectl get pod test -o wide
# Pod IP should be in 172.16.x.x range
```

## Checking for CIDR Conflicts

```bash
# Ensure the pod CIDR doesn't overlap with host routing
ip route | grep -v "wg\|tun\|docker"
# None of these routes should overlap with 172.16.0.0/16
```

Always verify the custom CIDR doesn't conflict with existing routes before cluster creation, as changing the CIDR post-init usually requires reconfiguring the cluster and CNI, and is often simplest as a full cluster rebuild.
