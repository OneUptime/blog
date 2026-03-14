# How to Migrate Existing Workloads to Calico on OpenStack Red Hat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Migration

Description: A guide to migrating virtual machine workloads from OVS to Calico on Red Hat Enterprise Linux-based OpenStack.

---

## Introduction

Migrating from OVS-based networking to Calico on a RHEL OpenStack cluster follows the same general process as Ubuntu - VM shutdown, OVS cleanup, Calico installation, VM restart - with RHEL-specific package management and SELinux configuration steps. Planning for SELinux policy configuration is particularly important on RHEL, as new Calico operations that interact with iptables or network interfaces may trigger denials that need to be permitted.

## Prerequisites

- RHEL-based OpenStack with OVS networking
- Root access to controller and compute nodes
- All VMs snapshotted before migration
- A maintenance window

## Step 1: Snapshot All VMs

```bash
for vm in $(openstack server list -f value -c ID); do
  openstack server image create $vm --name "pre-migration-$vm"
done
```

## Step 2: Shut Down All VMs

```bash
openstack server list -f value -c ID | xargs -I{} openstack server stop {}
```

## Step 3: Remove OVS Components

```bash
# On controller
sudo systemctl stop openstack-neutron-openvswitch-agent

# On each compute node
sudo systemctl stop openstack-neutron-openvswitch-agent
sudo ovs-vsctl del-br br-int
sudo ovs-vsctl del-br br-tun
sudo dnf remove -y openstack-neutron-openvswitch
```

## Step 4: Install Calico on Controller

```bash
sudo dnf install -y python3-networking-calico

sudo crudini --set /etc/neutron/neutron.conf DEFAULT core_plugin calico

# etcd should already be running; if not:
sudo dnf install -y etcd
sudo systemctl enable --now etcd

sudo systemctl restart openstack-neutron
```

## Step 5: Install Felix on Compute Nodes

```bash
sudo dnf install -y calico-felix

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://<controller-ip>:2379
IptablesBackend = nft
EOF

# Configure SELinux
sudo ausearch -m AVC -ts recent | audit2allow -M calico-migrate
sudo semodule -i calico-migrate.pp

# Open firewall ports
sudo firewall-cmd --permanent --add-port=179/tcp
sudo firewall-cmd --permanent --add-port=2379/tcp
sudo firewall-cmd --reload

sudo systemctl enable --now calico-felix
```

## Step 6: Restart VMs and Verify

```bash
openstack server list -f value -c ID | xargs -I{} openstack server start {}
sleep 60
calicoctl get workloadendpoints -A
openstack server list
```

## Conclusion

Migrating from OVS to Calico on RHEL OpenStack requires VM shutdown, OVS removal, Calico installation with RHEL-appropriate SELinux configuration and firewalld rules, and VM restart. The RHEL-specific steps - SELinux policy generation and firewalld configuration - are essential for a successful migration and should be tested in a staging environment before applying to production.
