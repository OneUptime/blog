# How to Migrate Existing Workloads to Calico on OpenStack Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Migration

Description: A guide to migrating virtual machine workloads from OVS-based OpenStack networking to Calico on Ubuntu.

---

## Introduction

Migrating an Ubuntu OpenStack deployment from OVS-based networking to Calico is a significant infrastructure change. All existing VMs will have their network backend changed from OVS tap interfaces to Calico-managed tap interfaces, and the Neutron plugin will switch from the ML2+OVS mechanism driver to the Calico mechanism driver. VMs must be shut down and restarted after the migration to use the new networking backend.

The migration is best done during a scheduled maintenance window when all VMs can be shut down, the networking backend replaced, and VMs restarted with new network assignments. Live migration (hot migration) without VM downtime is not supported for Calico-to-OVS migration.

## Prerequisites

- An Ubuntu OpenStack deployment with OVS networking
- Root access to controller and compute nodes
- All VM workloads backed up or snapshotted
- A maintenance window

## Step 1: Snapshot All VMs

```bash
for vm in $(openstack server list -f value -c ID); do
  openstack server image create $vm --name "pre-migration-snapshot-$vm"
done
```

## Step 2: Shut Down All VMs

```bash
for vm in $(openstack server list -f value -c ID); do
  openstack server stop $vm
done
openstack server list
```

## Step 3: Remove OVS Neutron Plugin

On the controller:

```bash
sudo systemctl stop neutron-server
sudo apt-get remove -y neutron-openvswitch-agent
```

Clean up OVS bridges:

```bash
# On each compute node
sudo systemctl stop neutron-openvswitch-agent
sudo ovs-vsctl del-br br-int
sudo ovs-vsctl del-br br-ex
```

## Step 4: Install Calico Neutron Plugin

```bash
# On the controller
sudo apt-get install -y python3-networking-calico

# Configure Neutron for Calico
sudo sed -i 's/core_plugin = .*/core_plugin = calico/' /etc/neutron/neutron.conf
sudo systemctl start neutron-server
```

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

## Step 5: Recreate OpenStack Networks

After switching to Calico, recreate your tenant networks to use Calico's flat network model.

```bash
openstack network create calico-tenant-net
openstack subnet create --network calico-tenant-net \
  --subnet-range 10.65.0.0/24 --ip-version 4 calico-tenant-subnet
```

## Step 6: Restart VMs

```bash
for vm in $(openstack server list -f value -c ID); do
  openstack server start $vm
done
```

Verify VMs receive Calico-assigned IPs and are reachable.

## Conclusion

Migrating from OVS to Calico in Ubuntu OpenStack requires a full VM shutdown, OVS cleanup, Calico plugin installation, network recreation, and VM restart. The migration window must account for all these steps plus verification. While disruptive, the result - BGP-routed flat networking without overlay tunnels - provides better performance and simpler operation for large OpenStack deployments.
