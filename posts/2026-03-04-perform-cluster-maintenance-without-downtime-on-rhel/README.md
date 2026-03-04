# How to Perform Cluster Maintenance Without Downtime on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Cluster, Maintenance, High Availability, Rolling Updates

Description: Learn how to perform rolling maintenance on a Pacemaker cluster on RHEL without causing service downtime, including patching, rebooting, and upgrading cluster nodes.

---

Production clusters need regular maintenance for security patches, kernel updates, and software upgrades. The key is to take nodes out of service one at a time so the cluster keeps running throughout.

## Put a Node in Standby Mode

Standby mode tells Pacemaker to move all resources off a node without removing it from the cluster.

```bash
# Put node1 into standby (resources migrate to other nodes)
sudo pcs node standby node1

# Verify resources moved away from node1
sudo pcs status

# You should see all resources running on node2
```

## Perform Maintenance on the Standby Node

```bash
# Now safely update the standby node
sudo dnf update -y

# If a kernel update was applied, reboot
sudo reboot
```

## Bring the Node Back Online

```bash
# After the node is back up, remove standby mode
sudo pcs node unstandby node1

# Verify the node rejoined the cluster
sudo pcs status
```

## Enable Maintenance Mode for the Entire Cluster

If you need to stop Pacemaker from managing resources temporarily (for example, to make manual changes to a resource configuration), use maintenance mode.

```bash
# Put the whole cluster in maintenance mode
sudo pcs property set maintenance-mode=true

# Pacemaker stops monitoring and managing all resources
# Resources keep running but won't be restarted if they fail

# Perform your changes, then disable maintenance mode
sudo pcs property set maintenance-mode=false
```

## Put a Single Resource in Maintenance

```bash
# Disable monitoring for a specific resource
sudo pcs resource unmanage my_resource

# Do your work on that resource

# Re-enable management
sudo pcs resource manage my_resource

# Force a probe to sync resource state
sudo pcs resource cleanup my_resource
```

## Rolling Upgrade Procedure

For a proper rolling upgrade across all nodes:

```bash
# Step 1: Standby node1, update it, reboot, unstandby
sudo pcs node standby node1
# (wait for resources to migrate)
ssh node1 "sudo dnf update -y && sudo reboot"
# (wait for node1 to come back)
sudo pcs node unstandby node1
# (wait for node1 to rejoin and sync)

# Step 2: Repeat for node2
sudo pcs node standby node2
ssh node2 "sudo dnf update -y && sudo reboot"
sudo pcs node unstandby node2

# Step 3: Verify cluster health
sudo pcs status
sudo pcs resource cleanup
```

## Verify After Maintenance

```bash
# Check for any failed actions
sudo pcs status --full

# Clear any errors from the maintenance window
sudo pcs resource cleanup

# Confirm all resources are started
sudo pcs resource status
```

Always test your maintenance procedure in a staging environment first. Never put all nodes in standby at the same time, or you will lose service availability.
