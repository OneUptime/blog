# How to Add Nodes to Harvester Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Cluster, Scaling

Description: Learn how to expand your Harvester cluster by adding new nodes for increased compute, memory, and storage capacity.

## Introduction

Adding nodes to a Harvester cluster is how you scale capacity - more nodes means more VMs, more CPU and memory, and more distributed storage through Longhorn. The process involves installing Harvester on the new node and joining it to the existing cluster using the cluster token. Harvester runs on RKE2 underneath, but joined nodes participate in etcd and the control plane only according to the role selected during installation. Longhorn automatically detects new management or worker nodes and their default disks, but existing replicas are only rebalanced automatically when Replica Auto Balance is enabled.

## Prerequisites

- An existing Harvester cluster
- The cluster token from the initial installation
- The cluster VIP address
- New server meeting Harvester hardware requirements and using CPU specs compatible with the existing nodes (8+ CPU cores, 32 GB+ RAM, 250 GB+ disk minimum for development/testing; production requires more)
- Harvester ISO on a USB drive or accessible via iPXE

## Step 1: Get the Cluster Join Information

Before installing on the new node, collect the join information from the existing cluster:

```bash
# SSH into any existing management node and switch to root

ssh rancher@192.168.1.11
sudo -i

# Get the cluster token
yq eval .token /etc/rancher/rancherd/config.yaml

# Get the cluster VIP (already known, but verify)
kubectl get svc -n kube-system ingress-expose \
    -o jsonpath='{.metadata.annotations.kube-vip\.io/requestedIP}{"\n"}'

# Get the current Harvester version to ensure the new node matches
kubectl get settings.harvesterhci.io server-version \
    -o jsonpath='{.value}{"\n"}'
```

## Step 2: Download the Matching Harvester ISO

Use the same Harvester version as the existing cluster:

```bash
HARVESTER_VERSION="<match-your-existing-cluster-version>"  # Use the value from Step 1

# Download the ISO
wget https://releases.rancher.com/harvester/${HARVESTER_VERSION}/harvester-${HARVESTER_VERSION}-amd64.iso

# Write to USB
sudo dd if=harvester-${HARVESTER_VERSION}-amd64.iso of=/dev/sdX bs=4M status=progress
```

## Step 3: Boot the New Node and Select Join Mode

1. Insert the USB into the new server
2. Boot from USB
3. In the Harvester installer, select **Join an existing Harvester cluster**
4. Choose the appropriate node role (**Default**, **Management**, **Worker**, or **Witness**)

## Step 4: Configure the New Node

During the join installation wizard:

```text
# Management Network Configuration
Interface:    eth0
Method:       Static
IP Address:   192.168.1.14/24    (next available IP)
Gateway:      192.168.1.1
DNS:          8.8.8.8

# Cluster Join Information
Server URL:   https://192.168.1.100:443   (cluster VIP)
Cluster Token: <token from Step 1>

# Node Settings
Hostname:     harvester-node-04
Role:         Default   (or Management/Worker/Witness as needed)

# Storage
Install Disk: /dev/sda  (250 GB disk)
Data Disk:    /dev/sda  (same disk, or select a separate data disk)
```

## Step 5: Automated Join with Config File

For consistent node additions, use a configuration file:

```yaml
# join-node-config.yaml
# Configuration for joining a new node to the cluster

scheme_version: 1
server_url: https://192.168.1.100:443
token: "your-cluster-token"

install:
  mode: join
  role: default
  device: /dev/sda
  data_disk: /dev/sda
  automatic: true
  management_interface:
    interfaces:
      - name: eth0
    method: static
    ip: 192.168.1.14
    subnet_mask: 255.255.255.0
    gateway: 192.168.1.1

os:
  hostname: harvester-node-04
  ssh_authorized_keys:
    - ssh-ed25519 AAAAC3NzaC1... admin@host
  password: "$6$rounds=4096$salt$hash"  # Pre-hashed password
  ntp_servers:
    - pool.ntp.org
  dns_nameservers:
    - 8.8.8.8
    - 8.8.4.4
```

## Step 6: Monitor the Node Joining

```bash
# On the existing cluster, watch the new node appear
kubectl get nodes -w

# The new node goes through these states:
# 1. Initializing - RKE2 is starting
# 2. NotReady - Node is up but system pods are deploying
# 3. Ready - Node is fully operational

# Check system pods on the new node
kubectl get pods -A --field-selector spec.nodeName=harvester-node-04

# If the new node is promoted to a management node or joined as a witness node,
# verify etcd cluster membership. Worker nodes are not etcd members.
kubectl exec -n kube-system \
    $(kubectl get pods -n kube-system -l component=etcd -o name | head -1) -- \
    etcdctl --endpoints=https://127.0.0.1:2379 \
            --cacert /var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
            --cert /var/lib/rancher/rke2/server/tls/etcd/server-client.crt \
            --key /var/lib/rancher/rke2/server/tls/etcd/server-client.key \
            member list
```

## Step 7: Verify Longhorn Disk Integration

For management or worker nodes, Longhorn automatically creates the Longhorn node and default disk. Existing replicas are only rebalanced automatically when Replica Auto Balance is enabled:

```bash
# Check Longhorn sees the new node
kubectl get nodes.longhorn.io -n longhorn-system

# Inspect the default disk that Longhorn registered for the new node
kubectl get node.longhorn.io harvester-node-04 -n longhorn-system -o yaml

# Check whether replica auto-balance is enabled before expecting rebalancing
kubectl get settings.longhorn.io replica-auto-balance -n longhorn-system \
    -o jsonpath='{.value}{"\n"}'

# Inspect existing volumes
kubectl get volumes.longhorn.io -n longhorn-system \
    -o jsonpath='{range .items[*]}{.metadata.name}: {.status.robustness} replicaAutoBalance={.spec.replicaAutoBalance} replicas={.spec.numberOfReplicas}{"\n"}{end}'
```

## Step 8: Configure Additional Disks on the New Node

If the new node has additional data disks beyond the OS disk:

```bash
# In the Harvester UI:
# 1. Navigate to Hosts
# 2. Click on the new node
# 3. Go to the "Storage" tab
# 4. Click "Add Disk"
# 5. Select the additional raw block device and provisioner
# 6. If prompted, enable Force Formatted and configure storage tags if needed
# 7. Click Save

# Via kubectl - after mounting the disk on the host, add or update the
# Longhorn disk entry on the node
kubectl -n longhorn-system edit node.longhorn.io harvester-node-04

# Under spec.disks, add or update an entry like:
# additional-disk:
#   allowScheduling: true
#   diskDriver: ""
#   diskType: filesystem
#   evictionRequested: false
#   path: /mnt/additional-disk
#   storageReserved: 10737418240
#   tags:
#     - ssd
```

## Step 9: Post-Join Validation

```bash
# Complete validation checklist

echo "=== Node Join Validation ==="

# 1. Node is Ready
kubectl get node harvester-node-04 --no-headers | awk '$2 == "Ready"'

# 2. System pods are running on new node
kubectl get pods -A --field-selector spec.nodeName=harvester-node-04 \
    --no-headers | grep -v Running

# 3. Longhorn registered disks for the node (management/worker nodes only)
kubectl get node.longhorn.io harvester-node-04 -n longhorn-system -o yaml

# 4. If the node is a management or worker node, try scheduling a test VM on it
kubectl apply -f - <<EOF
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: node-test-vm
  namespace: default
spec:
  running: true
  template:
    spec:
      nodeSelector:
        kubernetes.io/hostname: harvester-node-04
      domain:
        cpu:
          cores: 1
        resources:
          requests:
            memory: 512Mi
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          containerDisk:
            image: kubevirt/cirros-registry-disk-demo:latest
EOF

kubectl get vmi node-test-vm -n default -w
kubectl delete vm node-test-vm -n default
```

## Conclusion

Adding nodes to a Harvester cluster is a straightforward way to add compute capacity and, for management or worker nodes, more Longhorn-backed storage. Use the same Harvester version as the existing cluster, choose the appropriate node role during join, and verify that the node reaches `Ready` before placing workloads on it. For production clusters, keep the count of management and witness nodes that participate in etcd odd (for example, 3, 5, or 7) to maintain quorum. Existing Longhorn replicas rebalance to the new node only when Replica Auto Balance is enabled.
