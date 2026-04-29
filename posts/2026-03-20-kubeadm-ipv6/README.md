# How to Initialize a Kubernetes Cluster with IPv6 Using kubeadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Kubeadm, Cluster Setup, Dual-Stack, Networking

Description: Initialize a dual-stack or IPv6-only Kubernetes cluster with kubeadm, configure pod and service CIDRs for IPv6, and set up the necessary node networking for IPv6 support.

## Introduction

kubeadm supports dual-stack and IPv6-only Kubernetes clusters through the `--pod-network-cidr` and `--service-cidr` flags. For dual-stack, provide both IPv4 and IPv6 CIDR ranges separated by commas. The control plane and nodes must have IPv6 enabled at the OS level, the nodes need routable IPv6 connectivity between each other, and the chosen CNI plugin must support IPv6. Common choices include Calico and Cilium, both of which support dual-stack networking.

## Pre-requisites: Enable IPv6 on All Nodes

```bash
# Enable IPv6 on all control plane and worker nodes

sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.all.forwarding=1
sudo sysctl -w net.ipv4.ip_forward=1

# Persist settings
sudo tee /etc/sysctl.d/99-kubernetes-ipv6.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6=0
net.ipv6.conf.default.disable_ipv6=0
net.ipv6.conf.all.forwarding=1
net.ipv4.ip_forward=1
net.bridge.bridge-nf-call-ip6tables=1
EOF

sudo sysctl --system
```

## Initialize Dual-Stack Cluster

```bash
# kubeadm-config.yaml for dual-stack cluster
cat << 'EOF' > kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16,fd00:10:244::/56"
  serviceSubnet: "10.96.0.0/12,fd00:10:96::/108"
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "192.168.1.10"
  bindPort: 6443
nodeRegistration:
  kubeletExtraArgs:
    - name: node-ip
      value: "192.168.1.10,2001:db8::10"
EOF

# Initialize cluster with dual-stack
sudo kubeadm init --config kubeadm-config.yaml

# Or inline with flags for the cluster CIDRs
# On bare-metal dual-stack nodes, still set kubelet --node-ip via InitConfiguration
sudo kubeadm init \
    --pod-network-cidr="10.244.0.0/16,fd00:10:244::/56" \
    --service-cidr="10.96.0.0/12,fd00:10:96::/108" \
    --apiserver-advertise-address=192.168.1.10

# The API server advertise address remains a single IP even on a dual-stack cluster

# Set up kubectl
mkdir -p ~/.kube
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

## Initialize IPv6-Only Cluster

```yaml
# kubeadm-ipv6only.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "fd00:10:244::/56"
  serviceSubnet: "fd00:10:96::/108"
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
nodeRegistration:
  kubeletExtraArgs:
    - name: node-ip
      value: "2001:db8::10"
localAPIEndpoint:
  advertiseAddress: "2001:db8::10"
  bindPort: 6443
```

```bash
sudo kubeadm init --config kubeadm-ipv6only.yaml
```

## Join Worker Nodes with IPv6

```bash
# Join command from kubeadm init output
# For dual-stack workers, put node-ip in a JoinConfiguration
cat << 'EOF' > kubeadm-join.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: JoinConfiguration
discovery:
  bootstrapToken:
    apiServerEndpoint: "192.168.1.10:6443"
    token: "<token>"
    caCertHashes:
      - "sha256:<hash>"
nodeRegistration:
  kubeletExtraArgs:
    - name: node-ip
      value: "192.168.1.11,2001:db8::11"
EOF

sudo kubeadm join --config kubeadm-join.yaml

# Verify node addresses
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}: {range .status.addresses[*]}{.type}={.address} {end}{"\n"}{end}'
# Should list both IPv4 and IPv6 InternalIP entries for the joined node
```

## Install CNI Plugin for IPv6

```bash
# Install Calico with dual-stack support
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/operator-crds.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/tigera-operator.yaml

cat << 'EOF' | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - blockSize: 26
        cidr: 10.244.0.0/16
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
      - blockSize: 122
        cidr: fd00:10:244::/56
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
EOF

# Verify Calico pods are running
kubectl -n calico-system get pods
```

## Verify Dual-Stack Cluster

```bash
# Check node addresses
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}: {range .status.addresses[*]}{.type}={.address} {end}{"\n"}{end}'

# Check cluster info
kubectl cluster-info

# Deploy a test pod and check Pod IPs
kubectl run test-pod --image=alpine --labels app=test-pod --command -- sleep infinity
kubectl wait --for=condition=Ready pod/test-pod --timeout=60s
kubectl get pod test-pod -o go-template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
# Should show one IPv4 address and one IPv6 address

# Create a dual-stack Service and check both ClusterIPs
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: test-pod-svc
spec:
  ipFamilyPolicy: PreferDualStack
  selector:
    app: test-pod
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
EOF
kubectl get svc test-pod-svc -o go-template='{{range .spec.clusterIPs}}{{printf "%s\n" .}}{{end}}'
# Should show one IPv4 ClusterIP and one IPv6 ClusterIP
```

## Conclusion

Initialize a dual-stack Kubernetes cluster with kubeadm by providing comma-separated IPv4 and IPv6 CIDRs for both `podSubnet` and `serviceSubnet` in the kubeadm config. Enable IPv6 forwarding on all nodes before initialization, and enable IPv4 forwarding as well for dual-stack clusters. Specify `node-ip` with both IPv4 and IPv6 addresses for the kubelet on each node through kubeadm configuration. Install a dual-stack capable CNI plugin such as Calico or Cilium; for Calico, configure both IPv4 and IPv6 IP pools. Verify node, pod, and Service addresses to confirm dual-stack assignment.
