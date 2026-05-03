# How to Configure CRI-O with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CRI-O, IPv6, CNI, Kubernetes, Container Runtime, OpenShift

Description: A guide to configuring CRI-O container runtime with IPv6 and dual-stack networking using CNI plugins, kernel settings, and Kubernetes integration.

CRI-O is a lightweight container runtime interface designed specifically for Kubernetes, used as the default runtime in OpenShift and many other Kubernetes distributions. Like containerd, IPv6 support in CRI-O is provided through CNI plugins.

## CRI-O Configuration for IPv6

```toml
# /etc/crio/crio.conf

[crio.network]
# Path to CNI configuration directory

network_dir = "/etc/cni/net.d/"

# Paths to search for CNI plugin binaries
plugin_dirs = [
  "/opt/cni/bin/",
  "/usr/libexec/cni/"
]
```

## Kernel Prerequisites for IPv6

```bash
# Enable IPv6 forwarding and bridge netfilter
cat > /etc/sysctl.d/99-crio-ipv6.conf << 'EOF'
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sysctl --system

# Load required kernel modules
modprobe br_netfilter
modprobe overlay

# Persist modules
cat > /etc/modules-load.d/crio.conf << 'EOF'
overlay
br_netfilter
EOF
```

## CNI Configuration for Dual-Stack

```json
// /etc/cni/net.d/100-crio-bridge.conflist

{
  "cniVersion": "1.0.0",
  "name": "crio",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "hairpinMode": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{"subnet": "10.85.0.0/16"}],
          [{"subnet": "fd00:cafe::/64"}]
        ],
        "routes": [
          {"dst": "0.0.0.0/0"},
          {"dst": "::/0"}
        ]
      }
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true}
    },
    {
      "type": "loopback"
    }
  ]
}
```

## Kubernetes Cluster with CRI-O and Dual-Stack

```bash
# Install CRI-O (Ubuntu example for Kubernetes 1.29)
KUBERNETES_VERSION=v1.29
CRIO_VERSION=v1.29

apt-get update -y
apt-get install -y software-properties-common curl gpg
mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/deb/Release.key \
  | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/deb/ /" \
  > /etc/apt/sources.list.d/kubernetes.list

curl -fsSL https://download.opensuse.org/repositories/isv:/cri-o:/stable:/$CRIO_VERSION/deb/Release.key \
  | gpg --dearmor -o /etc/apt/keyrings/cri-o-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/cri-o-apt-keyring.gpg] https://download.opensuse.org/repositories/isv:/cri-o:/stable:/$CRIO_VERSION/deb/ /" \
  > /etc/apt/sources.list.d/cri-o.list

apt-get update && apt-get install -y cri-o

systemctl enable --now crio
```

```yaml
# kubeadm-config.yaml for CRI-O dual-stack
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
nodeRegistration:
  criSocket: "unix:///var/run/crio/crio.sock"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  serviceSubnet: "10.96.0.0/16,fd00:abcd::/108"
  podSubnet: "10.85.0.0/16,fd00:cafe::/48"
```

```bash
kubeadm init --config kubeadm-config.yaml
```

## Flannel CNI with CRI-O for IPv6

```yaml
# kube-flannel.yml (relevant IPv6 configuration)
# In the ConfigMap net-conf.json section:
net-conf.json: |
  {
    "Network": "10.85.0.0/16",
    "IPv6Network": "fd00:cafe::/48",
    "EnableIPv6": true,
    "EnableNFTables": false,
    "Backend": {
      "Type": "vxlan",
      "Port": 4789
    }
  }
```

```bash
# Apply Flannel
kubectl apply -f kube-flannel.yml

# Verify flannel pods are running
kubectl get pods -n kube-flannel

# Check node IPv6 addresses
kubectl get nodes -o wide
```

## Verifying CRI-O IPv6

```bash
# Check CRI-O service
systemctl status crio

# List running pods (using crictl)
crictl pods

# Inspect a pod's network configuration
POD_ID=$(crictl pods --name web -q)
crictl inspectp $POD_ID | python3 -m json.tool | grep -A 5 "ip\|IPv6"

# Check network namespace
POD_PID=$(crictl inspectp $POD_ID | python3 -m json.tool | grep '"pid"' | head -1 | awk '{print $2}' | tr -d ',')
nsenter -n -t $POD_PID ip -6 addr show

# Verify CNI plugin executed correctly
journalctl -u crio | grep -i "cni\|ipv6\|network" | tail -20
```

## OpenShift-Specific IPv6 Configuration

CRI-O is the default runtime in OpenShift. For dual-stack in OpenShift 4.x:

```yaml
# install-config.yaml for OpenShift dual-stack installation
apiVersion: v1
networking:
  clusterNetworks:
    - cidr: 10.128.0.0/14
      hostPrefix: 23
    - cidr: fd01::/48
      hostPrefix: 64
  serviceNetwork:
    - 172.30.0.0/16
    - fd02::/112
  networkType: OVNKubernetes   # Required for dual-stack in OpenShift
machineNetwork:
  - cidr: 192.168.0.0/16
  - cidr: fd00::/48
```

```bash
# Verify dual-stack in OpenShift
oc get network.config cluster -o yaml | grep -A 10 clusterNetworks

# Check pod has dual-stack
oc exec -n default <pod> -- ip -6 addr show
```

CRI-O's IPv6 support relies on properly configured CNI plugins with IPv6 subnets, kernel forwarding, and br_netfilter enabled. The same CNI configuration principles apply whether using CRI-O standalone or within Kubernetes/OpenShift.
