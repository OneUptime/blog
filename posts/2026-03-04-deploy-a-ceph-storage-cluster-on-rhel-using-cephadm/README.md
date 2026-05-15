# How to Deploy a Ceph Storage Cluster on RHEL Using cephadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, Storage, cephadm, Distributed System

Description: Deploy a Ceph storage cluster on RHEL using cephadm, the official container-based deployment tool that manages Ceph daemons as systemd services.

---

cephadm is the recommended tool for deploying and managing Ceph clusters. It uses containers to run Ceph daemons and integrates with systemd for service management.

## Prerequisites

Ensure all nodes have:
- RHEL 9.6 or 9.7 with a valid Red Hat subscription and access to Red Hat Ceph Storage content
- At least one unused disk per node for OSDs
- SSH installed and running, with root-level access to all cluster nodes
- Chrony configured for time synchronization
- Login access to `registry.redhat.io`

## Install cephadm on the Bootstrap Node

```bash
# Enable the required RHEL and Red Hat Ceph Storage repositories
sudo subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms
sudo subscription-manager repos --enable=rhel-9-for-x86_64-appstream-rpms
sudo subscription-manager repos --enable=rhceph-9-tools-for-rhel-9-x86_64-rpms

# Install cephadm, the Ceph CLI, and host dependencies
sudo dnf install -y cephadm ceph-common podman lvm2 chrony

# Verify the installation
cephadm version
```

## Bootstrap the Cluster

Run the bootstrap command on the first node. This creates the initial monitor and manager:

```bash
# Bootstrap the cluster with the first node's IP
sudo cephadm bootstrap \
    --mon-ip 192.168.1.10 \
    --registry-url registry.redhat.io \
    --registry-username RED_HAT_USERNAME \
    --registry-password RED_HAT_PASSWORD \
    --initial-dashboard-user admin \
    --initial-dashboard-password changeme \
    --allow-fqdn-hostname \
    --yes-i-know
```

This command will:
- Pull the Ceph container images
- Create the first monitor (MON) and manager (MGR) daemons
- Set up the Ceph Dashboard on port 8443
- Generate an SSH key for cluster management

## Add Additional Hosts

Copy the cephadm SSH public key to all other nodes, then add them:

```bash
# Copy SSH key to the second node
ssh-copy-id -f -i /etc/ceph/ceph.pub root@node2

# Add the host to the cluster
sudo ceph orch host add node2 192.168.1.11

# Add a third node
ssh-copy-id -f -i /etc/ceph/ceph.pub root@node3
sudo ceph orch host add node3 192.168.1.12
```

## Add OSDs (Storage Disks)

Tell Ceph to use all available unused disks:

```bash
# Automatically add all available disks as OSDs
sudo ceph orch apply osd --all-available-devices

# Or add a specific disk on a specific host
sudo ceph orch daemon add osd node2:/dev/sdb
```

## Verify Cluster Health

```bash
# Check cluster status
sudo ceph status

# List all hosts
sudo ceph orch host ls

# List all OSDs
sudo ceph osd tree

# Check cluster health details
sudo ceph health detail
```

## Open Firewall Ports

On each node, open the required Ceph ports:

```bash
# Monitor, OSD, and MDS ports
sudo firewall-cmd --permanent --add-port=6789/tcp
sudo firewall-cmd --permanent --add-port=3300/tcp
sudo firewall-cmd --permanent --add-port=6800-7568/tcp
sudo firewall-cmd --reload
```

Your Ceph cluster is now running and ready for creating pools, filesystems, and block devices.
