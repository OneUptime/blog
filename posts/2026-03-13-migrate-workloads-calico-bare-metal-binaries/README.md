# How to Migrate Existing Workloads to Calico on Bare Metal with Binaries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Migration

Description: A guide to migrating from a container-based CNI to a binary-installed Calico on bare metal Kubernetes nodes.

---

## Introduction

Migrating to binary-installed Calico from a container-based CNI involves removing the existing CNI's DaemonSet from Kubernetes, installing the Calico binaries directly on each node's filesystem, and configuring the calico-node service. This migration is more manual than switching between container-based CNIs, but it is the right approach for environments where you want Calico to run as a native OS service rather than a container.

The migration order matters: you should install the Calico binaries and configure the service on each node before removing the old CNI's pods from that node. This sequencing ensures there is never a window where a node has no CNI at all.

This guide covers migrating existing workloads to binary-installed Calico on bare metal.

## Prerequisites

- A bare metal Kubernetes cluster running with a container-based CNI
- Root access to all nodes
- `kubectl` with cluster admin access
- `calicoctl` configured for the target cluster
- Docker or another container tool available to extract the Calico binaries from the release images

## Step 1: Backup Workload State

```bash
kubectl get all -A -o yaml > pre-migration-state.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
calicoctl get ippool -o yaml > pre-migration-ippools.yaml
```

## Step 2: Install Calico Binaries on All Nodes (Before Removing Old CNI)

On each node, install the Calico binaries without starting the service yet.

```bash
CALICO_VERSION=v3.27.0
mkdir -p /opt/cni/bin /etc/cni/net.d /etc/calico

docker pull calico/node:${CALICO_VERSION}
docker create --name calico-node-extract calico/node:${CALICO_VERSION}
docker cp calico-node-extract:/bin/calico-node /usr/local/bin/calico-node
docker rm calico-node-extract
chmod 755 /usr/local/bin/calico-node

docker pull calico/cni:${CALICO_VERSION}
docker create --name calico-cni-extract calico/cni:${CALICO_VERSION}
docker cp calico-cni-extract:/opt/cni/bin/calico /opt/cni/bin/calico
docker cp calico-cni-extract:/opt/cni/bin/calico-ipam /opt/cni/bin/calico-ipam
docker rm calico-cni-extract
chmod 755 /opt/cni/bin/calico /opt/cni/bin/calico-ipam
```

Create the systemd service unit and environment file on each node. The kubeconfig referenced here must have the Calico node permissions for the Kubernetes datastore.

```bash
cat > /etc/calico/calico.env <<EOF
FELIX_DATASTORETYPE=kubernetes
KUBECONFIG=/etc/calico/calico-kubeconfig
CALICO_NODENAME=<node-name>
CALICO_IP=autodetect
CALICO_NETWORKING_BACKEND=bird
EOF

cat > /etc/systemd/system/calico-felix.service <<'EOF'
[Unit]
Description=Calico Felix agent
After=network-online.target
Wants=network-online.target

[Service]
User=root
EnvironmentFile=/etc/calico/calico.env
ExecStartPre=/usr/bin/mkdir -p /var/run/calico
ExecStart=/usr/local/bin/calico-node -felix
KillMode=process
Restart=on-failure
LimitNOFILE=32000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable calico-felix.service  # but do not start yet
```

## Step 3: Configure Calico CRDs

With `kubectl` access, pre-configure the Calico datastore.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16   # Replace with your cluster Pod CIDR.
  blockSize: 26
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 4: Migrate Node by Node

For each node:

```bash
# Cordon the node

kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# On the node: write CNI config
cat > /etc/cni/net.d/10-calico.conflist << 'EOF'
{
  "name": "k8s-pod-network",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "calico",
      "log_level": "info",
      "datastore_type": "kubernetes",
      "mtu": 1500,
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      },
      "kubernetes": {
        "kubeconfig": "/etc/cni/net.d/calico-kubeconfig"
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

# Remove old CNI config
rm -f /etc/cni/net.d/*flannel* /etc/cni/net.d/*canal*

# Start Calico Felix
sudo systemctl start calico-felix
sudo systemctl status calico-felix

# Uncordon
kubectl uncordon <node-name>
```

## Step 5: Remove Old CNI DaemonSet

After all nodes have been migrated, remove the old CNI from Kubernetes.

```bash
kubectl delete daemonset kube-flannel-ds -n kube-system
```

## Conclusion

Migrating to binary-installed Calico on bare metal requires pre-installing binaries on all nodes before removing the existing CNI, configuring the Calico datastore, and then transitioning nodes one at a time. This sequencing prevents any node from having no CNI plugin and ensures workloads continue to run throughout the migration.
