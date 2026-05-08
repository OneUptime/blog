# How to Upgrade Calico on OpenStack DevStack Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Upgrade, Development

Description: A guide to upgrading Calico in a DevStack development environment while preserving test data.

---

## Introduction

Upgrading Calico in a DevStack environment is typically done by updating the `networking-calico` Git reference in `local.conf` and re-running `./stack.sh`. DevStack uses the Git ref from `enable_plugin` when cloning a plugin; for an existing checkout, set `RECLONE=yes` if you want `stack.sh` to refresh the repository automatically. This makes upgrades simple but also means that a full rebuild or `clean.sh` can reset DevStack-managed state and Calico configuration stored in etcd (IP pools, Felix configuration).

For DevStack upgrades where you want to preserve your test data (VMs, networks, IP allocations), you can update just the Calico packages without a full DevStack re-run.

## Prerequisites

- DevStack with Calico installed
- Familiar with DevStack workflow

## Option 1: Full Re-Stack (Simplest)

Update the branch or version in `local.conf`:

```bash
# Update the networking-calico Git ref in local.conf
sed -i 's/<old-ref>/<target-ref>/' /opt/stack/devstack/local.conf

# Make stack.sh refresh an existing plugin checkout
grep -q '^RECLONE=' /opt/stack/devstack/local.conf \
  && sed -i 's/^RECLONE=.*/RECLONE=yes/' /opt/stack/devstack/local.conf \
  || printf '\nRECLONE=yes\n' >> /opt/stack/devstack/local.conf

# Re-run
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
git checkout <target-ref>
pip3 install --upgrade -e .

# Restart Neutron to pick up the new plugin code
sudo systemctl restart devstack@q-svc
sudo systemctl status devstack@q-svc
```

Update Felix:

```bash
# If Felix is installed as a package
sudo apt-get update
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
openstack server add security group upgrade-test-vm upgrade-sg
# Verify ICMP works, TCP does not
```

## Conclusion

Upgrading Calico in DevStack has two paths: a full re-stack that refreshes the plugin checkout and gives you a clean service restart path, and an in-place package upgrade that preserves existing VMs and networks but requires manual service restarts. For most development scenarios, the full re-stack is preferable as it ensures a clean, known-good starting state. The in-place approach is useful when you need to test upgrade-specific behavior with real workload data.
