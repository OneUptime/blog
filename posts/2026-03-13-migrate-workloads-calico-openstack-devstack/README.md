# How to Migrate Existing Workloads to Calico on OpenStack DevStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Migration, Development

Description: A guide to migrating a DevStack environment from OVS-based networking to Calico for development and testing purposes.

---

## Introduction

Migrating an existing DevStack environment from OVS networking to Calico lets you test the Calico-OpenStack integration without rebuilding your whole test plan from scratch. The migration process in DevStack is simpler than production because you can update `local.conf` and re-run `./stack.sh`, which installs and configures the networking-calico Neutron driver and Calico services.

If you want to preserve existing VM data during the migration, you need to take a more careful approach - snapshotting VMs, switching the plugin, and recreating the VMs from those snapshots. For most development purposes, a clean re-stack is preferable.

## Prerequisites

- DevStack running with OVS networking
- Existing test VMs and networks to preserve (optional)
- Root access to the DevStack VM

## Option 1: Clean Migration via Re-Stack

The simplest approach: update local.conf and re-run stack.

```bash
source /opt/stack/devstack/openrc admin admin
openstack server list -f yaml > pre-migration-vms.yaml
openstack network list -f yaml > pre-migration-networks.yaml

# Remove OVS-specific settings from local.conf
sed -i '/^Q_PLUGIN=ovs/d' /opt/stack/devstack/local.conf
sed -i '/^Q_AGENT=openvswitch/d' /opt/stack/devstack/local.conf

# Add the Calico DevStack plugin under a localrc section
cat >> /opt/stack/devstack/local.conf << EOF

[[local|localrc]]
enable_plugin networking-calico https://github.com/projectcalico/networking-calico
EOF

cd /opt/stack/devstack
./unstack.sh
./clean.sh
./stack.sh
```

## Option 2: Snapshot and Recreate (Data Preservation)

For complex development environments where instance data matters, snapshot the servers first, re-stack with Calico, then recreate the servers on Calico-backed networks. A live in-place conversion of a DevStack cloud from OVS agents to networking-calico is not a supported DevStack workflow.

```bash
source /opt/stack/devstack/openrc admin admin

# Record the current VM and network layout
openstack server list -f yaml > pre-migration-vms.yaml
openstack network list -f yaml > pre-migration-networks.yaml

# Snapshot image-backed instances before re-stacking
for server in $(openstack server list -f value -c ID); do
  openstack server image create --wait --name "pre-calico-${server}" "${server}"
done

# Re-stack DevStack with the Calico plugin as shown in Option 1, then recreate
# the required routed Calico networks and boot replacement VMs from the snapshots.
openstack image list -f value -c Name | grep '^pre-calico-'
```

## Verify Migration

```bash
calicoctl node status
calicoctl get workloadendpoints -A
openstack server list
```

## Conclusion

Migrating a DevStack environment from OVS to Calico is most reliably done by updating `local.conf` and running a clean re-stack. For cases where existing test data must be preserved, snapshot the VMs first and recreate them after DevStack has been rebuilt with the Calico plugin. Either approach results in a Calico-backed DevStack environment that uses the same networking-calico integration points as a Calico OpenStack deployment.
