# How to Install Calico on OpenStack Ubuntu Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Installation

Description: A step-by-step guide to installing Calico as the networking backend for OpenStack on Ubuntu servers.

---

## Introduction

Calico integrates with OpenStack as a networking backend through the Neutron plugin architecture. On Ubuntu-based OpenStack deployments, Calico replaces the default OVS (Open vSwitch) Neutron plugin and provides BGP-based routing for OpenStack tenant networks. This approach eliminates VLAN and VXLAN overlay networks, giving virtual machine traffic the same BGP-routed network performance as physical servers.

Calico's OpenStack integration requires deploying the `neutron-calico` package on the control plane nodes (alongside Neutron) and the `calico-felix` service on all compute nodes. The etcd cluster serves as the shared datastore between the OpenStack control plane and the Calico Felix agents on compute nodes.

This guide covers installing Calico as the Neutron backend on an Ubuntu OpenStack cluster.

## Prerequisites

- Ubuntu 22.04 or 20.04 servers for OpenStack
- OpenStack Yoga or later with Neutron installed (or being installed)
- An etcd cluster (can be co-located with control nodes)
- Network access between all nodes
- Root access to all nodes

## Step 1: Install etcd on the Control Node

Calico uses etcd as its datastore in OpenStack mode.

```bash
sudo apt-get install -y etcd

cat <<EOF | sudo tee /etc/etcd/etcd.conf
ETCD_NAME=controller
ETCD_DATA_DIR=/var/lib/etcd
ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379
ETCD_ADVERTISE_CLIENT_URLS=http://<controller-ip>:2379
EOF

sudo systemctl enable --now etcd
```

## Step 2: Install the Calico Neutron Plugin on the Controller

```bash
sudo apt-get install -y python3-networking-calico
```

Configure Neutron to use Calico:

```ini
# /etc/neutron/neutron.conf
[DEFAULT]
core_plugin = calico
```

## Step 3: Configure the Calico ML2 Settings

```ini
# /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
mechanism_drivers = calico

[calico]
etcd_host = <controller-ip>
etcd_port = 2379
```

Restart Neutron:

```bash
sudo systemctl restart neutron-server
```

## Step 4: Install Calico Felix on Compute Nodes

On each compute node:

```bash
sudo apt-get install -y calico-compute calico-felix

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://<controller-ip>:2379
EOF

sudo systemctl enable --now calico-felix
```

## Step 5: Configure BGP for OpenStack Networks

```bash
sudo calicoctl node run --ip=<compute-node-ip> --as=64512
```

## Step 6: Verify the Integration

```bash
# On the controller
sudo neutron net-list
sudo calicoctl get workloadendpoints -A

# On a compute node
sudo calicoctl node status
```

## Conclusion

Installing Calico on OpenStack Ubuntu replaces OVS with a BGP-routing Neutron backend that routes virtual machine traffic natively through the physical network. The installation involves deploying the Calico Neutron plugin on the controller, Felix agents on compute nodes, and configuring etcd as the shared datastore. This provides OpenStack tenants with consistent, low-latency network performance.
