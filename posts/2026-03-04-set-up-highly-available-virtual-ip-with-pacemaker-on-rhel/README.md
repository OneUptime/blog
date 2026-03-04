# How to Set Up a Highly Available Virtual IP with Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Corosync, Virtual IP, High Availability, Failover

Description: Configure a floating virtual IP address with Pacemaker on RHEL so that clients always connect to an available node, even during failover events.

---

A virtual IP (VIP) is an IP address that floats between cluster nodes. When the active node fails, Pacemaker moves the VIP to a healthy node. Clients connect to the VIP and never need to know which physical node is serving traffic.

## Install and Configure the Cluster

```bash
# Install cluster packages on both nodes
sudo dnf install -y pcs pacemaker fence-agents-all

# Set the hacluster password on both nodes
sudo passwd hacluster

# Enable and start pcsd
sudo systemctl enable --now pcsd

# Authenticate from node1
sudo pcs host auth node1 node2 -u hacluster -p yourpassword

# Create and start the cluster
sudo pcs cluster setup mycluster node1 node2
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Configure Fencing

Fencing is mandatory in production clusters. Without it, Pacemaker refuses to recover resources after a node failure.

```bash
# Example using a fence agent for IPMI-based fencing
sudo pcs stonith create fence_node1 fence_ipmilan \
    ipaddr=192.168.1.50 login=admin passwd=secret \
    pcmk_host_list=node1 lanplus=1

sudo pcs stonith create fence_node2 fence_ipmilan \
    ipaddr=192.168.1.51 login=admin passwd=secret \
    pcmk_host_list=node2 lanplus=1

# Verify fencing is configured
sudo pcs stonith status
```

## Create the Virtual IP Resource

```bash
# Create a VIP resource using the IPaddr2 resource agent
sudo pcs resource create cluster_vip ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 \
    cidr_netmask=24 \
    nic=eth0 \
    op monitor interval=10s timeout=20s

# Check which node owns the VIP
sudo pcs status
```

## Test Failover

```bash
# From another machine, start pinging the VIP
ping 192.168.1.100

# On the active node, simulate a failure by putting it in standby
sudo pcs node standby node1

# Watch pcs status to see the VIP move to node2
sudo pcs status

# Bring node1 back online
sudo pcs node unstandby node1
```

## Add a Preference for a Specific Node

```bash
# Prefer node1 as the primary VIP holder with a score of 100
sudo pcs constraint location cluster_vip prefers node1=100

# Verify constraints
sudo pcs constraint show
```

## Open Firewall Ports

```bash
# Pacemaker and Corosync need these ports
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
```

The VIP will move automatically during node failures, and clients only need to target a single IP address. This setup is the foundation for making any service highly available on RHEL.
