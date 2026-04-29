# How to Install K3s on Fedora - Install

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Fedora, Kubernetes, Linux, Installation, Lightweight Kubernetes, SUSE Rancher

Description: Learn how to install K3s on Fedora Linux, handle Fedora-specific requirements like firewall and SELinux configuration, and get a single-node or multi-node cluster running.

---

K3s is a lightweight Kubernetes distribution that installs in seconds. Fedora's SELinux enforcement and firewall require a few extra steps compared to other distributions.

---

## Prerequisites

- A recent Fedora release
- Minimum 2 CPU cores, 2GB RAM for a server node
- Root or sudo access

---

## Step 1: Prepare the System

```bash
# Update the system

sudo dnf upgrade -y

# Install required packages
sudo dnf install -y container-selinux selinux-policy-base policycoreutils-python-utils
```

---

## Step 2: Configure the Firewall

If you keep `firewalld` enabled, add the default rules K3s requires. Additional ports may be needed for multi-node setups depending on your networking backend and services:

```bash
# K3s API server
sudo firewall-cmd --permanent --add-port=6443/tcp

# K3s default pod and service CIDRs
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16

# Apply changes
sudo firewall-cmd --reload
```

---

## Step 3: Install K3s

```bash
# Install K3s server (single-node)
curl -sfL https://get.k3s.io | sh -s - --selinux

# Verify the service is running
sudo systemctl status k3s

# Check that the node is Ready
sudo kubectl get nodes
```

The installer automatically:
- Downloads the K3s binary
- Creates a systemd service
- Writes the kubeconfig to `/etc/rancher/k3s/k3s.yaml`

---

## Step 4: Configure kubectl Access for Non-Root Users

```bash
# Copy kubeconfig for your user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Test access
kubectl get nodes
kubectl get pods -A
```

---

## Step 5: Add Agent Nodes (Optional)

Get the server token and add worker nodes:

```bash
# On the server node
sudo cat /var/lib/rancher/k3s/server/node-token

# On each agent node - replace SERVER_IP and TOKEN
curl -sfL https://get.k3s.io | K3S_URL=https://<SERVER_IP>:6443 K3S_TOKEN=<TOKEN> sh -s - --selinux
```

---

## Fedora-Specific Troubleshooting

```bash
# If pods fail to start, check SELinux denials
sudo ausearch -m avc -ts recent | audit2why

# Temporarily set SELinux to permissive for testing (not for production)
sudo setenforce 0
```

---

## Best Practices

- On SELinux-enforcing Fedora systems, install K3s with `--selinux` so containerd runs with K3s SELinux support enabled.
- Use `cgroups v2` (default on Fedora 31+) - K3s fully supports it.
- If you keep `firewalld` enabled, trust the default K3s pod and service CIDRs (`10.42.0.0/16` and `10.43.0.0/16`) instead of relying on the `cni0` interface name.
