# How to Migrate Existing Workloads to Calico on OpenStack Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Migration

Description: A guide to migrating virtual machine workloads from OVS-based OpenStack networking to Calico on Ubuntu.

---

## Introduction

Migrating an Ubuntu OpenStack deployment from OVS-based networking to Calico is a significant infrastructure change. Existing VM workloads should be captured as snapshots or other backups, the incompatible OVS-backed OpenStack networking state removed, and the workloads recreated after the Neutron plugin is switched from the ML2+OVS mechanism driver to the Calico core plugin.

The migration is best done during a scheduled maintenance window when all VMs can be shut down, the networking backend replaced, and workloads recreated with new network assignments. Live migration is supported by Calico for VMs that are already running on Calico, but it is not a supported way to change an existing OVS-backed VM to Calico without downtime.

## Prerequisites

- An Ubuntu OpenStack deployment with OVS networking
- Root access to controller and compute nodes
- All VM workloads backed up or snapshotted
- An etcd v3 cluster reachable by all Neutron servers and compute nodes
- BGP peering or route reflectors configured to accept routes from the compute nodes
- A maintenance window

## Step 1: Snapshot All VMs

```bash
for vm in $(openstack server list -f value -c ID); do
  openstack server image create --wait --name "pre-migration-snapshot-$vm" "$vm"
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
sudo apt-get remove -y neutron-openvswitch-agent || true
```

Before installing Calico, remove incompatible OpenStack state that was created for the OVS backend:

```bash
for vm in $(openstack server list -f value -c ID); do
  openstack server delete "$vm"
done

# Delete routers, subnets, and networks that will be recreated for Calico.
openstack router list
openstack subnet list
openstack network list
```

Clean up OVS bridges only after confirming they are no longer used for host connectivity:

```bash
# On each compute node

sudo systemctl stop neutron-openvswitch-agent || true
sudo ovs-vsctl --if-exists del-br br-int
# Delete br-ex only if it was created solely for Neutron OVS external networking.
sudo ovs-vsctl --if-exists del-br br-ex
```

## Step 4: Install Calico Neutron Plugin

```bash
# On the controller
sudo add-apt-repository ppa:project-calico/calico-3.32
sudo add-apt-repository ppa:cz.nic-labs/bird
sudo apt-get update
sudo apt-get install -y crudini python3-etcd3gw calico-control

# Configure Neutron for Calico
sudo crudini --set /etc/neutron/neutron.conf DEFAULT core_plugin calico
sudo crudini --set /etc/neutron/neutron.conf DEFAULT service_plugins qos
sudo crudini --set /etc/neutron/neutron.conf calico etcd_host <etcd-ip>
sudo systemctl restart neutron-server
```

On each compute node:

```bash
sudo add-apt-repository ppa:project-calico/calico-3.32
sudo add-apt-repository ppa:cz.nic-labs/bird
sudo apt-get update
sudo apt-get install -y crudini python3-etcd3gw neutron-common neutron-dhcp-agent nova-api-metadata
sudo crudini --set /etc/neutron/neutron.conf calico etcd_host <etcd-ip>
sudo systemctl restart nova-compute
sudo systemctl stop neutron-dhcp-agent || true
sudo apt-get install -y calico-dhcp-agent calico-compute

cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdAddr = <etcd-ip>:2379
EndpointStatusPathPrefix = none
EOF

calico-gen-bird-conf.sh <compute-node-ip> <route-reflector-ip> <bgp-as-number>
sudo systemctl restart calico-felix
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
openstack server create \
  --image pre-migration-snapshot-<old-vm-id> \
  --flavor <flavor> \
  --network calico-tenant-net \
  <new-server-name>
```

Repeat for each workload snapshot, then verify the rebuilt VMs receive Calico-assigned IPs and are reachable.

## Conclusion

Migrating from OVS to Calico in Ubuntu OpenStack requires a full VM shutdown, OVS cleanup, Calico plugin installation, network recreation, and workload rebuild from snapshots or backups. The migration window must account for all these steps plus verification. While disruptive, the result - BGP-routed flat networking without overlay tunnels - provides better performance and simpler operation for large OpenStack deployments.
