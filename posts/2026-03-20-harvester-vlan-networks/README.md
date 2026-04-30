# How to Set Up VLAN Networks in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, VLAN, Networking

Description: Learn how to configure 802.1Q VLAN networks in Harvester to provide network isolation and segmentation for virtual machine workloads.

## Introduction

VLANs (Virtual Local Area Networks) are a fundamental networking primitive for isolating traffic between different VM workloads, tenants, or security zones. Harvester supports 802.1Q VLAN tagging, allowing VMs to connect to specific VLANs on your physical switching infrastructure. This guide walks through the complete configuration from physical switch setup to VM network attachment.

## Prerequisites

- A Harvester cluster with at least one secondary NIC dedicated to VM traffic
- A managed switch with VLAN support (802.1Q)
- VLANs pre-configured on the switch with the appropriate trunk port to the Harvester nodes
- Network planning document with VLAN IDs and subnets

## Network Design Example

```text
VLAN 10  - Management   10.0.10.0/24
VLAN 100 - Production   10.0.100.0/24
VLAN 200 - Staging      10.0.200.0/24
VLAN 300 - DMZ          10.3.0.0/24
```

## Step 1: Configure the Physical Switch

Configure the switch port connected to each Harvester node as a trunk port:

```text
! Cisco IOS example - configure trunk port for Harvester nodes
interface GigabitEthernet0/1
  description Harvester-Node-01-eth1
  switchport mode trunk
  switchport trunk allowed vlan 10,100,200,300
  switchport trunk native vlan 1
  no shutdown
```

```text
# Linux bridge example (if using a software switch)

# Create bridge and VLAN filtering
ip link add br0 type bridge
ip link set br0 type bridge vlan_filtering 1

# Add the physical NIC to the bridge
ip link set eth1 master br0
ip link set eth1 up
ip link set br0 up

# Allow VLANs on the bridge port
bridge vlan add vid 100 dev eth1
bridge vlan add vid 200 dev eth1
bridge vlan add vid 300 dev eth1
```

## Step 2: Create a Cluster Network for VLAN Traffic

Create a custom cluster network in the Harvester UI:

1. Navigate to **Networks** → **ClusterNetworks/Configs**
2. Click **Create**
3. Set the cluster network name to `vlan`

The custom cluster network is not usable until you add a **Network Config** that enables it on the relevant nodes.

## Step 3: Create a Network Config for the Cluster Network

Enable the `vlan` cluster network on the nodes that will carry VM VLAN traffic:

1. On **Networks** → **ClusterNetworks/Configs**, click **Create Network Config** for `vlan`
2. Set the config name to `vlan-uplink`
3. On **Node Selector**, choose **Select all nodes** only if all nodes use the same dedicated NIC for this network; otherwise create separate configs for each uniform node group
4. On **Uplink**, select the dedicated NIC used for VM traffic, such as `eth1`
5. Leave the default bond mode unless you need a different bonding policy
6. Set the MTU consistently across all configs for this cluster network; use `1500` unless your nodes and switches are already configured end-to-end for jumbo frames
7. Click **Save**

## Step 4: Create VLAN Networks via the UI

1. Navigate to **Networks** → **VM Networks**
2. Click **Create**

For VLAN 100 (Production):
```text
Namespace:       default
Name:            prod-vlan-100
Type:            L2VlanNetwork
Mode:            Access
Cluster Network: vlan
VLAN ID:         100
Route Mode:      Manual
CIDR:            10.0.100.0/24
Gateway:         10.0.100.1
```

Repeat for each VLAN:
```text
Namespace:       default
Name:            staging-vlan-200
Type:            L2VlanNetwork
Mode:            Access
Cluster Network: vlan
VLAN ID:         200
Route Mode:      Manual
CIDR:            10.0.200.0/24
Gateway:         10.0.200.1

Namespace:       default
Name:            dmz-vlan-300
Type:            L2VlanNetwork
Mode:            Access
Cluster Network: vlan
VLAN ID:         300
Route Mode:      Manual
CIDR:            10.3.0.0/24
Gateway:         10.3.0.1
```

If your VLAN provides DHCP, select `Auto(DHCP)` on the **Route** tab instead of entering a manual CIDR and gateway.

## Step 5: Inspect VLAN Networks via kubectl

Harvester stores VM VLAN networks as Multus `NetworkAttachmentDefinition` objects. After you create the VM networks in the UI, inspect the generated definitions with `kubectl`:

```bash
kubectl get network-attachment-definitions.k8s.cni.cncf.io -n default
kubectl get network-attachment-definitions.k8s.cni.cncf.io prod-vlan-100 -n default -o yaml
```

Example output excerpt:

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: prod-vlan-100
  namespace: default
  labels:
    network.harvesterhci.io/clusternetwork: vlan
    network.harvesterhci.io/ready: "true"
    network.harvesterhci.io/type: L2VlanNetwork
    network.harvesterhci.io/vlan-id: "100"
spec:
  config: >-
    {"cniVersion":"0.3.1","name":"prod-vlan-100","type":"bridge","bridge":"vlan-br","promiscMode":true,"vlan":100,"ipam":{}}
```

## Step 6: Attach a VM to a VLAN Network

```yaml
# vm-in-production-vlan.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: prod-web-01
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 4
        resources:
          requests:
            memory: 8Gi
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
            - name: cloudinitdisk
              disk:
                bus: virtio
          interfaces:
            # Management interface for cluster access
            - name: default
              model: virtio
              masquerade: {}
            # Production VLAN interface
            - name: prod-net
              model: virtio
              macAddress: "02:00:00:00:01:64"
              bridge: {}
      networks:
        - name: default
          pod: {}
        - name: prod-net
          multus:
            networkName: default/prod-vlan-100  # References the NetworkAttachmentDefinition
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: prod-web-01-root
        - name: cloudinitdisk
          cloudInitNoCloud:
            userData: |
              #cloud-config
            networkData: |
              version: 2
              ethernets:
                prodnic:
                  match:
                    mac_address: "02:00:00:00:01:64"
                  set-name: prodnic
                  dhcp4: true
```

## Step 7: Verify VLAN Connectivity

```bash
# Access the VM console
virtctl console prod-web-01 -n default

# Inside the VM, verify both interfaces are present
ip addr show
ip route show

# Expected output:
# The management NIC has an address from the pod network
# The VLAN NIC appears as prodnic and has an address in 10.0.100.0/24

# Test VLAN reachability
ping -c 3 10.0.100.1   # VLAN 100 gateway

# Verify the generated Multus definition
kubectl get network-attachment-definitions.k8s.cni.cncf.io prod-vlan-100 -n default -o yaml
# Expect network.harvesterhci.io/ready: "true" and bridge "vlan-br" with vlan 100 in spec.config
```

## VLAN Isolation Testing

```bash
# Verify that VLAN 100 VMs cannot reach VLAN 200 VMs directly
# (should be blocked by switch/router unless explicitly routed)

# From a VM in VLAN 100:
ping -c 3 10.0.200.10  # Should fail unless inter-VLAN routing/firewall rules allow it

# From a VM in VLAN 100:
ping -c 3 10.0.100.10  # Should succeed when the peer VM is on the same VLAN and allows ICMP
```

## Conclusion

VLAN networks in Harvester provide a powerful mechanism for network isolation without requiring separate physical infrastructure. By leveraging 802.1Q tagging and Multus CNI, you can connect VMs to specific network segments that match your security and operational requirements. The declarative Kubernetes approach means VLAN configurations can be templated and deployed consistently across environments. Combine VLANs with external firewall rules and guest OS firewalls for a defense-in-depth network security strategy.
