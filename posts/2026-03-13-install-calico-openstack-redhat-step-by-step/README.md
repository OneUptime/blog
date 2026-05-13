# How to Install Calico on OpenStack Red Hat Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Installation

Description: A step-by-step guide to installing Calico as the networking backend for OpenStack on Red Hat Enterprise Linux servers.

---

## Introduction

Installing Calico on Red Hat Enterprise Linux (RHEL) based OpenStack deployments follows a similar architecture to Ubuntu - the Calico Neutron driver and DHCP agent integrate with Neutron, while Felix and BIRD run on compute nodes - but uses RPM packages instead of Debian packages. The current Calico documentation notes that the OpenStack RHEL installation path is no longer actively tested, so validate these steps in a staging environment before using them for production.

Red Hat OpenStack Platform (RHOSP) has its own packaging and deployment mechanisms through Director (TripleO). This guide covers community OpenStack on RHEL rather than RHOSP, since RHOSP has vendor-specific deployment tools.

## Prerequisites

- RHEL servers for OpenStack
- Community OpenStack deployed or being deployed
- etcd cluster for Calico's datastore, reachable from all control and compute nodes
- Working DNS between the RHEL hosts, or equivalent `/etc/hosts` entries
- Root access to all nodes

## Step 1: Configure RHEL Package Prerequisites

Add the EPEL repository if it is not already enabled, then configure the Calico RPM repository and install the Python etcd client used by the OpenStack driver and DHCP agent.

```bash
sudo dnf install -y epel-release

cat <<EOF | sudo tee /etc/yum.repos.d/calico.repo
[calico]
name=Calico Repository
baseurl=https://binaries.projectcalico.org/rpm/calico-3.32/
enabled=1
skip_if_unavailable=0
gpgcheck=1
gpgkey=https://binaries.projectcalico.org/rpm/calico-3.32/key
priority=97
EOF

sudo dnf install -y python3-pip crudini
sudo pip3 install etcd3gw==2.4.0
```

## Step 2: Configure Calico's etcd Connection

```bash
sudo crudini --set /etc/neutron/neutron.conf calico etcd_host <etcd-ip>
```

## Step 3: Install Calico Neutron Plugin on Controller

```bash
sudo dnf install -y calico-control

# Configure Neutron
sudo crudini --set /etc/neutron/neutron.conf DEFAULT core_plugin calico
sudo crudini --set /etc/neutron/neutron.conf DEFAULT service_plugins qos
```

Restart Neutron:

```bash
sudo systemctl restart neutron-server
```

## Step 4: Install Felix on Compute Nodes

```bash
# On each compute node
sudo dnf install -y openstack-neutron calico-dhcp-agent bird bird6 calico-compute

sudo systemctl stop neutron-dhcp-agent neutron-l3-agent neutron-openvswitch-agent openvswitch || true
sudo systemctl disable neutron-dhcp-agent neutron-l3-agent neutron-openvswitch-agent openvswitch || true

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdAddr = <etcd-ip>:2379
EndpointStatusPathPrefix = none
EOF

sudo systemctl restart calico-felix
sudo systemctl enable --now bird bird6
```

## Step 5: Configure Firewall for BGP

```bash
# On all nodes, allow BGP
sudo firewall-cmd --permanent --add-port=179/tcp
sudo firewall-cmd --reload
```

## Step 6: Verify Installation

```bash
sudo systemctl status calico-felix
sudo systemctl status bird
ip route
calicoctl get workloadendpoints -A
```

## Conclusion

Installing Calico on RHEL-based OpenStack requires the Calico RPM repository, Calico's Neutron driver and DHCP agent, Felix, BIRD, and firewall access for BGP port 179. Beyond these RHEL-specific packaging and service differences, the installation mirrors the Ubuntu workflow - OpenStack components write endpoint data to etcd, Felix programs dataplane state on compute nodes, and BIRD advertises workload routes.
