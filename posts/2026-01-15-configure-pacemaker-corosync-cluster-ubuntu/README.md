# How to Configure Pacemaker and Corosync Cluster on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Pacemaker, Corosync, Cluster, High Availability, Tutorial

Description: Complete guide to setting up a Pacemaker/Corosync high availability cluster on Ubuntu.

---

High availability (HA) is critical for production environments where downtime is not an option. Pacemaker and Corosync together form a powerful open-source clustering solution that provides automatic failover, resource management, and fault tolerance. This comprehensive guide walks you through configuring a Pacemaker/Corosync cluster on Ubuntu from scratch.

## Understanding Pacemaker and Corosync

### What is Corosync?

Corosync is the cluster communication layer that provides:

- **Membership management**: Tracks which nodes are part of the cluster
- **Messaging**: Handles communication between cluster nodes
- **Quorum**: Determines if the cluster has enough nodes to operate safely
- **Totem protocol**: Provides reliable ordered messaging using a virtual synchrony guarantee

### What is Pacemaker?

Pacemaker is the cluster resource manager that sits on top of Corosync and provides:

- **Resource management**: Starts, stops, and monitors cluster resources
- **Failover logic**: Automatically moves services to healthy nodes when failures occur
- **Constraint handling**: Enforces rules about where and how resources run
- **Fencing (STONITH)**: Ensures failed nodes are safely isolated

### How They Work Together

```
+------------------+     +------------------+
|     Node 1       |     |     Node 2       |
+------------------+     +------------------+
|    Pacemaker     |     |    Pacemaker     |
|  (Resource Mgr)  |     |  (Resource Mgr)  |
+------------------+     +------------------+
|    Corosync      |<--->|    Corosync      |
| (Communication)  |     | (Communication)  |
+------------------+     +------------------+
```

Corosync handles the low-level cluster communication and membership, while Pacemaker makes decisions about resource placement and handles failover logic.

## Prerequisites

Before configuring your cluster, ensure you have:

### Hardware/Infrastructure Requirements

- **Minimum 2 nodes** (3 or more recommended for production)
- **Ubuntu 22.04 LTS or later** installed on all nodes
- **Dedicated network interface** for cluster communication (recommended)
- **Shared storage** if clustering stateful applications (optional but common)

### Network Configuration

Each node should have:

1. A static IP address
2. Proper hostname resolution
3. Network connectivity between all nodes

### Example Environment

For this guide, we will use:

| Node | Hostname | IP Address |
|------|----------|------------|
| Node 1 | node1.cluster.local | 192.168.1.101 |
| Node 2 | node2.cluster.local | 192.168.1.102 |
| Node 3 | node3.cluster.local | 192.168.1.103 |
| VIP | cluster-vip | 192.168.1.100 |

### Configure Hosts File

On **all nodes**, update `/etc/hosts`:

```bash
# Edit the hosts file on all nodes
sudo nano /etc/hosts
```

Add the following entries:

```
# Cluster nodes
192.168.1.101   node1.cluster.local   node1
192.168.1.102   node2.cluster.local   node2
192.168.1.103   node3.cluster.local   node3
```

### Verify Connectivity

Test that all nodes can reach each other:

```bash
# From node1, test connectivity to other nodes
ping -c 3 node2
ping -c 3 node3

# Verify hostname resolution
getent hosts node1 node2 node3
```

## Installing Cluster Packages

### Update System Packages

On **all nodes**, update the package list and upgrade existing packages:

```bash
# Update package list
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### Install Pacemaker, Corosync, and PCS

The `pcs` tool provides a unified command-line interface for managing both Pacemaker and Corosync:

```bash
# Install cluster packages on all nodes
sudo apt install -y pacemaker corosync pcs

# The installation includes:
# - pacemaker: The cluster resource manager
# - corosync: The cluster communication system
# - pcs: Command-line cluster management tool
# - resource-agents: Standard cluster resource scripts
# - fence-agents: Fencing/STONITH agents
```

### Verify Installation

```bash
# Check installed versions
pcs --version
corosync -v
pacemakerd --version

# Verify services exist (not yet running)
systemctl list-unit-files | grep -E "corosync|pacemaker|pcsd"
```

### Configure the Cluster User

The `pcs` daemon uses the `hacluster` user for authentication between nodes:

```bash
# Set password for hacluster user on ALL nodes
# Use the same password on every node
sudo passwd hacluster
# Enter a strong password when prompted

# Start and enable the pcsd service on ALL nodes
sudo systemctl start pcsd
sudo systemctl enable pcsd

# Verify pcsd is running
sudo systemctl status pcsd
```

## Corosync Configuration

### Authenticate Nodes

From **one node only** (we will use node1), authenticate all cluster nodes:

```bash
# Authenticate all cluster nodes from node1
# This creates trust between nodes for cluster management
sudo pcs host auth node1 node2 node3 -u hacluster -p your_password

# Expected output:
# node1: Authorized
# node2: Authorized
# node3: Authorized
```

### Create the Cluster

Create a new cluster with all nodes:

```bash
# Create a new cluster named 'mycluster'
# This generates the corosync.conf and sets up initial configuration
sudo pcs cluster setup mycluster node1 node2 node3

# The command above:
# - Creates /etc/corosync/corosync.conf on all nodes
# - Configures the totem protocol
# - Sets up the nodelist with all members
# - Configures quorum settings
```

### Understanding the Generated Corosync Configuration

The `pcs cluster setup` command generates `/etc/corosync/corosync.conf`. Here is an example with explanations:

```bash
# View the generated configuration
sudo cat /etc/corosync/corosync.conf
```

```ini
# /etc/corosync/corosync.conf
# This file is managed by pcs - manual edits may be overwritten

totem {
    version: 2

    # Cluster name - must match on all nodes
    cluster_name: mycluster

    # Transport protocol: knet (default), udp, or udpu
    # knet provides encryption and multiple redundant links
    transport: knet

    # Crypto configuration for secure cluster communication
    crypto_cipher: aes256
    crypto_hash: sha256
}

# Logging configuration
logging {
    # Log to /var/log/corosync/corosync.log
    to_logfile: yes
    logfile: /var/log/corosync/corosync.log

    # Also log to syslog
    to_syslog: yes

    # Log level: debug, info, notice, warning, error
    # Use 'info' for production, 'debug' for troubleshooting
    debug: off
}

# Quorum configuration
quorum {
    # Use votequorum for quorum calculation
    provider: corosync_votequorum

    # For 2-node clusters, enable these options:
    # two_node: 1
    # wait_for_all: 1
}

# Node list with unique node IDs
nodelist {
    node {
        ring0_addr: node1
        name: node1
        nodeid: 1
    }
    node {
        ring0_addr: node2
        name: node2
        nodeid: 2
    }
    node {
        ring0_addr: node3
        name: node3
        nodeid: 3
    }
}
```

### Two-Node Cluster Special Configuration

For two-node clusters, special quorum handling is required:

```bash
# For 2-node clusters only, after cluster setup:
sudo pcs property set no-quorum-policy=ignore

# Or modify corosync.conf quorum section:
# quorum {
#     provider: corosync_votequorum
#     two_node: 1
#     wait_for_all: 1
# }
```

### Advanced Corosync Options

For production environments, consider these additional settings:

```bash
# Configure multiple redundant network links (recommended for production)
sudo pcs cluster setup mycluster \
    node1 addr=192.168.1.101 addr=10.0.0.101 \
    node2 addr=192.168.1.102 addr=10.0.0.102 \
    node3 addr=192.168.1.103 addr=10.0.0.103

# The above creates two communication rings for redundancy
```

## Starting the Cluster

### Start Cluster Services

```bash
# Start the cluster on all nodes
# This starts both corosync and pacemaker services
sudo pcs cluster start --all

# Expected output:
# node1: Starting Cluster...
# node2: Starting Cluster...
# node3: Starting Cluster...
```

### Enable Auto-Start on Boot

```bash
# Enable cluster services to start on boot on all nodes
sudo pcs cluster enable --all

# This enables:
# - corosync.service
# - pacemaker.service
```

### Verify Cluster Status

```bash
# Check overall cluster status
sudo pcs cluster status

# Check detailed status including resources
sudo pcs status

# Example output:
# Cluster name: mycluster
# Cluster Summary:
#   * Stack: corosync
#   * Current DC: node1 (version 2.1.x)
#   * Last updated: ...
#   * 3 nodes configured
#   * 0 resources configured
#
# Node List:
#   * Online: [ node1 node2 node3 ]
#
# Full List of Resources:
#   * No resources
```

### Check Corosync Ring Status

```bash
# Verify corosync communication rings
sudo corosync-cfgtool -s

# Expected output shows ring status for each node
# Ring 0 should show "no faults"
```

### View Cluster Membership

```bash
# Check which nodes are members of the cluster
sudo corosync-cmapctl | grep members

# Or use:
sudo pcs status nodes
```

## Pacemaker Resources

Resources are the services or applications managed by the cluster. Pacemaker supports various resource types.

### Resource Types

1. **Primitive**: Single instance of a resource
2. **Clone**: Resource running on multiple nodes
3. **Promotable Clone**: Master/Slave resource (e.g., database replication)
4. **Group**: Multiple resources managed as a unit

### Creating a Virtual IP Resource

A Virtual IP (VIP) is one of the most common cluster resources:

```bash
# Create a virtual IP resource
# The VIP will float between nodes and move during failover
sudo pcs resource create cluster_vip ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 \
    cidr_netmask=24 \
    op monitor interval=30s

# Explanation:
# - cluster_vip: Resource name (you choose this)
# - ocf:heartbeat:IPaddr2: Resource agent (provider:class:type)
# - ip: The virtual IP address
# - cidr_netmask: Network mask
# - op monitor interval=30s: Health check every 30 seconds
```

### Creating a Web Server Resource

```bash
# Create an Apache resource
sudo pcs resource create webserver ocf:heartbeat:apache \
    configfile=/etc/apache2/apache2.conf \
    statusurl="http://127.0.0.1/server-status" \
    op monitor interval=30s timeout=30s \
    op start timeout=60s \
    op stop timeout=60s

# Explanation:
# - configfile: Path to Apache configuration
# - statusurl: URL for health monitoring
# - op monitor: Defines monitoring operation
# - op start/stop: Defines timeouts for start/stop operations
```

### Creating a Resource Group

Groups ensure resources start and stop together in order:

```bash
# Create a resource group for web services
# Resources in a group run on the same node and start/stop in order
sudo pcs resource group add webgroup cluster_vip webserver

# The VIP will start first, then the webserver
# On stop, webserver stops first, then VIP
```

### Creating Clone Resources

Clone resources run on multiple or all nodes:

```bash
# Create a cloned resource (runs on all nodes)
sudo pcs resource create dlm ocf:pacemaker:controld \
    op monitor interval=30s on-fail=fence

sudo pcs resource clone dlm clone-max=3 clone-node-max=1

# clone-max: Maximum instances cluster-wide
# clone-node-max: Maximum instances per node
```

### Creating a Promotable (Master/Slave) Resource

For resources with primary/secondary roles (e.g., database replication):

```bash
# Create a promotable PostgreSQL resource
sudo pcs resource create pgsql ocf:heartbeat:pgsql \
    pgctl=/usr/lib/postgresql/14/bin/pg_ctl \
    psql=/usr/bin/psql \
    pgdata=/var/lib/postgresql/14/main \
    rep_mode=sync \
    node_list="node1 node2 node3" \
    master_ip=192.168.1.100 \
    repuser=replication \
    op start timeout=60s \
    op stop timeout=60s \
    op promote timeout=30s \
    op demote timeout=120s \
    op monitor interval=15s timeout=10s \
    op monitor interval=16s role=Master timeout=10s

# Make it promotable (master/slave)
sudo pcs resource promotable pgsql promoted-max=1 promoted-node-max=1

# promoted-max: Only one master at a time
# promoted-node-max: Only one master role per node
```

### Listing Available Resource Agents

```bash
# List all available resource agent classes
sudo pcs resource agents

# List agents for a specific class
sudo pcs resource agents ocf:heartbeat

# Get detailed info about a specific agent
sudo pcs resource describe ocf:heartbeat:IPaddr2
```

## Constraints and Colocation

Constraints control where and how resources run in the cluster.

### Location Constraints

Control which nodes can run a resource:

```bash
# Prefer running resource on node1 (score determines preference)
sudo pcs constraint location webgroup prefers node1=100

# Avoid running resource on node3
sudo pcs constraint location webgroup avoids node3=INFINITY

# INFINITY means never run on that node
# Numeric scores: higher = more preferred

# Ban a resource from a specific node
sudo pcs constraint location webgroup avoids node2=INFINITY

# Allow resource only on specific nodes using rules
sudo pcs constraint location webgroup rule score=INFINITY \#uname eq node1 or \#uname eq node2
```

### Colocation Constraints

Ensure resources run on the same or different nodes:

```bash
# Ensure webserver always runs on the same node as cluster_vip
# The VIP must be running before webserver starts
sudo pcs constraint colocation add webserver with cluster_vip INFINITY

# Syntax: pcs constraint colocation add <resource1> with <resource2> <score>
# INFINITY: Must be together
# -INFINITY: Must be apart
# Numeric: Preference (higher = stronger)

# Ensure two resources never run on the same node
sudo pcs constraint colocation add resourceA with resourceB -INFINITY
```

### Order Constraints

Define the sequence for starting and stopping resources:

```bash
# Start cluster_vip before webserver
sudo pcs constraint order cluster_vip then webserver

# More explicit ordering with options
sudo pcs constraint order start cluster_vip then start webserver \
    kind=Mandatory \
    symmetrical=true

# kind options:
# - Mandatory: Required order (default)
# - Optional: Preferred order
# - Serialize: Prevent concurrent actions

# symmetrical=true: Reverse order for stopping
```

### Viewing Constraints

```bash
# View all constraints
sudo pcs constraint

# View specific constraint types
sudo pcs constraint location
sudo pcs constraint colocation
sudo pcs constraint order

# View constraints in XML format (detailed)
sudo pcs constraint --full
```

### Resource Sets

For complex constraints involving multiple resources:

```bash
# Order multiple resources as a set
sudo pcs constraint order set resource1 resource2 resource3 sequential=true

# Colocation set (all resources on same node)
sudo pcs constraint colocation set resource1 resource2 resource3
```

## STONITH/Fencing

STONITH (Shoot The Other Node In The Head) is critical for cluster safety. It ensures that failed nodes are properly isolated to prevent data corruption.

### Why Fencing is Essential

- **Split-brain prevention**: Ensures only one partition writes to shared storage
- **Resource recovery**: Allows cluster to safely restart resources
- **Data integrity**: Prevents multiple nodes from corrupting shared data

### Checking STONITH Status

```bash
# View current STONITH configuration
sudo pcs stonith status

# Check if STONITH is enabled
sudo pcs property show stonith-enabled
```

### Common STONITH Agents

```bash
# List available STONITH agents
sudo pcs stonith list

# Get info about a specific agent
sudo pcs stonith describe fence_vmware_soap
sudo pcs stonith describe fence_ipmilan
sudo pcs stonith describe fence_aws
```

### Configuring IPMI Fencing

For physical servers with IPMI/BMC:

```bash
# Create IPMI fencing for node1
sudo pcs stonith create fence-node1 fence_ipmilan \
    ipaddr=192.168.1.201 \
    login=admin \
    passwd=secret \
    lanplus=1 \
    pcmk_host_list=node1 \
    pcmk_host_check=static-list \
    op monitor interval=60s

# Create fencing for node2
sudo pcs stonith create fence-node2 fence_ipmilan \
    ipaddr=192.168.1.202 \
    login=admin \
    passwd=secret \
    lanplus=1 \
    pcmk_host_list=node2 \
    pcmk_host_check=static-list \
    op monitor interval=60s

# Create fencing for node3
sudo pcs stonith create fence-node3 fence_ipmilan \
    ipaddr=192.168.1.203 \
    login=admin \
    passwd=secret \
    lanplus=1 \
    pcmk_host_list=node3 \
    pcmk_host_check=static-list \
    op monitor interval=60s
```

### Configuring VMware Fencing

For VMware virtual machines:

```bash
# Create VMware fencing device
sudo pcs stonith create vmware-fence fence_vmware_soap \
    ipaddr=vcenter.example.com \
    login=administrator@vsphere.local \
    passwd=secret \
    ssl=1 \
    ssl_insecure=1 \
    pcmk_host_map="node1:vm-node1;node2:vm-node2;node3:vm-node3" \
    op monitor interval=60s
```

### Configuring AWS Fencing

For AWS EC2 instances:

```bash
# Create AWS EC2 fencing device
sudo pcs stonith create aws-fence fence_aws \
    region=us-east-1 \
    access_key=AKIAIOSFODNN7EXAMPLE \
    secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
    pcmk_host_map="node1:i-1234567890abcdef0;node2:i-0987654321fedcba0" \
    op monitor interval=60s
```

### Location Constraints for Fencing

Prevent a node from fencing itself:

```bash
# Node1 cannot use fence-node1 to fence itself
sudo pcs constraint location fence-node1 avoids node1=INFINITY
sudo pcs constraint location fence-node2 avoids node2=INFINITY
sudo pcs constraint location fence-node3 avoids node3=INFINITY
```

### Testing Fencing

```bash
# Test fencing agent (dry run - does not actually fence)
sudo pcs stonith fence node2 --off

# Actually fence a node (USE WITH CAUTION!)
# This will power off the specified node
sudo stonith_admin -F node2

# Check fencing history
sudo pcs stonith history
```

### Disabling STONITH (Not Recommended for Production)

Only for testing environments:

```bash
# Disable STONITH (NOT RECOMMENDED FOR PRODUCTION)
sudo pcs property set stonith-enabled=false

# WARNING: Running a production cluster without STONITH
# risks data corruption and split-brain scenarios
```

## Managing with pcs Command

The `pcs` command is the primary tool for managing Pacemaker/Corosync clusters.

### Cluster Management

```bash
# Start cluster on all nodes
sudo pcs cluster start --all

# Stop cluster on all nodes
sudo pcs cluster stop --all

# Start cluster on specific node
sudo pcs cluster start node2

# Restart cluster on all nodes
sudo pcs cluster stop --all && sudo pcs cluster start --all

# Put a node in standby (resources migrate away)
sudo pcs node standby node2

# Remove node from standby
sudo pcs node unstandby node2

# View cluster configuration
sudo pcs config
```

### Resource Management

```bash
# List all resources
sudo pcs resource

# Show detailed resource status
sudo pcs resource status

# Start a stopped resource
sudo pcs resource enable webserver

# Stop a resource
sudo pcs resource disable webserver

# Restart a resource
sudo pcs resource restart webserver

# Move resource to specific node
sudo pcs resource move webserver node2

# Clear resource constraints (after move)
sudo pcs resource clear webserver

# Delete a resource
sudo pcs resource delete webserver

# Cleanup failed resource state
sudo pcs resource cleanup webserver
```

### Configuration Management

```bash
# View all cluster properties
sudo pcs property

# Set a cluster property
sudo pcs property set default-resource-stickiness=100

# Common properties:
# - stonith-enabled: Enable/disable fencing
# - no-quorum-policy: Action when quorum is lost (ignore, freeze, stop, suicide)
# - default-resource-stickiness: Preference to keep resources on current node
# - migration-threshold: Failures before migration

# View cluster defaults
sudo pcs resource defaults

# Set resource defaults
sudo pcs resource defaults update resource-stickiness=100
```

### Debugging and Information

```bash
# Show cluster status in detail
sudo pcs status --full

# Show cluster configuration in XML
sudo pcs cluster cib

# Verify cluster configuration
sudo pcs cluster verify

# Show cluster logs
sudo pcs cluster log

# Show quorum status
sudo pcs quorum status

# Show constraint rules
sudo pcs constraint rules
```

## Cluster Monitoring

### Real-Time Monitoring with crm_mon

```bash
# Interactive monitoring (updates every 5 seconds)
sudo crm_mon

# Single status check
sudo crm_mon -1

# Show inactive resources
sudo crm_mon -1 -r

# Show node attributes
sudo crm_mon -1 -A

# Show fail counts
sudo crm_mon -1 -f

# Comprehensive view
sudo crm_mon -1 -rfA
```

### Monitoring Commands Summary

```bash
# Quick cluster health check
sudo pcs status

# Detailed node status
sudo pcs status nodes

# Resource status
sudo pcs status resources

# Check for errors and warnings
sudo pcs status --full | grep -E "FAILED|WARN|error"

# View corosync status
sudo corosync-cfgtool -s

# View quorum status
sudo corosync-quorumtool
```

### Log Files for Monitoring

```bash
# Main Pacemaker log
sudo tail -f /var/log/pacemaker/pacemaker.log

# Corosync log
sudo tail -f /var/log/corosync/corosync.log

# System log (includes cluster events)
sudo journalctl -u pacemaker -u corosync -f

# Search for errors in logs
sudo grep -i error /var/log/pacemaker/pacemaker.log | tail -20
```

### Setting Up Email Alerts

```bash
# Create an alert resource for email notifications
sudo pcs alert create id=email_alert \
    path=/var/lib/pacemaker/alert_email.sh \
    options email=admin@example.com

# Add recipient
sudo pcs alert recipient add email_alert id=admin_email value=admin@example.com

# Create the alert script
sudo cat > /var/lib/pacemaker/alert_email.sh << 'EOF'
#!/bin/bash
# Pacemaker alert script for email notifications
recipient="$CRM_alert_recipient"
subject="Cluster Alert: $CRM_alert_kind on $CRM_alert_node"
body="Alert: $CRM_alert_desc
Node: $CRM_alert_node
Time: $CRM_alert_timestamp"

echo "$body" | mail -s "$subject" "$recipient"
EOF

sudo chmod +x /var/lib/pacemaker/alert_email.sh
```

## Failover Testing

Testing failover is crucial to ensure your cluster behaves as expected during real failures.

### Controlled Failover Tests

```bash
# Test 1: Standby a node
# This gracefully moves all resources off the node
sudo pcs node standby node1

# Check that resources moved
sudo pcs status

# Bring node back online
sudo pcs node unstandby node1

# Verify resources (may or may not move back depending on stickiness)
sudo pcs status
```

### Simulating Resource Failure

```bash
# Test 2: Stop a resource's underlying service
# This simulates application failure

# Stop Apache directly (not through cluster)
sudo ssh node1 "systemctl stop apache2"

# Watch the cluster detect failure and recover
watch -n 2 'sudo pcs status'

# The cluster should detect the failure and restart Apache
# or move it to another node depending on configuration
```

### Simulating Node Failure

```bash
# Test 3: Simulate complete node failure
# WARNING: This will make the node unavailable

# Option A: Network isolation (safest test)
sudo ssh node2 "iptables -A INPUT -j DROP && iptables -A OUTPUT -j DROP"

# Option B: Crash the node (more realistic but disruptive)
sudo ssh node2 "echo c > /proc/sysrq-trigger"

# Watch cluster response
watch -n 2 'sudo pcs status'

# After testing, restore the node:
# - If using iptables: flush rules or reboot
# - If crashed: start the VM/server and start cluster services
```

### Testing STONITH

```bash
# Test 4: Verify STONITH works
# Use --off flag to test without actually fencing
sudo pcs stonith fence node2 --off

# This should show success without actually powering off node2
```

### Verifying Failover Behavior

```bash
# After any failover test, verify:

# 1. Resources are running somewhere
sudo pcs resource status

# 2. No resources are in failed state
sudo pcs resource failcount show

# 3. Cluster is healthy
sudo pcs status

# 4. All expected nodes are online
sudo pcs status nodes
```

### Recovery After Testing

```bash
# Clean up any failed resource states
sudo pcs resource cleanup

# If resources don't move back automatically, clear move constraints
sudo pcs resource clear webserver

# Restart services if needed
sudo pcs cluster stop node2 && sudo pcs cluster start node2
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Nodes Not Seeing Each Other

```bash
# Check 1: Verify network connectivity
ping node2

# Check 2: Verify firewall rules
# Required ports: 2224 (pcsd), 3121 (pacemaker), 5403 (corosync), 5404-5405 (corosync)
sudo ufw status
sudo ufw allow 2224/tcp
sudo ufw allow 3121/tcp
sudo ufw allow 5403/tcp
sudo ufw allow 5404/udp
sudo ufw allow 5405/udp

# Check 3: Verify Corosync configuration matches on all nodes
sudo cat /etc/corosync/corosync.conf

# Check 4: Check Corosync ring status
sudo corosync-cfgtool -s
```

#### Issue: Resources Not Starting

```bash
# Check 1: View resource status with error details
sudo pcs resource status

# Check 2: Check for resource failures
sudo pcs resource failcount show

# Check 3: View detailed resource status
sudo pcs resource debug-start webserver

# Check 4: Check resource agent logs
sudo grep webserver /var/log/pacemaker/pacemaker.log | tail -50

# Check 5: Clear failed state and retry
sudo pcs resource cleanup webserver
```

#### Issue: Split-Brain Scenario

```bash
# Check 1: Verify quorum
sudo corosync-quorumtool

# Check 2: Check if STONITH is properly configured
sudo pcs stonith status

# Check 3: Verify fencing works
sudo pcs stonith fence node2 --off

# Resolution: If in split-brain, stop cluster on minority partition
sudo pcs cluster stop  # On minority nodes only
```

#### Issue: Resource Keeps Failing Over

```bash
# Check 1: View fail counts
sudo pcs resource failcount show

# Check 2: Check migration threshold
sudo pcs resource show webserver

# Check 3: Increase migration threshold
sudo pcs resource update webserver meta migration-threshold=5

# Check 4: Clear fail counts
sudo pcs resource cleanup webserver
```

### Diagnostic Commands

```bash
# Comprehensive cluster diagnostics
sudo pcs status --full

# Check Pacemaker status
sudo systemctl status pacemaker

# Check Corosync status
sudo systemctl status corosync

# View cluster configuration
sudo pcs config show

# Verify configuration
sudo pcs cluster verify -V

# Check for constraint violations
sudo pcs constraint

# View cluster CIB (Cluster Information Base) in XML
sudo pcs cluster cib

# Export configuration for backup/review
sudo pcs config backup cluster_backup
```

### Log Analysis

```bash
# View recent Pacemaker errors
sudo journalctl -u pacemaker --since "1 hour ago" | grep -i error

# View Corosync events
sudo journalctl -u corosync --since "1 hour ago"

# Follow cluster logs in real-time
sudo journalctl -u pacemaker -u corosync -f

# Check for common error patterns
sudo grep -E "error|fail|cannot|unable" /var/log/pacemaker/pacemaker.log | tail -30
```

### Resetting the Cluster

If you need to start fresh:

```bash
# Stop cluster on all nodes
sudo pcs cluster stop --all

# Destroy cluster configuration (CAUTION: removes all config)
sudo pcs cluster destroy

# Remove all configuration files manually if needed
sudo rm -f /etc/corosync/corosync.conf
sudo rm -rf /var/lib/pacemaker/cib/*
sudo rm -rf /var/lib/corosync/*

# Reinstall if necessary
sudo apt install --reinstall pacemaker corosync pcs
```

## Summary

Pacemaker and Corosync provide a robust, enterprise-grade high availability solution for Ubuntu systems. Key takeaways:

1. **Corosync** handles cluster communication and membership
2. **Pacemaker** manages resources and failover logic
3. **STONITH/Fencing** is critical for production clusters
4. **Constraints** control resource placement and ordering
5. **Testing** failover before going to production is essential
6. **Monitoring** and alerting ensure quick response to issues

### Quick Reference Commands

```bash
# Cluster status
sudo pcs status

# Start/stop cluster
sudo pcs cluster start --all
sudo pcs cluster stop --all

# Resource management
sudo pcs resource create <name> <agent> [options]
sudo pcs resource delete <name>
sudo pcs resource move <name> <node>

# Node management
sudo pcs node standby <node>
sudo pcs node unstandby <node>

# Constraints
sudo pcs constraint location <resource> prefers <node>
sudo pcs constraint colocation add <r1> with <r2>
sudo pcs constraint order <r1> then <r2>

# STONITH
sudo pcs stonith create <name> <agent> [options]
sudo pcs stonith fence <node>

# Troubleshooting
sudo pcs resource cleanup
sudo pcs cluster verify
```

---

## Monitor Your Cluster with OneUptime

While Pacemaker provides built-in monitoring and failover capabilities, production environments benefit from external observability. **OneUptime** offers comprehensive monitoring for your high availability cluster:

- **Uptime Monitoring**: Track the availability of your cluster VIP and services from multiple global locations
- **Custom Metrics**: Collect and visualize Pacemaker resource states, node health, and quorum status
- **Alerting**: Get notified via SMS, email, Slack, or PagerDuty when cluster events occur
- **Status Pages**: Communicate cluster health to stakeholders with public or private status pages
- **Incident Management**: Coordinate response when cluster issues arise
- **Log Management**: Centralize and search cluster logs for debugging and compliance

With OneUptime, you gain visibility beyond what the cluster itself provides, ensuring you catch issues before they impact your users. Visit [https://oneuptime.com](https://oneuptime.com) to start monitoring your Pacemaker/Corosync cluster today.
