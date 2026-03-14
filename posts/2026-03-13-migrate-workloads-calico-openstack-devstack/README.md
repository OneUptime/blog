# How to Migrate Existing Workloads to Calico on OpenStack DevStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Migration, Development

Description: A guide to migrating a DevStack environment from OVS-based networking to Calico for development and testing purposes.

---

## Introduction

Migrating an existing DevStack environment from OVS networking to Calico lets you test the Calico-OpenStack integration with existing workload configurations without starting from scratch. The migration process in DevStack is simpler than production because you can update `local.conf` and re-run `./stack.sh`, which handles the CNI switch automatically.

If you want to preserve existing VM data during the migration, you need to take a more careful approach - snapshotting VMs, switching the plugin, and restoring the VMs. For most development purposes, a clean re-stack is preferable.

## Prerequisites

- DevStack running with OVS networking
- Existing test VMs and networks to preserve (optional)
- Root access to the DevStack VM

## Option 1: Clean Migration via Re-Stack

The simplest approach: update local.conf and re-run stack.

```bash
# Snapshot important data
source /opt/stack/devstack/openrc admin admin
openstack server list -f yaml > pre-migration-vms.yaml
openstack network list -f yaml > pre-migration-networks.yaml

# Update local.conf to use Calico
cat >> /opt/stack/devstack/local.conf << EOF

# Switch to Calico
Q_PLUGIN=calico
enable_plugin networking-calico https://opendev.org/openstack/networking-calico.git stable/yoga
enable_service calico-etcd,calico-felix,calico-bird
EOF

# Remove OVS settings
sed -i '/Q_PLUGIN=ovs/d' /opt/stack/devstack/local.conf

cd /opt/stack/devstack
./unstack.sh
./stack.sh
```

## Option 2: In-Place Migration (Data Preservation)

For complex development environments where re-stacking is too disruptive.

```bash
# Stop existing VMs
openstack server list -f value -c ID | xargs -I{} openstack server stop {}

# Stop OVS services
sudo systemctl stop devstack@q-agt
sudo ovs-vsctl del-br br-int

# Install networking-calico
cd /opt/stack
git clone https://opendev.org/openstack/networking-calico.git
cd networking-calico
pip3 install -e .

# Configure etcd
sudo apt-get install -y etcd
sudo systemctl enable --now etcd

# Update Neutron config
sudo crudini --set /etc/neutron/neutron.conf DEFAULT core_plugin calico

# Install and start Felix
sudo apt-get install -y calico-felix
cat <<EOF | sudo tee /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://127.0.0.1:2379
EOF
sudo systemctl enable --now calico-felix

sudo systemctl restart devstack@q-svc

# Start VMs
openstack server list -f value -c ID | xargs -I{} openstack server start {}
```

## Verify Migration

```bash
calicoctl node status
calicoctl get workloadendpoints -A
openstack server list
```

## Conclusion

Migrating a DevStack environment from OVS to Calico is most reliably done by updating `local.conf` and running a clean re-stack. For cases where existing test data must be preserved, the in-place migration approach - stopping OVS, installing Calico components, restarting Neutron - achieves the same result with more manual steps. Either approach results in a Calico-backed DevStack environment that reflects production Calico-OpenStack integration accurately.
