# How to Install Calico on Bare Metal with Binaries Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Installation

Description: A step-by-step guide to installing Calico using binary installation on bare metal servers without relying on containers for the Calico components themselves.

---

## Introduction

Installing Calico using binaries rather than containers is an option for environments where you need to run Calico components as native system services. Kubernetes still requires a CRI-compatible container runtime for workloads; this approach only avoids running the Calico node agent itself as a Kubernetes DaemonSet.

Binary installation places the `calico-node` binary and CNI plugins directly on the host filesystem and runs `calico-node` as a systemd service. The `calico-node` process starts the node components such as Felix, BIRD, and confd. This approach gives you precise control over process isolation, resource limits, and startup behavior, but requires more manual configuration than the operator-based approach.

This guide covers the full binary installation of Calico on bare metal servers.

## Prerequisites

- Bare metal servers running Linux (Ubuntu 20.04+ or RHEL 8+)
- Kubernetes cluster already bootstrapped with kubeadm
- Root or sudo access to all nodes
- Internet access to download Calico images and CNI plugin binaries
- Calico CRDs and RBAC already applied, and an IP pool configured for the pod CIDR used by the cluster

## Step 1: Download Calico Binaries

On each node, download the required binaries.

```bash
CALICO_VERSION=v3.27.0
cd /tmp

# Extract the calico-node binary from the calico/node image.
# Docker can run on any machine that can copy the binary to the target node.
docker pull docker.io/calico/node:${CALICO_VERSION}
docker create --name calico-node-extract docker.io/calico/node:${CALICO_VERSION}
docker cp calico-node-extract:/bin/calico-node calico-node
docker rm calico-node-extract

chmod +x calico-node
sudo mv calico-node /usr/local/bin/

# Extract the CNI plugins from the calico/cni image.
docker pull docker.io/calico/cni:${CALICO_VERSION}
docker create --name calico-cni-extract docker.io/calico/cni:${CALICO_VERSION}
docker cp calico-cni-extract:/opt/cni/bin/calico calico
docker cp calico-cni-extract:/opt/cni/bin/calico-ipam calico-ipam
docker rm calico-cni-extract

sudo mkdir -p /opt/cni/bin
sudo install -m 755 calico calico-ipam /opt/cni/bin/
```

## Step 2: Install CNI Configuration

Create a kubeconfig for the Calico CNI plugin and copy it to `/etc/cni/net.d/calico-kubeconfig` on each node. Then create the CNI network configuration file.

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
        "kubeconfig": "/etc/cni/net.d/calico-kubeconfig"
      },
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      }
    },
    {
      "type": "portmap",
      "snat": true,
      "capabilities": {
        "portMappings": true
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
Environment=WAIT_FOR_DATASTORE=true
Environment=IP=autodetect
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

Installing Calico with binaries on bare metal gives you a native system service deployment for the Calico node process. The core steps are extracting the `calico-node` and CNI binaries, writing the CNI configuration, and running `calico-node` as a systemd service. This approach suits regulated environments and embedded Kubernetes distributions where running Calico itself as a Kubernetes DaemonSet is not an option.
