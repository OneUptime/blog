# How to Set Up Pacemaker and Corosync for High Availability on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Pacemaker, Corosync, High Availability, Clustering

Description: A step-by-step guide to installing and configuring Pacemaker and Corosync for a basic high availability cluster on Ubuntu, including resource management and fencing configuration.

---

Pacemaker and Corosync together form the standard Linux HA stack. Corosync handles cluster membership and reliable messaging between nodes. Pacemaker sits on top as the cluster resource manager - it decides which node runs which services and moves them when a node fails. This combination powers HA configurations for databases, web services, NFS, and almost any other stateful service.

## Architecture Overview

In a basic two-node cluster:
- **Corosync** maintains the cluster membership ring and handles node failure detection via heartbeat messages over a dedicated network link
- **Pacemaker** monitors resources and relocates them to surviving nodes when the active node fails
- **STONITH/Fencing** ensures a failed node is truly powered off before its resources are started on another node (prevents split-brain data corruption)

## Lab Setup

This guide uses two Ubuntu 24.04 nodes:
- `node1`: 192.168.10.11
- `node2`: 192.168.10.12
- Virtual IP: 192.168.10.100 (floats between nodes)

Run all commands on both nodes unless stated otherwise.

## Step 1: Prepare Both Nodes

```bash
# On both nodes: set hostnames
# On node1:
sudo hostnamectl set-hostname node1
# On node2:
sudo hostnamectl set-hostname node2

# On both nodes: add entries to /etc/hosts
sudo tee -a /etc/hosts <<'EOF'
192.168.10.11   node1
192.168.10.12   node2
EOF

# Verify hostname resolution
ping -c 2 node1
ping -c 2 node2
```

## Step 2: Set Up SSH Keys Between Nodes

Pacemaker needs passwordless SSH to perform fencing operations:

```bash
# On node1: generate and copy key to node2
ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa
ssh-copy-id root@node2

# On node2: generate and copy key to node1
ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa
ssh-copy-id root@node1

# Test
ssh root@node2 "hostname"
ssh root@node1 "hostname"
```

## Step 3: Install Pacemaker and Corosync

```bash
# On both nodes: install the HA stack
sudo apt update
sudo apt install -y pacemaker corosync pcs fence-agents

# Set the hacluster user password (used by pcs for cluster authentication)
# Must be the same password on both nodes
sudo passwd hacluster
# Enter a strong password
```

## Step 4: Configure Corosync

### Using pcs to Bootstrap the Cluster

`pcs` (Pacemaker/Corosync Configuration System) is the modern management interface:

```bash
# On node1: authenticate with the cluster nodes
sudo pcs host auth node1 node2 -u hacluster

# On node1: create the cluster
sudo pcs cluster setup mycluster node1 node2 --start --enable

# Verify the cluster started on both nodes
sudo pcs cluster status
```

### Manual Corosync Configuration (Alternative)

If you need more control, configure Corosync manually:

```bash
# On both nodes: create the corosync configuration
sudo tee /etc/corosync/corosync.conf <<'EOF'
totem {
    version: 2
    cluster_name: mycluster
    transport: udpu

    # Corosync token timeout in ms
    token: 5000
    token_retransmits_before_loss_const: 10

    interface {
        ringnumber: 0
        bindnetaddr: 192.168.10.0
        broadcast: no
        mcastport: 5405
    }
}

quorum {
    provider: corosync_votequorum
    two_node: 1
}

nodelist {
    node {
        ring0_addr: 192.168.10.11
        name: node1
        nodeid: 1
    }
    node {
        ring0_addr: 192.168.10.12
        name: node2
        nodeid: 2
    }
}

logging {
    to_logfile: yes
    logfile: /var/log/corosync/corosync.log
    to_syslog: yes
    timestamp: on
}
EOF

# Start and enable services
sudo systemctl enable corosync pacemaker
sudo systemctl start corosync pacemaker
```

## Step 5: Verify Cluster Status

```bash
# Check overall cluster status
sudo pcs status

# Expected output:
# Cluster name: mycluster
# Stack: corosync
# Current DC: node1 (version ...) - partition with quorum
# Last updated: ...
# 2 nodes configured
# 0 resource instances configured
#
# Online: [ node1 node2 ]
# No resources.

# Check corosync ring status
sudo corosync-cfgtool -s

# Check Pacemaker member list
sudo pcs cluster nodes
```

## Step 6: Configure STONITH (Fencing)

STONITH (Shoot The Other Node In The Head) prevents split-brain. **Never disable STONITH in production.** For lab testing, you can disable it:

```bash
# Lab only: disable STONITH
sudo pcs property set stonith-enabled=false

# Production: configure an appropriate fencing agent
# Examples depend on your environment:

# For VMs on VMware/libvirt - use fence_vmware or fence_virsh
sudo pcs stonith create vmfence fence_vmware \
  ipaddr=vcenter.example.com \
  login=admin \
  passwd=password \
  pcmk_reboot_action=off

# For physical servers with IPMI/iDRAC
sudo pcs stonith create ipmi-fence fence_ipmilan \
  pcmk_host_map="node1:192.168.10.21;node2:192.168.10.22" \
  ipaddr=192.168.10.21 \
  login=admin \
  passwd=password

# For cloud VMs (AWS example)
sudo pcs stonith create aws-fence fence_aws \
  region=us-east-1 \
  pcmk_host_map="node1:i-1234567890abcdef0;node2:i-0987654321fedcba0"
```

## Step 7: Add Resources

### Virtual IP Resource

The floating IP is the most common HA resource:

```bash
# Create a virtual IP resource
sudo pcs resource create virtual-ip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.10.100 \
  cidr_netmask=24 \
  nic=eth0 \
  op monitor interval=20s timeout=20s

# Verify the resource started
sudo pcs status
sudo pcs resource status
```

### Service Resource (nginx example)

```bash
# Create a resource for nginx
sudo pcs resource create nginx-service \
  systemd:nginx \
  op monitor interval=15s timeout=30s \
  op start timeout=60s \
  op stop timeout=30s

# Configure resource ordering: virtual-ip starts before nginx
sudo pcs constraint order virtual-ip then nginx-service

# Configure colocation: nginx runs on the same node as virtual-ip
sudo pcs constraint colocation add nginx-service with virtual-ip INFINITY
```

## Step 8: Test Failover

```bash
# Check current node running the resources
sudo pcs status

# Simulate node failure by stopping cluster on the active node
# First, identify which node is active:
sudo pcs resource status | grep "Started"

# On the active node (e.g., node1):
sudo pcs cluster stop node1

# Monitor failover from node2:
watch sudo pcs status
# Resources should move to node2 within ~30 seconds (based on token timeout)

# Verify the virtual IP moved
ip addr show eth0 | grep 192.168.10.100  # should appear on node2

# Bring node1 back
sudo pcs cluster start node1

# Resources may move back (if preferred), or stay on node2 (if sticky)
```

## Step 9: Configure Resource Stickiness

By default, resources move back to their preferred node when it recovers. In most cases, you want resources to stay where they are to avoid unnecessary failovers:

```bash
# Set resource stickiness (higher = less likely to move)
sudo pcs resource defaults resource-stickiness=100

# Or set on a specific resource
sudo pcs resource meta virtual-ip resource-stickiness=100

# To prevent resources from moving back automatically:
sudo pcs resource defaults resource-stickiness=INFINITY
```

## Monitoring the Cluster

```bash
# Real-time status
watch -n 2 sudo pcs status

# Detailed resource status
sudo pcs resource status

# Check for failed actions
sudo pcs status | grep -A10 "Failed"

# View Pacemaker logs
sudo journalctl -u pacemaker -f

# View Corosync logs
sudo tail -f /var/log/corosync/corosync.log

# Clear failed resource actions
sudo pcs resource cleanup virtual-ip
sudo pcs resource cleanup nginx-service
```

## Common Issues and Fixes

### Cluster Nodes Can't See Each Other

```bash
# Check Corosync connectivity
sudo corosync-cfgtool -s

# Check if the cluster port is open between nodes
sudo ss -ulnp | grep 5405
nc -u 192.168.10.12 5405  # test connectivity
```

### Resources Not Starting

```bash
# Force a resource to start on a specific node
sudo pcs resource move virtual-ip node2

# Check resource agent logs
sudo crm_resource --resource virtual-ip --validate --force

# Run the resource agent manually for debugging
sudo /usr/lib/ocf/resource.d/heartbeat/IPaddr2 monitor
```

Pacemaker and Corosync provide enterprise-grade high availability for any service that can be started and stopped via a script. Proper fencing configuration is non-negotiable for production use - without it, a network partition causes both nodes to try running the service simultaneously, leading to data corruption.
