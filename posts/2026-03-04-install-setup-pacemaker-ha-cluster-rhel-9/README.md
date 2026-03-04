# How to Install and Set Up a Pacemaker High Availability Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, High Availability, Cluster, Corosync, Linux

Description: Learn how to install and set up a Pacemaker high availability cluster on RHEL with Corosync for automated failover.

---

Pacemaker is the standard cluster resource manager on RHEL, working with Corosync for cluster communication. Together they provide automated failover, resource management, and health monitoring for critical services.

## Prerequisites

- At least two RHEL servers with active subscriptions
- Network connectivity between nodes
- DNS or /etc/hosts resolution between nodes
- The High Availability Add-On subscription

## Step 1: Enable the HA Repository

On all nodes:

```bash
sudo subscription-manager repos --enable=rhel-9-for-x86_64-highavailability-rpms
```

## Step 2: Install Pacemaker and pcs

On all nodes:

```bash
sudo dnf install pcs pacemaker fence-agents-all -y
```

## Step 3: Configure the Firewall

On all nodes, allow cluster traffic:

```bash
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
```

## Step 4: Set the hacluster Password

On all nodes, set the password for the `hacluster` user:

```bash
sudo passwd hacluster
```

Use the same password on all nodes.

## Step 5: Start and Enable pcsd

On all nodes:

```bash
sudo systemctl enable --now pcsd
```

## Step 6: Authenticate the Cluster Nodes

From one node (node1):

```bash
sudo pcs host auth node1 node2 -u hacluster
```

Enter the password when prompted.

## Step 7: Create the Cluster

From node1:

```bash
sudo pcs cluster setup my-cluster node1 node2
```

## Step 8: Start the Cluster

```bash
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Step 9: Verify the Cluster

Check cluster status:

```bash
sudo pcs cluster status
```

Check all resources:

```bash
sudo pcs status
```

Verify Corosync communication:

```bash
sudo pcs status corosync
```

## Step 10: Configure STONITH

STONITH (Shoot The Other Node In The Head) fencing is required for production clusters. For testing, you can temporarily disable it:

```bash
sudo pcs property set stonith-enabled=false
```

For production, configure a fencing agent (see the STONITH fencing guide).

## Adding a Cluster Resource

Add a virtual IP resource:

```bash
sudo pcs resource create ClusterVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s
```

Verify the resource is running:

```bash
sudo pcs status resources
```

## Testing Failover

Simulate a node failure:

```bash
sudo pcs cluster stop node1
```

Check that the resource moves to node2:

```bash
sudo pcs status
```

Bring node1 back:

```bash
sudo pcs cluster start node1
```

## Conclusion

A Pacemaker cluster on RHEL provides automated high availability for critical services. The pcs command-line tool simplifies cluster setup and management. Always configure proper STONITH fencing for production deployments.
