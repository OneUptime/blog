# How to Configure Pod CIDR for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Pod CIDR, Networking, Dual-Stack, CNI

Description: Configure IPv6 Pod CIDR ranges in Kubernetes, understand how pod CIDRs are allocated per node, and verify that pods receive IPv6 addresses from the configured ranges.

## Introduction

The pod CIDR in Kubernetes defines the cluster-wide IP address ranges used for pod networking. In dual-stack clusters, the pod CIDR includes both IPv4 and IPv6 ranges, typically specified as comma-separated values. Each node receives a slice of the cluster-wide pod CIDR - in dual-stack, each node gets one IPv4 and one IPv6 block. Depending on the CNI and IPAM mode, pod addresses are allocated from these per-node CIDRs or from CNI-managed IP pools that align with the cluster ranges.

## Configure Pod CIDR in kubeadm

```yaml
# kubeadm-config.yaml - dual-stack pod CIDR

apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  # Cluster-wide pod CIDRs.
  # By default, kube-controller-manager allocates /24 IPv4
  # and /64 IPv6 PodCIDRs per node.
  podSubnet: "10.244.0.0/16,fd00:10:244::/56"
  serviceSubnet: "10.96.0.0/12,fd00:10:96::/108"
```

```bash
# Initialize with these CIDRs
sudo kubeadm init --config kubeadm-config.yaml

# Or directly via flags
sudo kubeadm init \
    --pod-network-cidr="10.244.0.0/16,fd00:10:244::/56" \
    --service-cidr="10.96.0.0/12,fd00:10:96::/108"
```

## View Per-Node Pod CIDR Allocation

```bash
# Each node gets a portion of the cluster pod CIDR
kubectl get nodes -o go-template='{{range .items}}{{.metadata.name}}: {{range .spec.podCIDRs}}{{printf "%s " .}}{{end}}{{printf "\n"}}{{end}}'

# Example output:
# node1: 10.244.0.0/24 fd00:10:244::/64
# node2: 10.244.1.0/24 fd00:10:244:1::/64
# node3: 10.244.2.0/24 fd00:10:244:2::/64

# Detailed node inspection
kubectl describe node node1 | grep -A5 "PodCIDR"
```

## Verify Pod IPv6 Address from CIDR

```bash
# Create a test pod and check IPv6 assignment
kubectl run testpod --image=nginx --restart=Never

# Wait for pod to be running
kubectl wait --for=condition=Ready pod/testpod --timeout=60s

# Check pod IPs
kubectl get pod testpod -o go-template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
# 10.244.0.5
# fd00:10:244::5

# Verify both pod IPs inside the container and compare them with the node's PodCIDRs
kubectl exec testpod -- cat /etc/hosts
# ...
# 10.244.0.5    testpod
# fd00:10:244::5    testpod

# Get all pod IPs across the cluster
kubectl get pods -A -o go-template='{{range .items}}{{.metadata.namespace}}/{{.metadata.name}}: {{range .status.podIPs}}{{printf "%s " .ip}}{{end}}{{printf "\n"}}{{end}}'
```

## Configure CNI for Pod CIDR

```yaml
# Calico dual-stack with pod CIDRs
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      # IPv4 pool matching pod CIDR
      - blockSize: 26
        cidr: 10.244.0.0/16
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
      # IPv6 pool matching pod CIDR
      - blockSize: 122
        cidr: fd00:10:244::/56
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
```

```yaml
# Flannel dual-stack ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "IPv6Network": "fd00:10:244::/56",
      "EnableIPv6": true,
      "Backend": {
        "Type": "vxlan"
      }
    }
```

## Expand Pod CIDR (Advanced)

```bash
# kubeadm does not support changing podSubnet after cluster initialization
# If you need a different podSubnet, recreate the cluster with the new CIDRs

# Check the configured podSubnet stored by kubeadm
kubectl -n kube-system get cm kubeadm-config -o go-template='{{index .data "ClusterConfiguration"}}' | grep podSubnet

# Plan your CIDR sizing:
# /16 IPv4 = 65536 addresses, about 256 /24 node CIDRs
# /56 IPv6 = 256 /64 node CIDRs

# Example larger sizing:
# IPv4 pod CIDR: 10.244.0.0/14 (262144 addresses, about 1024 /24 node CIDRs)
# IPv6 pod CIDR: fd00::/56 (256 /64 node CIDRs)
```

## Conclusion

Configure dual-stack pod CIDRs in Kubernetes by providing comma-separated IPv4 and IPv6 CIDRs in `podSubnet` or `--pod-network-cidr`. Each node receives an IPv4 and IPv6 PodCIDR slice, visible in `node.spec.podCIDRs`. The CNI plugin must be configured to use matching IPv4 and IPv6 pod network ranges; for example, Calico IP pools should fall within the Kubernetes pod CIDRs, while Flannel should use matching `Network` and `IPv6Network` values. Pods in dual-stack clusters receive both IPv4 and IPv6 addresses when the CNI supports dual-stack networking. For kubeadm-managed clusters, size your pod CIDRs at cluster creation because kubeadm does not support changing `podSubnet` later.
