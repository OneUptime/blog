# How to Set Up Floating IPs for High Availability on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, High Availability, Networking, Pacemaker, Failover

Description: Learn how to configure floating IPs (virtual IPs) for high availability on Ubuntu using Pacemaker, Keepalived, and manual approaches to ensure continuous service availability.

---

A floating IP, also called a virtual IP or VIP, is an IP address that is not permanently tied to a single machine. When the node currently holding the IP fails, the address moves to another healthy node. Clients experience only a brief interruption rather than a permanent outage. This is the fundamental building block of most high availability architectures.

This guide covers three approaches: Pacemaker (full cluster stack), Keepalived (lighter weight), and manual management for understanding the underlying mechanics.

## How Floating IPs Work

A floating IP is assigned to a network interface using standard Linux networking commands. When Pacemaker or Keepalived detects a failure, it removes the IP from the failed node's interface and adds it to a healthy node's interface. The new node then sends a gratuitous ARP broadcast to update neighboring devices' ARP caches, effectively advertising "I now own this IP."

The time between failure and the IP moving is called failover time. With Pacemaker, typical failover takes 10-30 seconds. With Keepalived, it can be as low as 2-3 seconds.

## Approach 1: Floating IP with Pacemaker

This approach suits clusters already using Pacemaker for other resources.

### Prerequisites

```bash
# Install on both nodes
sudo apt update
sudo apt install -y pacemaker corosync pcs

# Set hacluster password
sudo passwd hacluster

# Enable pcsd
sudo systemctl enable --now pcsd
```

### Setting Up the Cluster

```bash
# From node1, authenticate and create the cluster
sudo pcs host auth node1 node2 -u hacluster -p yourpassword
sudo pcs cluster setup ha-cluster node1 node2 --start --enable

# For two-node clusters
sudo pcs property set no-quorum-policy=ignore
sudo pcs property set stonith-enabled=false  # Enable proper fencing in production

# Check cluster is running
sudo pcs status
```

### Creating the Floating IP Resource

```bash
# Create the floating IP resource
sudo pcs resource create cluster-vip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.1.50 \
  cidr_netmask=24 \
  nic=eth0 \
  op monitor interval=30s \
  op start timeout=60s \
  op stop timeout=60s

# Check it started
sudo pcs status

# Verify the IP is assigned
ip addr show eth0 | grep 192.168.1.50
```

The `ocf:heartbeat:IPaddr2` resource agent handles adding/removing the IP and sending gratuitous ARP. You can also specify `broadcast_arp=true` if needed for your network environment.

### Multiple Floating IPs

You can create multiple VIPs for different services:

```bash
# Create a VIP for the database
sudo pcs resource create db-vip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.1.51 \
  cidr_netmask=24 \
  nic=eth0

# Create a VIP for the web service
sudo pcs resource create web-vip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.1.52 \
  cidr_netmask=24 \
  nic=eth0
```

## Approach 2: Floating IP with Keepalived

Keepalived is simpler than Pacemaker - it focuses specifically on VIP management using the VRRP protocol. It is ideal when you only need floating IPs without the full cluster resource management.

### Installing Keepalived

```bash
# Install on both nodes
sudo apt install -y keepalived

# Backup the default config
sudo mv /etc/keepalived/keepalived.conf /etc/keepalived/keepalived.conf.orig
```

### Configuring the Master Node

On node1 (the preferred master):

```bash
sudo tee /etc/keepalived/keepalived.conf << 'EOF'
# Global configuration
global_defs {
    router_id node1
    script_user root
    enable_script_security
}

# Health check script
vrrp_script chk_service {
    script "/usr/bin/curl -sf http://localhost/ > /dev/null"
    interval 2    # Check every 2 seconds
    weight -20    # Reduce priority by 20 if check fails
    fall 2        # Need 2 failures to consider service down
    rise 2        # Need 2 successes to consider service up
}

# VRRP instance
vrrp_instance VI_1 {
    state MASTER          # This node starts as MASTER
    interface eth0        # Interface to bind the VIP
    virtual_router_id 51  # Must be same on both nodes (1-255)
    priority 100          # Higher priority = preferred master
    advert_int 1          # Send advertisements every 1 second

    authentication {
        auth_type PASS
        auth_pass secretkey   # Must match on both nodes
    }

    virtual_ipaddress {
        192.168.1.50/24 dev eth0  # The floating IP
    }

    track_script {
        chk_service
    }

    notify_master "/etc/keepalived/notify.sh MASTER"
    notify_backup "/etc/keepalived/notify.sh BACKUP"
    notify_fault  "/etc/keepalived/notify.sh FAULT"
}
EOF
```

### Configuring the Backup Node

On node2:

```bash
sudo tee /etc/keepalived/keepalived.conf << 'EOF'
global_defs {
    router_id node2
}

vrrp_script chk_service {
    script "/usr/bin/curl -sf http://localhost/ > /dev/null"
    interval 2
    weight -20
    fall 2
    rise 2
}

vrrp_instance VI_1 {
    state BACKUP          # This node starts as BACKUP
    interface eth0
    virtual_router_id 51  # Same as master
    priority 90           # Lower priority than master
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secretkey   # Same as master
    }

    virtual_ipaddress {
        192.168.1.50/24 dev eth0
    }

    track_script {
        chk_service
    }
}
EOF
```

### Notification Script

```bash
sudo tee /etc/keepalived/notify.sh << 'EOF'
#!/bin/bash
# Notification script called when VRRP state changes

TYPE=$1
STATE=$2
NAME=$3

case $STATE in
    "MASTER")
        logger "Keepalived: I am now MASTER for VIP"
        # Add any actions to take when becoming master
        ;;
    "BACKUP")
        logger "Keepalived: I am now BACKUP"
        # Add any cleanup actions
        ;;
    "FAULT")
        logger "Keepalived: VRRP fault state entered"
        ;;
esac
EOF

sudo chmod +x /etc/keepalived/notify.sh
```

### Starting Keepalived

```bash
# Enable and start on both nodes
sudo systemctl enable --now keepalived

# Check status
sudo systemctl status keepalived

# Verify VIP is assigned on the master
ip addr show eth0 | grep 192.168.1.50

# Watch logs for state changes
sudo journalctl -u keepalived -f
```

## Testing Failover

### Testing Pacemaker Failover

```bash
# Move the resource to the other node
sudo pcs resource move cluster-vip node2

# Watch status
sudo pcs status

# Clear the constraint and let it fail back
sudo pcs resource clear cluster-vip

# Test by putting a node on standby
sudo pcs node standby node1
sudo pcs status
# VIP should now be on node2

sudo pcs node unstandby node1
```

### Testing Keepalived Failover

```bash
# Simulate master failure by stopping keepalived on node1
sudo systemctl stop keepalived

# On node2, verify the VIP has moved
ip addr show eth0 | grep 192.168.1.50

# Test connectivity
ping -c3 192.168.1.50

# Restart keepalived on node1 and verify behavior
sudo systemctl start keepalived
# With preemption enabled (default), node1 takes back master role
```

## Gratuitous ARP Configuration

When a VIP moves, the new node must announce itself via ARP. You can tune this:

```bash
# For Pacemaker IPaddr2, set ARP count
sudo pcs resource update cluster-vip \
  arp_count=3 \
  arp_interval=200

# For Keepalived, tune the garp settings
# In keepalived.conf vrrp_instance:
# garp_master_delay 5          # delay before sending garp as master
# garp_master_refresh 60       # refresh period for garp messages
# garp_master_repeat 3         # number of garp messages to send
```

## Monitoring the Floating IP

```bash
# Check which node holds the VIP
# Run on both nodes
ip addr show | grep 192.168.1.50

# Monitor ARP table for the VIP
arp -n | grep 192.168.1.50

# Use arping to verify which MAC holds the IP
arping -c3 -I eth0 192.168.1.50

# Monitor keepalived state changes
sudo journalctl -u keepalived --since "1 hour ago"

# Monitor pacemaker resource moves
sudo pcs status | grep cluster-vip
```

Floating IPs are a deceptively simple concept that require careful network planning. The IP must be in the same subnet as the physical interface, the network must allow gratuitous ARPs (some cloud providers restrict this), and failover time must meet your availability requirements. Both Pacemaker and Keepalived are mature tools - choose based on what else you need: Keepalived for VIP-only scenarios, Pacemaker when you need full resource management.
