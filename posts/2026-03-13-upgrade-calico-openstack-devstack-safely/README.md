# How to Upgrade Calico on OpenStack DevStack Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Upgrade, Development

Description: A guide to upgrading Calico in a DevStack development environment while preserving test data.

---

## Introduction

Upgrading Calico in a DevStack environment is typically done by updating the `networking-calico` branch reference in `local.conf` and re-running `./stack.sh`. DevStack's installation process re-clones or updates all plugin repositories before installing them. This makes upgrades simple but also means that any configuration stored in etcd (IP pools, Felix configuration) will be reset if you run `./unstack.sh` first.

For DevStack upgrades where you want to preserve your test data (VMs, networks, IP allocations), you can update just the Calico packages without a full DevStack re-run.

## Prerequisites

- DevStack with Calico installed
- Familiar with DevStack workflow

## Option 1: Full Re-Stack (Simplest)

Update the branch or version in `local.conf`:

```bash
# Update local.conf
sed -i 's/stable\/yoga/stable\/zed/' /opt/stack/devstack/local.conf
# Update networking-calico version
sed -i 's/stable\/yoga/stable\/zed/' /opt/stack/devstack/local.conf

# Re-run (this resets all data)
cd /opt/stack/devstack
./unstack.sh
./stack.sh
```

## Option 2: In-Place Upgrade (Preserves Data)

Update the networking-calico package without full re-stack:

```bash
# Update networking-calico source
cd /opt/stack/networking-calico
git fetch
git checkout stable/zed
pip3 install -e . --upgrade

# Restart Neutron to pick up the new plugin code
sudo systemctl restart devstack@q-svc
sudo systemctl status devstack@q-svc
```

Update Felix:

```bash
# If Felix is installed as a package
sudo apt-get install --only-upgrade calico-felix
sudo systemctl restart devstack@calico-felix
```

## Step 3: Verify After Upgrade

```bash
calicoctl version
source /opt/stack/devstack/openrc admin admin
openstack server list
calicoctl get workloadendpoints -A
```

## Step 4: Test Networking Post-Upgrade

```bash
openstack server create --network devstack-net \
  --image cirros --flavor cirros256 upgrade-test-vm
openstack server list
calicoctl get workloadendpoints -A | grep upgrade-test
```

## Step 5: Test Security Group Policy

```bash
openstack security group create upgrade-sg
openstack security group rule create --protocol icmp upgrade-sg
openstack server set upgrade-test-vm --security-group upgrade-sg
# Verify ICMP works, TCP does not
```

## Conclusion

Upgrading Calico in DevStack has two paths: a full re-stack that resets all data but guarantees a clean environment, and an in-place package upgrade that preserves existing VMs and networks but requires manual service restarts. For most development scenarios, the full re-stack is preferable as it ensures a clean, known-good starting state. The in-place approach is useful when you need to test upgrade-specific behavior with real workload data.
