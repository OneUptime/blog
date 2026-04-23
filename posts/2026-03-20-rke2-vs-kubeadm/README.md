# RKE2 vs Kubeadm: Kubernetes Installation Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubeadm, Kubernetes, Installation, Comparison

Description: A detailed comparison of RKE2 and kubeadm for bootstrapping Kubernetes clusters, covering ease of use, security, upgrades, and production readiness.

## Overview

RKE2 and kubeadm are two popular methods for bootstrapping Kubernetes clusters. Kubeadm is the official Kubernetes cluster bootstrap tool, providing a flexible but manual approach. RKE2 is a security-focused Kubernetes distribution from SUSE Rancher that includes kubeadm-like bootstrapping with hardened defaults, lifecycle management, and Rancher integration. This guide compares them to help you choose the right installation method.

## What Is Kubeadm?

Kubeadm is the official Kubernetes tool for bootstrapping clusters. It handles the phases of cluster initialization (init) and node joining (join), but leaves infrastructure setup, OS configuration, networking, and lifecycle management to the operator. Kubeadm also exposes a reusable and composable toolbox that higher-level automation can build on.

## What Is RKE2?

RKE2 is a fully opinionated Kubernetes distribution that handles cluster bootstrapping, security hardening, component management, and upgrades as a complete package. It is designed for production and enterprise environments, with hardened defaults and a CIS profile that can be enabled for full benchmark compliance.

## Feature Comparison

| Feature | RKE2 | Kubeadm |
|---|---|---|
| Security Hardening | Hardened defaults; CIS profile available | Manual configuration required |
| FIPS Support | Yes | Depends on OS, runtime, and component builds |
| Upgrade Path | Manual or automated with Rancher/System Upgrade Controller | Manual (kubeadm upgrade) |
| etcd Management | Embedded and managed | External or embedded (manual) |
| Air-gap Support | Yes (image tarballs/artifacts or private registry) | Manual (image pre-loading) |
| Rancher Integration | Native | Via import |
| Container Runtime | containerd (bundled) | Any CRI runtime, such as containerd or CRI-O; Docker via cri-dockerd |
| CNI Plugin | Bundled (Canal/Calico/Cilium/Flannel) | Manual installation |
| Certificates | Auto-renewed on restart when near expiry | Renewed during kubeadm upgrade or manually |
| Single Binary | Yes | No (separate kubeadm, kubelet, kubectl) |
| RBAC Default | Yes | Yes |
| Audit Logging | Configurable; CIS profile sets audit log parameters | Configurable |
| STIG Profile | Published DISA STIG | Manual hardening |
| CIS Profile | Yes (`profile: cis`) | Manual hardening |
| Backup/Restore (etcd) | Integrated | Manual |

## Cluster Installation

### Kubeadm

```bash
# Step 1: Install prerequisites on all nodes

apt-get update && apt-get install -y apt-transport-https ca-certificates curl gpg
mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.36/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.36/deb/ /' > /etc/apt/sources.list.d/kubernetes.list
apt-get update && apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

# Disable swap and enable IPv4 forwarding
swapoff -a
cat > /etc/sysctl.d/k8s.conf << 'EOF'
net.ipv4.ip_forward = 1
EOF
sysctl --system

# Step 2: Install container runtime (containerd)
apt-get install -y containerd
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd

# Step 3: Initialize the control plane
kubeadm init --pod-network-cidr=10.244.0.0/16

# Step 4: Configure kubectl
mkdir -p $HOME/.kube
cp /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Step 5: Install CNI plugin (Flannel)
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Step 6: Join worker nodes
kubeadm join <control-plane-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

### RKE2

```bash
# Step 1: Install RKE2 server
curl -sfL https://get.rke2.io | sh -

# Step 2: Create config file
mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml << 'EOF'
# Token for agent nodes to join
token: my-shared-secret

# TLS SANs for the API server
tls-san:
  - "192.168.1.100"
  - "rancher.example.com"

# CNI plugin (default: canal)
cni: calico
EOF

# Step 3: Start the server
systemctl enable --now rke2-server.service

# Step 4: Install on agent node
curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -

mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml << 'EOF'
server: https://192.168.1.100:9345
token: my-shared-secret
EOF

systemctl enable --now rke2-agent.service
```

Notice that RKE2's installation is significantly simpler and self-contained. Containerd and CNI plugins are bundled.

## Upgrades

### Kubeadm Upgrade Process

```bash
# Upgrade kubeadm
apt-mark unhold kubeadm && \
  apt-get update && apt-get install -y kubeadm='1.36.x-*' && \
  apt-mark hold kubeadm

# Verify the kubeadm version
kubeadm version

# Check upgrade plan
kubeadm upgrade plan

# Apply upgrade
kubeadm upgrade apply v1.36.x

# Upgrade the CNI provider if its documentation requires it

# Drain each node before a minor kubelet upgrade
kubectl drain <node-to-drain> --ignore-daemonsets

# Upgrade kubelet and kubectl on each node
apt-mark unhold kubelet kubectl && \
  apt-get update && apt-get install -y kubelet='1.36.x-*' kubectl='1.36.x-*' && \
  apt-mark hold kubelet kubectl
systemctl daemon-reload && systemctl restart kubelet
kubectl uncordon <node-to-uncordon>
```

### RKE2 Upgrade Process

```bash
# RKE2 can be upgraded with Rancher's System Upgrade Controller
# Or manually with the install script:
curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION=vX.Y.Z+rke2rN sh -
systemctl restart rke2-server
```

Alternatively, use the Rancher UI or System Upgrade Controller for rolling upgrades. Application availability still depends on workload replicas, disruption budgets, and node capacity.

## Security Defaults

RKE2 is hardened by default and can be started with `profile: cis` to apply the remaining CIS-focused controls, including:

- Restricted Pod Security Admission configuration
- Audit log parameters and a default audit policy
- Network policies required by the CIS profile
- Secrets encryption at rest
- Disabled anonymous authentication where required by the hardening profile

Kubeadm creates a vanilla Kubernetes cluster and leaves these hardening decisions to the operator. All of these settings must be manually configured.

## When to Choose RKE2

- Security hardening, FIPS, or CIS compliance is required
- You want reduced operational complexity
- Rancher management is planned
- You need integrated etcd backup and restore
- Your team prefers a complete, opinionated distribution

## When to Choose Kubeadm

- You want the most vanilla Kubernetes installation
- Deep customization of every component is required
- You want to learn how Kubernetes bootstrapping works
- Your organization has existing tooling built around kubeadm

## Conclusion

RKE2 and kubeadm both produce fully conformant Kubernetes clusters, but the path to get there is very different. Kubeadm gives you maximum control but requires significant manual work for security, networking, and upgrades. RKE2 trades some flexibility for a dramatically simplified operational experience with enterprise-grade security defaults. For most production use cases, especially those requiring compliance, RKE2 is the more practical choice.
