# How to Install Calico on OpenStack Red Hat Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Installation

Description: A step-by-step guide to installing Calico as the networking backend for OpenStack on Red Hat Enterprise Linux servers.

---

## Introduction

Installing Calico on Red Hat Enterprise Linux (RHEL) based OpenStack deployments follows a similar architecture to Ubuntu - the Calico Neutron plugin on the controller and Felix on compute nodes - but uses RPM packages instead of Debian packages, and integrates with RHEL's systemd and SELinux differently. SELinux in particular requires specific policy configuration to allow Calico's Felix daemon to manage iptables and create network interfaces.

Red Hat OpenStack Platform (RHOSP) has its own packaging and deployment mechanisms through Director (TripleO). This guide covers community OpenStack on RHEL rather than RHOSP, since RHOSP has vendor-specific deployment tools.

## Prerequisites

- RHEL 8 or 9 servers for OpenStack
- Community OpenStack deployed or being deployed
- etcd cluster for Calico's datastore
- Root access to all nodes

## Step 1: Configure SELinux for Calico

Calico's Felix requires specific SELinux permissions.

```bash
# Allow Felix to manage iptables and network interfaces
sudo setsebool -P nis_enabled 1
sudo setsebool -P httpd_can_network_connect 1

# Install SELinux policy tools
sudo dnf install -y policycoreutils setools-console

# Check for denials during installation
sudo ausearch -m AVC -ts recent | grep calico
```

## Step 2: Install etcd on the Controller

```bash
sudo dnf install -y etcd

cat <<EOF | sudo tee /etc/etcd/etcd.conf
ETCD_NAME=controller
ETCD_DATA_DIR=/var/lib/etcd
ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379
ETCD_ADVERTISE_CLIENT_URLS=http://<controller-ip>:2379
EOF

sudo systemctl enable --now etcd
```

## Step 3: Install Calico Neutron Plugin on Controller

```bash
sudo dnf install -y python3-networking-calico

# Configure Neutron
sudo crudini --set /etc/neutron/neutron.conf DEFAULT core_plugin calico
```

Restart Neutron:

```bash
sudo systemctl restart openstack-neutron
```

## Step 4: Install Felix on Compute Nodes

```bash
# On each compute node
sudo dnf install -y calico-felix

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://<controller-ip>:2379
EOF

# Configure SELinux for Felix
sudo semanage port -a -t http_port_t -p tcp 9091  # Prometheus metrics

sudo systemctl enable --now calico-felix
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
sudo calicoctl node status
calicoctl get workloadendpoints -A
```

## Conclusion

Installing Calico on RHEL-based OpenStack requires the additional step of configuring SELinux to allow Felix's privileged network management operations and opening BGP port 179 in firewalld. Beyond these RHEL-specific steps, the installation mirrors the Ubuntu workflow - etcd on the controller, the Calico Neutron plugin, and Felix on compute nodes.
