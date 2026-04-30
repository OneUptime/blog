# How to Configure Harvester with Multiple NICs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Networking, Multiple NICs, Bonding

Description: Learn how to configure Harvester nodes with multiple NICs for dedicated management, storage, and VM networks for optimal performance and isolation.

## Introduction

Production Harvester deployments benefit greatly from multiple NICs per node. Harvester uses the management network for cluster control plane traffic, while custom cluster networks can isolate VM traffic and the Harvester storage-network setting can isolate Longhorn replication traffic. This traffic isolation helps keep cluster management responsive during heavy storage or VM activity.

## Recommended Multi-NIC Layout

```text
NIC 1 (eth0 or mgmt bond): Management Network
  - Kubernetes API
  - etcd replication
  - Harvester UI
  - SSH access

NIC 2 (eth1): Custom Cluster Network for Storage
  - Uplink for the Harvester storage-network setting
  - Longhorn replication traffic

NIC 3 (eth2): Custom Cluster Network for VM Traffic
  - Uplink for VLAN or untagged VM networks
  - Guest VM traffic
```

## Step 1: Plan Network Layout

Before installation, document your management IPs and the cluster networks you want to build on the additional NICs:

```text
Cluster-wide:
  VIP:          192.168.1.100/24
  Storage VLAN: 200
  Storage CIDR: 10.200.0.0/24   (used by the storage-network setting)

Node 1:
  Management:  192.168.1.11/24  (eth0)
  Storage:     eth1             (custom cluster network uplink)
  VM:          eth2             (custom cluster network uplink)

Node 2:
  Management:  192.168.1.12/24  (eth0)
  Storage:     eth1
  VM:          eth2

Node 3:
  Management:  192.168.1.13/24  (eth0)
  Storage:     eth1
  VM:          eth2
```

## Step 2: Configure Multiple NICs During Installation

Use a Harvester config file for automated multi-NIC setup:

```yaml
# multi-nic-config.yaml

scheme_version: 1
token: "my-cluster-token"

os:
  hostname: harvester-node-01
  ssh_authorized_keys:
    - ssh-ed25519 AAAAC3NzaC1... admin@host
  ntp_servers:
    - pool.ntp.org
  dns_nameservers:
    - 8.8.8.8
    - 8.8.4.4
  password: "HarvesterAdmin123!"

install:
  mode: create
  device: /dev/sda
  automatic: true
  management_interface:
    interfaces:
      - name: eth0
        hwAddr: "aa:bb:cc:dd:ee:01"  # Optional
    method: static
    ip: 192.168.1.11
    subnet_mask: 255.255.255.0
    gateway: 192.168.1.1
  vip: 192.168.1.100
  vip_mode: static
```

Additional NICs such as `eth1` and `eth2` are discovered after installation and are attached to custom cluster networks later.

## Step 3: Configure Bonding for Redundancy

For high availability, replace the `management_interface` portion of the install config with a bonded configuration:

```yaml
install:
  management_interface:
    interfaces:
      - name: eth0
      - name: eth1
    method: static
    ip: 192.168.1.11
    subnet_mask: 255.255.255.0
    gateway: 192.168.1.1
    bond_options:
      mode: active-backup
      miimon: 100
    mtu: 1500
  vip: 192.168.1.100
  vip_mode: static
```

For custom cluster networks that you create after installation, define bonded uplinks in the `VlanConfig` object instead of a separate `network.bonds` section.

## Step 4: Configure Storage NIC After Installation

Once the cluster is up, create a custom cluster network that uses the storage NIC uplink:

```yaml
# storage-cluster-network.yaml

apiVersion: network.harvesterhci.io/v1beta1
kind: ClusterNetwork
metadata:
  name: storage
---
apiVersion: network.harvesterhci.io/v1beta1
kind: VlanConfig
metadata:
  name: storage-config
spec:
  clusterNetwork: storage
  uplink:
    nics:
      - eth1
    linkAttributes:
      mtu: 9000
```

```bash
kubectl apply -f storage-cluster-network.yaml

# Verify
kubectl get clusternetwork storage
kubectl get vlanconfig storage-config
```

## Step 5: Configure Longhorn to Use Storage Network

```yaml
# harvester-storage-network.yaml
# Enable Harvester's storage-network setting on the storage cluster network

apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: storage-network
value: '{"vlan":200,"clusterNetwork":"storage","range":"10.200.0.0/24","exclude":["10.200.0.1/32"]}'
```

Stop all VMs and ensure Longhorn volumes are detached before applying the storage network setting:

```bash
kubectl apply -f harvester-storage-network.yaml

# Verify the Harvester setting is configured
kubectl get settings.harvesterhci.io storage-network -o yaml
# Status should show type: configured and status: "True"
```

## Step 6: Configure VM Network NIC

The third NIC (`eth2`) is used as the uplink for VM VLAN traffic. Back it with a `ClusterNetwork` and `VlanConfig`:

```yaml
# vm-cluster-network.yaml

apiVersion: network.harvesterhci.io/v1beta1
kind: ClusterNetwork
metadata:
  name: vm-network
---
apiVersion: network.harvesterhci.io/v1beta1
kind: VlanConfig
metadata:
  name: vm-network-config
spec:
  clusterNetwork: vm-network
  uplink:
    nics:
      - eth2
    linkAttributes:
      mtu: 9000
```

```bash
kubectl apply -f vm-cluster-network.yaml

# Verify the VM uplink config exists
kubectl get clusternetwork vm-network
kubectl get vlanconfig vm-network-config
```

After that, create a VLAN or Untagged VM network in Harvester that uses `vm-network` as its cluster network.

## Step 7: Verify Traffic Separation

Validate that each type of traffic flows through the correct NIC:

```bash
# Monitor management traffic
iftop -i mgmt-bo

# Monitor storage uplink traffic
iftop -i storage-bo

# Monitor VM uplink traffic
iftop -i vm-network-bo

# Check interface statistics
for NIC in mgmt-bo storage-bo vm-network-bo; do
    echo "=== ${NIC} ==="
    ip -s link show ${NIC} | grep -A 3 "RX:"
done

# Verify the Harvester storage-network setting remains configured
kubectl get settings.harvesterhci.io storage-network -o yaml
```

## Step 8: NIC Configuration Persistence

Ensure all NIC configurations persist across reboots:

```bash
# Test by rebooting a node
sudo reboot

# After reboot, verify the network objects still exist
kubectl get clusternetwork storage vm-network
kubectl get vlanconfig storage-config vm-network-config

# Verify the generated interfaces are back
ip link show mgmt-bo
ip link show storage-bo
ip link show vm-network-bo

# Verify Harvester still reports the storage network as configured
kubectl get settings.harvesterhci.io storage-network -o yaml
```

## Performance Impact of Traffic Separation

```text
Without traffic separation:
  Management latency:  Can increase during heavy storage or VM activity
  Storage throughput:  Shares bandwidth with management and guest traffic
  VM network:          Competes with all other traffic

With dedicated NICs:
  Management latency:  More predictable because mgmt is isolated
  Storage throughput:  Less contention from management and guest traffic
  VM network:          More predictable and easier to scale
```

## Conclusion

Configuring Harvester with multiple dedicated NICs can significantly improve the cluster's performance and reliability. Traffic isolation helps keep Longhorn replication off the management network, and VM network performance becomes more predictable as workload traffic grows. While a single NIC can work for development environments, Harvester recommends bonded management NICs in production and additional NICs for each custom cluster network. The investment in additional NICs and switch ports pays dividends in operational stability and performance predictability.
