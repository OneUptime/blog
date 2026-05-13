# How to Install Calico on OpenStack Ubuntu Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Installation

Description: A step-by-step guide to installing Calico as the networking backend for OpenStack on Ubuntu servers.

---

## Introduction

Calico integrates with OpenStack as a networking backend through the Neutron plugin architecture. On Ubuntu-based OpenStack deployments, Calico replaces an OVS (Open vSwitch) Neutron backend and provides routed networking for OpenStack tenant networks. This approach avoids the L2 bridging and overlay model used by many Neutron backends, giving virtual machine traffic a routed network path through the physical fabric.

Calico's OpenStack integration requires deploying the `calico-control` package on the control plane nodes (alongside Neutron) and the `calico-compute` package on all compute nodes. The etcd cluster serves as the shared datastore between the OpenStack control plane and the Calico Felix agents on compute nodes.

This guide covers installing Calico as the Neutron backend on an Ubuntu OpenStack cluster.

## Prerequisites

- Ubuntu 22.04 or 20.04 servers for OpenStack
- An OpenStack release that runs with Python 3, with Caracal or later recommended, and Neutron installed (or being installed)
- An etcd cluster (can be co-located with control nodes)
- Network access between all nodes
- Root access to all nodes

## Step 1: Prepare Package Sources and etcd Access

Calico uses etcd as its datastore in OpenStack mode. On each control and compute node, add the Calico and BIRD package sources, then install the Python etcd gateway used by the OpenStack driver and DHCP agent.

```bash
sudo add-apt-repository -y ppa:project-calico/calico-3.32
sudo add-apt-repository -y ppa:cz.nic-labs/bird
sudo apt-get update

sudo apt-get install -y python3-pip
sudo pip3 install etcd3gw==2.4.0
```

## Step 2: Install the Calico Neutron Plugin on the Controller

On each controller, install the Calico control package:

```bash
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get install -y calico-control
```

Configure Neutron to use Calico:

```ini
# /etc/neutron/neutron.conf

[DEFAULT]
core_plugin = calico
service_plugins = qos

[calico]
etcd_host = <etcd-ip>
etcd_port = 2379
```

Restart Neutron:

```bash
sudo systemctl restart neutron-server
```

## Step 3: Configure OpenStack Services on Compute Nodes

On each compute node, make sure Nova does not expect the Neutron metadata proxy when Calico is providing VM metadata through Nova.

```ini
# /etc/nova/nova.conf

[neutron]
service_metadata_proxy = False
```

Stop the OVS agent if it is running, and restart Nova compute after the Nova configuration change:

```bash
sudo systemctl stop openvswitch-switch neutron-openvswitch-agent
sudo systemctl disable openvswitch-switch neutron-openvswitch-agent
sudo systemctl restart nova-compute
```

## Step 4: Install Calico Felix on Compute Nodes

On each compute node:

```bash
sudo apt-get install -y neutron-common neutron-dhcp-agent nova-api-metadata
sudo systemctl stop neutron-dhcp-agent
sudo systemctl disable neutron-dhcp-agent

sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get install -y calico-dhcp-agent calico-compute

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdAddr = <etcd-ip>:2379
EndpointStatusPathPrefix = none
EOF

sudo systemctl restart calico-felix
```

## Step 5: Configure BGP for OpenStack Networks

Calico's Ubuntu OpenStack packages use BIRD to advertise VM routes. If you are peering compute nodes with a route reflector, generate the BIRD configuration on each compute node:

```bash
sudo calico-gen-bird-conf.sh <compute-node-ip> <route-reflector-ip> <bgp-as-number>
sudo systemctl restart bird
```

For a full BGP mesh, use the generated BIRD configuration as a starting point and add the required peerings for each compute host.

## Step 6: Verify the Integration

```bash
# On the controller
openstack network list

# On a compute node
ip route
sudo birdc show protocols
```

## Conclusion

Installing Calico on OpenStack Ubuntu replaces OVS with a routed Neutron backend that routes virtual machine traffic through the physical network. The installation involves deploying the Calico Neutron plugin on the controller, Felix agents on compute nodes, BIRD for route advertisement, and configuring etcd as the shared datastore. This provides OpenStack tenants with consistent, low-latency network performance.
