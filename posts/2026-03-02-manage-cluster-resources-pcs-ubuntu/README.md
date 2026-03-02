# How to Manage Cluster Resources with pcs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, High Availability, Pacemaker, Clustering, pcs

Description: A practical guide to managing Pacemaker cluster resources using the pcs command-line tool on Ubuntu, covering resource creation, constraints, and operations.

---

The `pcs` command-line tool is the primary interface for configuring and managing Pacemaker/Corosync clusters. It wraps the lower-level `crm` and `cibadmin` tools in a more approachable interface. Knowing how to use it effectively makes the difference between a cluster you can maintain confidently and one that feels like a black box.

## Installing pcs

On Ubuntu, pcs is available through the standard repositories:

```bash
# Install pcs and the cluster stack
sudo apt update
sudo apt install -y pacemaker corosync pcs

# Set password for hacluster user (required for pcsd authentication)
sudo passwd hacluster

# Enable and start pcsd daemon
sudo systemctl enable --now pcsd
```

## Authenticating Cluster Nodes

Before managing a cluster, authenticate the nodes:

```bash
# Authenticate nodes from one node (replace with your node names)
sudo pcs host auth node1 node2 -u hacluster -p yourpassword

# Verify authentication status
sudo pcs host status
```

## Understanding Cluster Resources

Resources are the services Pacemaker manages - IP addresses, web servers, database services, and so on. Each resource has a type (the resource agent that knows how to start/stop/monitor it), and configuration parameters.

Resource agents live in `/usr/lib/ocf/resource.d/` and come from several standards:
- OCF (Open Cluster Framework) - most feature-rich
- LSB (Linux Standard Base) - legacy init script style
- systemd - wraps systemd units

```bash
# List available resource agents by provider
sudo pcs resource agents ocf

# List agents from a specific provider
sudo pcs resource agents ocf:heartbeat

# Get details about a specific agent
sudo pcs resource describe ocf:heartbeat:IPaddr2
```

## Creating Resources

The basic syntax for creating a resource:

```bash
# Create a floating IP resource
sudo pcs resource create cluster-vip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.1.50 \
  cidr_netmask=24 \
  op monitor interval=30s

# Create an Apache resource
sudo pcs resource create apache-web \
  ocf:heartbeat:apache \
  configfile=/etc/apache2/apache2.conf \
  statusurl="http://localhost/server-status" \
  op monitor interval=30s

# Create a systemd service resource
sudo pcs resource create nginx-service \
  systemd:nginx \
  op monitor interval=30s timeout=30s
```

## Viewing Resource Status

```bash
# Show cluster status with resources
sudo pcs status

# Show detailed resource information
sudo pcs resource show

# Show configuration of a specific resource
sudo pcs resource show cluster-vip

# Show resource operations history
sudo pcs resource history cluster-vip
```

## Resource Groups

Groups allow multiple resources to run on the same node and start/stop in order:

```bash
# Create a group with IP and web server
sudo pcs resource group add webservice cluster-vip apache-web

# Add a resource to an existing group at a specific position
sudo pcs resource group add webservice mysql-service --before apache-web

# View group configuration
sudo pcs resource show webservice

# Remove a resource from a group
sudo pcs resource ungroup webservice apache-web
```

## Resource Clones

Clones run on multiple nodes simultaneously - useful for services that should run everywhere:

```bash
# Create a clone resource (runs on all nodes)
sudo pcs resource create dlm \
  ocf:pacemaker:controld \
  op monitor interval=30s on-fail=fence

sudo pcs resource clone dlm

# Create a promotable clone (formerly master/slave, e.g., for DRBD)
sudo pcs resource create mydata \
  ocf:linbit:drbd \
  drbd_resource=mydata \
  op monitor interval=30s

sudo pcs resource promotable mydata \
  promoted-max=1 \
  promoted-node-max=1 \
  clone-max=2 \
  clone-node-max=1 \
  notify=true
```

## Resource Constraints

Constraints control where and when resources run.

### Location Constraints

```bash
# Force a resource to prefer a specific node
sudo pcs constraint location apache-web prefers node1=100

# Prevent a resource from running on a specific node
sudo pcs constraint location apache-web avoids node2

# Show all location constraints
sudo pcs constraint location show
```

### Order Constraints

```bash
# Start IP before Apache (and stop Apache before IP)
sudo pcs constraint order cluster-vip then apache-web

# Start IP before Apache, but allow independent stopping
sudo pcs constraint order start cluster-vip then start apache-web kind=Optional

# Show all order constraints
sudo pcs constraint order show
```

### Colocation Constraints

```bash
# Force Apache to run on the same node as the IP
sudo pcs constraint colocation add apache-web with cluster-vip INFINITY

# Run Apache near the IP but not required
sudo pcs constraint colocation add apache-web with cluster-vip 100

# Show all colocation constraints
sudo pcs constraint colocation show
```

## Controlling Resources Manually

```bash
# Move a resource to a specific node (creates a temporary location constraint)
sudo pcs resource move apache-web node2

# Move a resource, giving it time to migrate
sudo pcs resource move apache-web node2 --wait=60

# Clear the temporary constraint created by move
sudo pcs resource clear apache-web

# Restart a resource
sudo pcs resource restart apache-web

# Disable a resource (stops it and prevents starting)
sudo pcs resource disable apache-web

# Enable a resource
sudo pcs resource enable apache-web
```

## Node Management

```bash
# Put a node in standby (resources will migrate away)
sudo pcs node standby node1

# Bring a node out of standby
sudo pcs node unstandby node1

# Show node attributes
sudo pcs node attribute show

# Set a node attribute (useful for location constraint rules)
sudo pcs node attribute node1 role=primary

# Put cluster in maintenance mode (stops all monitoring)
sudo pcs property set maintenance-mode=true

# Exit maintenance mode
sudo pcs property set maintenance-mode=false
```

## Resource Operations

You can update resource operation intervals and timeouts:

```bash
# Update the monitor interval for a resource
sudo pcs resource update apache-web \
  op monitor interval=60s timeout=30s

# Add a start operation with custom timeout
sudo pcs resource update apache-web \
  op start timeout=120s

# View all operations for a resource
sudo pcs resource show apache-web
```

## Working with the CIB Directly

For complex changes, working directly with the Cluster Information Base (CIB) can be useful:

```bash
# Save a copy of the current CIB
sudo pcs cluster cib > /tmp/cluster-backup.xml

# Create a temporary CIB file for testing changes
sudo pcs cluster cib /tmp/new-config.xml

# Make changes to the temporary CIB
sudo pcs -f /tmp/new-config.xml resource create test-resource \
  ocf:heartbeat:Dummy

# Apply the modified CIB to the live cluster
sudo pcs cluster cib-push /tmp/new-config.xml

# Verify CIB syntax
sudo crm_verify -L -V
```

## Cleaning Up Failed Resources

After a failure, Pacemaker may leave a resource in a failed state that needs clearing:

```bash
# Show failed operations
sudo pcs status | grep -A5 "Failed"

# Clean up failed resource (resets fail count and allows restart)
sudo pcs resource cleanup apache-web

# Clean up for a specific node
sudo pcs resource cleanup apache-web node=node1

# Reset fail count manually
sudo crm_failcount -r apache-web -D
```

## Monitoring Cluster Events

```bash
# Watch cluster status in real time
sudo watch -n2 pcs status

# Monitor pacemaker events
sudo crm_mon -1

# Stream pacemaker logs
sudo journalctl -u pacemaker -f

# Check for configuration errors
sudo crm_verify -L
```

The `pcs` tool covers almost every cluster management task you will encounter day to day. The key is to understand the relationship between resources, groups, and constraints - once that mental model is solid, the commands follow logically. Always test configuration changes on non-production clusters first, and keep a backup of the CIB before making significant changes.
