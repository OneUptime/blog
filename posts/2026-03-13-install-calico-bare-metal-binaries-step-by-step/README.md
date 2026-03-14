# How to Install Calico on Bare Metal with Binaries Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Installation

Description: A step-by-step guide to installing Calico using binary installation on bare metal servers without relying on containers for the Calico components themselves.

---

## Introduction

Installing Calico using binaries rather than containers is the preferred approach for environments where container runtimes are not available or where you need to run Calico components as native system services. This model is common in highly regulated environments, embedded Kubernetes distributions, and clusters that do not use the standard Kubernetes runtime.

Binary installation places the Calico node binary, Felix, BIRD, and CNI plugins directly on the host filesystem and runs them as systemd services. This approach gives you precise control over process isolation, resource limits, and startup behavior, but requires more manual configuration than the operator-based approach.

This guide covers the full binary installation of Calico on bare metal servers.

## Prerequisites

- Bare metal servers running Linux (Ubuntu 20.04+ or RHEL 8+)
- Kubernetes cluster already bootstrapped with kubeadm
- Root or sudo access to all nodes
- Internet access to download Calico binaries from GitHub releases

## Step 1: Download Calico Binaries

On each node, download the required binaries.

```bash
CALICO_VERSION=v3.27.0
cd /tmp

# Download calico-node binary
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-node-amd64 \
  -o calico-node
chmod +x calico-node
sudo mv calico-node /usr/local/bin/

# Download CNI plugins
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-cni-amd64 \
  -o calico
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-ipam-amd64 \
  -o calico-ipam
chmod +x calico calico-ipam
sudo mv calico calico-ipam /opt/cni/bin/
```

## Step 2: Install CNI Configuration

Create the CNI network configuration file.

```bash
sudo mkdir -p /etc/cni/net.d
cat <<EOF | sudo tee /etc/cni/net.d/10-calico.conflist
{
  "name": "k8s-pod-network",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "calico",
      "datastore_type": "kubernetes",
      "kubernetes": {
        "kubeconfig": "/etc/kubernetes/admin.conf"
      },
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      }
    }
  ]
}
EOF
```

## Step 3: Configure and Start calico-node

Create a systemd service for calico-node.

```bash
cat <<EOF | sudo tee /etc/systemd/system/calico-node.service
[Unit]
Description=Calico Node
After=network.target

[Service]
Environment=DATASTORE_TYPE=kubernetes
Environment=KUBECONFIG=/etc/kubernetes/admin.conf
Environment=IP_AUTODETECTION_METHOD=first-found
Environment=CALICO_IPV4POOL_CIDR=192.168.0.0/16
Environment=CALICO_IPV4POOL_IPIP=CrossSubnet
ExecStart=/usr/local/bin/calico-node
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now calico-node
```

## Step 4: Verify the Service

```bash
sudo systemctl status calico-node
journalctl -u calico-node -f
```

## Step 5: Check Node Readiness

```bash
kubectl get nodes
kubectl get pods -A
```

## Conclusion

Installing Calico with binaries on bare metal gives you a native system service deployment without container runtime dependencies. The core steps are downloading the calico-node and CNI binaries, writing the CNI configuration, and running calico-node as a systemd service. This approach suits regulated environments and embedded Kubernetes distributions where container-based CNI deployment is not an option.
