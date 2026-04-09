# How to Deploy Ceph Using ceph-salt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Salt, Deployment, Storage, SUSE

Description: Learn how to deploy a Ceph cluster using ceph-salt, the Salt-based bootstrap and lifecycle management tool developed for SUSE Enterprise Storage.

---

## What Is ceph-salt

ceph-salt is a Salt-based tool for bootstrapping and managing Ceph clusters with cephadm as the backend. It was developed primarily for SUSE Enterprise Storage and provides a structured way to define cluster topology using Salt pillars and apply it through cephadm. ceph-salt handles the pre-bootstrap phase (OS configuration, package installation, SSH key distribution) and then delegates runtime management to cephadm.

## Prerequisites

Install Salt on all nodes:

```bash
# On SUSE/openSUSE
sudo zypper install salt-master salt-minion

# On RHEL/CentOS
sudo dnf install salt-master salt-minion

# Start and enable Salt
sudo systemctl enable --now salt-master  # on master node
sudo systemctl enable --now salt-minion  # on all nodes
```

Accept minion keys:

```bash
# On the Salt master
salt-key -L
salt-key -A  # Accept all pending keys
```

## Installing ceph-salt

```bash
# Install from package on SUSE/openSUSE
sudo zypper install ceph-salt

# Or install from source
git clone https://github.com/ceph/ceph-salt.git
cd ceph-salt
pip install .
```

## Configuring ceph-salt

ceph-salt uses an interactive shell to configure the cluster before applying:

```bash
# Enter ceph-salt configuration shell
sudo ceph-salt config

# Inside the shell:
/ceph_cluster/minions add node1.example.com
/ceph_cluster/minions add node2.example.com
/ceph_cluster/minions add node3.example.com

/ceph_cluster/roles/cephadm add node1.example.com
/ceph_cluster/roles/cephadm add node2.example.com
/ceph_cluster/roles/cephadm add node3.example.com
/ceph_cluster/roles/admin add node1.example.com
/ceph_cluster/roles/bootstrap set node1.example.com

/ssh generate
/cephadm_bootstrap/mon_ip set 192.168.1.10

ls  # List current configuration
quit
```

## Applying the Configuration

Validate before applying:

```bash
# Run pre-flight checks
sudo ceph-salt status

# Apply the configuration (runs Salt states on all minions)
sudo ceph-salt apply
```

This runs Salt states that:
- Configure OS-level settings (networking, NTP, kernel parameters)
- Install Ceph packages and cephadm
- Bootstrap the first monitor using cephadm
- Add remaining nodes to the cluster

## Monitoring the Apply Process

```bash
# Follow the apply progress
sudo ceph-salt --log-level info apply

# Check Salt job status
salt-run jobs.active
salt-run jobs.list_jobs
```

## Post-Deployment: Using cephadm

After ceph-salt applies, the cluster is managed via cephadm:

```bash
# Deploy OSDs on all available devices
ceph orch apply osd --all-available-devices

# Check cluster status
ceph status

# View running services
ceph orch ls
```

## Updating ceph-salt Configuration

After initial deployment, modify configuration and re-apply:

```bash
# Open config shell again
sudo ceph-salt config

# Add a new minion
/ceph_cluster/minions add node4.example.com
/ceph_cluster/roles/cephadm add node4.example.com
quit

# Re-apply changes
sudo ceph-salt apply node4.example.com
```

## Summary

ceph-salt bridges Salt configuration management with cephadm-based Ceph deployment. It handles the pre-bootstrap environment configuration (OS tuning, package installation, key distribution) using Salt states, then hands off to cephadm for cluster runtime management. For teams already using SaltStack - particularly in SUSE Enterprise Storage environments - ceph-salt provides a familiar, declarative workflow for standing up production Ceph clusters with the operational benefits of cephadm.
