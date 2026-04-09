# How to Deploy Ceph Using ceph-ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Ansible, Deployment, Storage, Automation

Description: Learn how to deploy a Ceph cluster using ceph-ansible, the official Ansible-based deployment tool for automated, reproducible Ceph installations.

---

## What Is ceph-ansible

ceph-ansible is the official Ansible collection and playbook suite for deploying and managing Ceph clusters. It provides idempotent playbooks for installing monitors, OSDs, managers, RGW gateways, MDS daemons, and NFS gateways on bare-metal or virtual machines.

Note: ceph-ansible supports Ceph releases through Pacific. For Quincy and later, cephadm is the recommended tool. However, many production deployments still use ceph-ansible and it remains widely used.

## Installation

```bash
# Install Ansible
pip install ansible

# Clone the ceph-ansible repository
git clone https://github.com/ceph/ceph-ansible.git
cd ceph-ansible

# Check out the branch for your target Ceph release
git checkout stable-6.0  # for Pacific

pip install -r requirements.txt

# Copy the sample playbooks
cp site.yml.sample site.yml
```

## Inventory Configuration

Define your hosts in the Ansible inventory:

```ini
[mons]
mon1 ansible_host=192.168.1.10
mon2 ansible_host=192.168.1.11
mon3 ansible_host=192.168.1.12

[osds]
osd1 ansible_host=192.168.1.20
osd2 ansible_host=192.168.1.21
osd3 ansible_host=192.168.1.22

[mgrs]
mon1

[mdss]
mds1 ansible_host=192.168.1.10

[clients]
client1 ansible_host=192.168.1.50
```

## Group Variables

Configure Ceph settings in `group_vars/all.yml`:

```yaml
---
ceph_origin: repository
ceph_repository: community
ceph_stable_release: pacific

monitor_interface: eth0
public_network: 192.168.1.0/24
cluster_network: 192.168.2.0/24

osd_scenario: lvm
osd_objectstore: bluestore

ceph_conf_overrides:
  global:
    osd_pool_default_size: 3
    osd_pool_default_min_size: 2
    osd_pool_default_pg_num: 128
```

Configure OSD devices in `group_vars/osds.yml`:

```yaml
---
lvm_volumes:
  - data: /dev/sdb
    data_vg: ceph-vg-sdb
  - data: /dev/sdc
    data_vg: ceph-vg-sdc
```

## Running the Deployment Playbook

```bash
# Run the main site playbook
ansible-playbook site.yml -i inventory/hosts \
  --ask-become-pass \
  -v
```

For containerized Ceph daemons, use the container site playbook instead:

```bash
cp site-container.yml.sample site-container.yml

ansible-playbook site-container.yml -i inventory/hosts \
  --ask-become-pass \
  -v
```

## Adding OSDs to an Existing Cluster

```bash
# Add new OSD hosts to the inventory, then re-run the site playbook
# targeting only the new hosts
ansible-playbook site.yml \
  -i inventory/hosts \
  --limit "new-osd-host"
```

## Verifying the Deployment

```bash
# Check cluster status from a monitor node
ansible mons -i inventory/hosts -m shell -a "ceph status"

# Check OSD status
ansible mons -i inventory/hosts -m shell -a "ceph osd stat"
```

## Rolling Upgrades

ceph-ansible includes upgrade playbooks for rolling cluster updates:

```bash
# Set the target version
# In group_vars/all.yml: ceph_stable_release: quincy

ansible-playbook infrastructure-playbooks/rolling_update.yml \
  -i inventory/hosts \
  -e "ceph_stable_release=quincy"
```

## Summary

ceph-ansible provides a mature, idempotent deployment framework for Ceph clusters using familiar Ansible patterns. An inventory file defines host roles, group variables configure cluster-wide settings like network ranges and OSD scenarios, and the site playbook orchestrates the full installation. While cephadm has superseded ceph-ansible for new deployments using Quincy and later, ceph-ansible remains a solid choice for organizations with existing Ansible infrastructure or clusters running Pacific and earlier Ceph releases.
