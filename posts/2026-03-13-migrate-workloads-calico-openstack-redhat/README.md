# How to Migrate Existing Workloads to Calico on OpenStack Red Hat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Migration

Description: A guide to migrating virtual machine workloads from OVS to Calico on Red Hat Enterprise Linux-based OpenStack.

---

## Introduction

Migrating from OVS-based networking to Calico on a RHEL OpenStack cluster follows the same general process as a first-time Calico OpenStack install: back up workloads, shut them down, remove incompatible OpenStack networking state, clean up OVS services, install Calico control and compute components, and recreate the workloads on Calico-backed networks. The Calico OpenStack RHEL installation path is no longer actively tested, so this should be rehearsed in staging before any production migration. Planning for SELinux policy configuration is particularly important on RHEL, as new Calico operations that interact with iptables or network interfaces may trigger denials that need to be reviewed before being permitted.

## Prerequisites

- RHEL 8 or later OpenStack with Neutron and OVS/ML2 networking
- Root access to controller and compute nodes
- All VMs snapshotted before migration
- An etcdv3 datastore reachable from Neutron servers and compute nodes
- BGP routing or route reflectors planned for Calico workload routes
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

After confirming the snapshots are usable, delete the existing instances first. Then remove any remaining routers, subnets, and networks so the Calico Neutron plugin does not inherit incompatible OVS/ML2 state.

```bash
openstack server list -f value -c ID | xargs -r -I{} openstack server delete {}
```

## Step 3: Remove OVS Components

```bash
# On controller

sudo systemctl disable --now neutron-openvswitch-agent || true

# On each compute node
sudo systemctl disable --now neutron-openvswitch-agent openvswitch || true
openstack network agent list
openstack network agent delete <ovs-agent-id>
```

## Step 4: Install Calico on Controller

```bash
sudo tee /etc/yum.repos.d/calico.repo >/dev/null <<EOF
[calico]
name=Calico Repository
baseurl=https://binaries.projectcalico.org/rpm/calico-3.32/
enabled=1
skip_if_unavailable=0
gpgcheck=1
gpgkey=https://binaries.projectcalico.org/rpm/calico-3.32/key
priority=97
EOF

sudo yum install -y python3-pip crudini calico-control
sudo pip3 install etcd3gw==2.4.0
sudo crudini --set /etc/neutron/neutron.conf DEFAULT core_plugin calico
sudo crudini --set /etc/neutron/neutron.conf DEFAULT service_plugins qos
sudo crudini --set /etc/neutron/neutron.conf calico etcd_host <etcd-ip>

# etcd should already be running; if not:
sudo yum install -y etcd
sudo systemctl enable --now etcd

sudo systemctl restart neutron-server
```

## Step 5: Install Felix on Compute Nodes

```bash
sudo yum install -y python3-pip crudini openstack-neutron calico-dhcp-agent bird bird6 calico-compute
sudo pip3 install etcd3gw==2.4.0

sudo crudini --set /etc/neutron/neutron.conf calico etcd_host <etcd-ip>
sudo crudini --set /etc/neutron/neutron.conf oslo_concurrency lock_path '$state_path/lock'

sudo systemctl disable --now neutron-dhcp-agent neutron-l3-agent || true
sudo systemctl restart openstack-nova-compute

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdAddr = <etcd-ip>:2379
EndpointStatusPathPrefix = none
IptablesBackend = nft
EOF

# Configure SELinux after reviewing the AVC denials
sudo ausearch -m AVC -ts recent
sudo ausearch -m AVC -ts recent | audit2allow -M calico-migrate
sudo semodule -i calico-migrate.pp

# Calico recommends disabling firewalld or other iptables managers.
# If firewalld must remain enabled, allow the required traffic.
if systemctl is-active --quiet firewalld; then
  sudo firewall-cmd --permanent --add-port=179/tcp
  sudo firewall-cmd --permanent --add-port=2379/tcp
  sudo firewall-cmd --permanent --add-protocol=ipencap
  sudo firewall-cmd --reload
else
  sudo systemctl disable --now firewalld || true
fi

sudo systemctl enable --now bird bird6 calico-felix
```

## Step 6: Recreate VMs and Verify

```bash
openstack server create --flavor <flavor> --image pre-migration-<vm-id> --network <calico-network> <new-vm-name>
calicoctl get workloadendpoints -A
openstack server list
```

## Conclusion

Migrating from OVS to Calico on RHEL OpenStack requires VM shutdown, removal of incompatible OVS/ML2 state, Calico installation with RHEL-appropriate SELinux review, BGP routing configuration, and workload recreation from verified snapshots. The RHEL-specific steps - SELinux policy review and either disabling firewalld or explicitly allowing required Calico traffic - are important migration tasks and should be tested in a staging environment before applying to production.
