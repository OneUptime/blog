# How to Set Up a Two-Node HA Cluster with Pacemaker on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Pacemaker, High Availability, Clustering, Corosync

Description: Build a complete two-node high availability cluster with Pacemaker on Ubuntu, including shared storage considerations, virtual IP failover, and service resource management.

---

A two-node Pacemaker cluster is the most common HA deployment in practice. It provides automatic failover for services when one node fails while keeping hardware costs manageable. Two-node clusters require specific consideration for quorum (which you'll resolve with the `two_node` setting) and fencing (which is even more critical than in larger clusters).

## Environment and Prerequisites

This guide uses:
- **node1**: 192.168.10.11 (Ubuntu 24.04)
- **node2**: 192.168.10.12 (Ubuntu 24.04)
- **Cluster VIP**: 192.168.10.100
- Dedicated cluster heartbeat network is recommended but not covered here for simplicity

Before starting, ensure:
- Both nodes have static IPs
- Both nodes can resolve each other by hostname
- Time is synchronized (use chrony/NTP)
- Root SSH access works between nodes

## Step 1: Time Synchronization

Cluster operations depend on accurate time. Ensure NTP is configured on both nodes:

```bash
# On both nodes
sudo apt install -y chrony
sudo systemctl enable chrony
sudo systemctl start chrony

# Verify time sync
chronyc tracking
timedatectl status | grep "synchronized"
```

## Step 2: Install the Cluster Stack

```bash
# On both nodes: install Pacemaker, Corosync, and management tools
sudo apt update
sudo apt install -y \
  pacemaker \
  corosync \
  pcs \
  fence-agents \
  crmsh

# Set the hacluster user password (must match on both nodes)
sudo passwd hacluster
# Choose a strong password
```

## Step 3: Configure Host Resolution

```bash
# On both nodes: ensure hostnames resolve
sudo tee -a /etc/hosts <<'EOF'
192.168.10.11   node1
192.168.10.12   node2
EOF

# Test
ping -c 2 node1
ping -c 2 node2
```

## Step 4: Open Required Firewall Ports

```bash
# On both nodes: allow cluster traffic
# Corosync uses UDP ports 5404-5406
# Pacemaker uses TCP port 2224 (pcsd)
sudo ufw allow from 192.168.10.0/24 to any port 5404:5406 proto udp
sudo ufw allow from 192.168.10.0/24 to any port 2224 proto tcp

# Or more simply, allow all traffic on the cluster subnet
sudo ufw allow from 192.168.10.0/24
```

## Step 5: Authenticate and Create the Cluster

The `pcs` tool simplifies cluster creation:

```bash
# On node1 only: authenticate with both nodes
sudo pcs host auth node1 node2 -u hacluster

# Create and start the cluster
sudo pcs cluster setup mycluster node1 node2 \
  --start \
  --enable

# Verify both nodes are in the cluster
sudo pcs cluster status
```

Expected output:

```
Cluster Status:
  Cluster Summary:
    * Stack: corosync (Pacemaker is running)
    * Current DC: node1 (version ...) - partition with quorum
    * Last updated: ...
    * Last change:  ...
    * 2 nodes configured
    * 0 resource instances configured
  Node List:
    * Online: [ node1 node2 ]
```

## Step 6: Configure Two-Node Quorum

In a two-node cluster, each node is 50% of the cluster. When one fails, the remaining node doesn't have a majority. The `two_node: 1` setting tells Corosync that a single surviving node has quorum:

```bash
# Verify quorum is configured for two nodes (pcs does this automatically)
sudo pcs quorum config

# Should show:
# Options:
#   two_node: 1

# If not set:
sudo pcs quorum update two_node=1
```

## Step 7: Configure Fencing

In a two-node cluster, fencing is critical. When one node loses contact with the other, both nodes believe the other has failed. Without fencing, both would try to start the resources - a split-brain scenario that corrupts shared data.

### Disable Fencing for Testing Only

```bash
# For testing/lab environments only - NEVER in production
sudo pcs property set stonith-enabled=false
sudo pcs property set no-quorum-policy=ignore
```

### Configure Fencing for Virtual Machines

For VMs running on libvirt/KVM:

```bash
# On the hypervisor host, create a fence script
# On both cluster nodes, configure the fence agent

# Example: fence_virsh for KVM VMs
sudo pcs stonith create fence-node1 fence_virsh \
  ipaddr=192.168.10.1 \
  login=root \
  identity_file=/root/.ssh/id_rsa \
  plug=node1 \
  pcmk_host_list=node1

sudo pcs stonith create fence-node2 fence_virsh \
  ipaddr=192.168.10.1 \
  login=root \
  identity_file=/root/.ssh/id_rsa \
  plug=node2 \
  pcmk_host_list=node2

# Each node should fence the OTHER node, not itself
sudo pcs constraint location fence-node1 avoids node1
sudo pcs constraint location fence-node2 avoids node2
```

### IPMI Fencing for Physical Servers

```bash
sudo pcs stonith create fence-node1 fence_ipmilan \
  ipaddr=192.168.10.21 \
  login=ipmiadmin \
  passwd=ipmipassword \
  pcmk_host_list=node1 \
  lanplus=1

sudo pcs stonith create fence-node2 fence_ipmilan \
  ipaddr=192.168.10.22 \
  login=ipmiadmin \
  passwd=ipmipassword \
  pcmk_host_list=node2 \
  lanplus=1
```

### Test Fencing

```bash
# Test fencing node2 from node1
sudo stonith_admin --test fence-node2

# The test should not actually reboot node2 (use --yes-really-reboot to do so)
```

## Step 8: Add a Virtual IP Resource

The floating VIP is what clients connect to. It moves automatically with the primary service:

```bash
# Create the virtual IP resource
sudo pcs resource create cluster-vip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.10.100 \
  cidr_netmask=24 \
  nic=eth0 \
  op monitor interval=20s \
  op start timeout=20s \
  op stop timeout=20s

# Check that it started
sudo pcs status
# cluster-vip ... Started node1
```

## Step 9: Add a Service Resource

Add the application service that should fail over with the VIP:

```bash
# Create an nginx resource
sudo pcs resource create nginx-ha \
  systemd:nginx \
  op monitor interval=15s timeout=30s \
  op start timeout=60s \
  op stop timeout=30s

# Ensure nginx runs on the same node as the VIP
sudo pcs constraint colocation add nginx-ha with cluster-vip INFINITY

# Ensure VIP starts before nginx
sudo pcs constraint order cluster-vip then nginx-ha

# Verify constraints
sudo pcs constraint show
```

## Step 10: Configure Resource Groups

Grouping resources ensures they always start/stop together and in order:

```bash
# Alternative to constraints: use a resource group
sudo pcs resource group add ha-group cluster-vip nginx-ha

# Resources in a group:
# - Run on the same node
# - Start in order (left to right)
# - Stop in reverse order
# - Fail over together

sudo pcs status
# Resource Group: ha-group
#   cluster-vip  (ocf::heartbeat:IPaddr2): Started node1
#   nginx-ha     (systemd:nginx):          Started node1
```

## Step 11: Configure Resource Stickiness

Prevent unnecessary failback after node1 recovers:

```bash
# Set resource stickiness to prevent automatic failback
sudo pcs resource defaults resource-stickiness=100

# To completely prevent failback (resources stay wherever they are):
sudo pcs resource defaults resource-stickiness=INFINITY
```

## Verifying the Cluster

```bash
# Full cluster status
sudo pcs status

# Verify VIP is accessible
ping -c 3 192.168.10.100
curl http://192.168.10.100/

# Check which node is running resources
sudo pcs status | grep "Started"
```

## Testing Failover

```bash
# Method 1: Stop cluster services on the active node
sudo pcs cluster stop node1

# Watch failover on node2
watch sudo pcs status
# Resources should move to node2 within the failure detection window

# Bring node1 back
sudo pcs cluster start node1

# Method 2: Simulate failure with standby mode
sudo pcs node standby node1

# Method 3: Manually move a resource
sudo pcs resource move ha-group node2
# Note: this creates a location constraint - remove it afterward
sudo pcs resource clear ha-group
```

## Cluster Maintenance Mode

Before system updates, put the cluster in maintenance mode to prevent unwanted failovers:

```bash
# Enable maintenance mode (stops monitoring)
sudo pcs property set maintenance-mode=true

# Perform maintenance (updates, reboots, etc.)
sudo apt upgrade
sudo reboot

# After maintenance, disable maintenance mode
sudo pcs property set maintenance-mode=false

# Verify resources are running
sudo pcs status
```

## Viewing Cluster History and Logs

```bash
# View transition history
sudo crm_mon -1

# View cluster events
sudo pcs status --full

# View Pacemaker logs
sudo journalctl -u pacemaker -f

# View Corosync logs
sudo journalctl -u corosync -f

# Grep for failover events
sudo journalctl -u pacemaker | grep -i "failover\|move\|stop\|start"
```

## Recovering from a Failed Resource

```bash
# Clean up a failed resource so Pacemaker retries
sudo pcs resource cleanup nginx-ha
sudo pcs resource cleanup cluster-vip

# Force a resource to restart
sudo pcs resource restart nginx-ha

# Check if the resource is now running
sudo pcs resource status
```

## Two-Node Specific Considerations

Two-node clusters have a fundamental limitation: there is no third node to break ties during a network partition (split-brain). Your mitigation options are:

1. **Fencing** - if a node can't communicate, it gets fenced before the other node starts resources
2. **Single shared quorum device** - a lightweight third node that only participates in voting (doesn't run services)
3. **`no-quorum-policy=stop`** - both nodes stop resources if quorum is lost (unavailability over inconsistency)

```bash
# For critical data services, configure stop on quorum loss
sudo pcs property set no-quorum-policy=stop

# For less critical services, the default (stop) or freeze works
sudo pcs property show no-quorum-policy
```

A properly configured two-node Pacemaker cluster provides effective automatic failover for most service types. The combination of proper fencing, appropriate quorum policy, and tested failover procedures makes it a reliable foundation for production HA deployments.
