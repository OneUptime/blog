# How to Set Up an Active-Passive Cluster with Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Active-Passive, High Availability, Cluster, Failover, Linux

Description: Learn how to set up an active-passive high availability cluster with Pacemaker on RHEL where one node runs services and the other waits as a standby.

---

An active-passive cluster runs services on one node while the other node stands by as a backup. When the active node fails, Pacemaker automatically moves the services to the passive node. This is the most common HA configuration for stateful services.

## Prerequisites

- Two RHEL servers with HA Add-On
- A shared storage device or replicated filesystem
- Network connectivity between nodes
- STONITH fencing configured

## Step 1: Set Up the Basic Cluster

Follow the standard Pacemaker setup on both nodes:

```bash
sudo pcs host auth node1 node2 -u hacluster
sudo pcs cluster setup active-passive node1 node2
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Step 2: Configure Fencing

```bash
sudo pcs stonith create fence-node1 fence_ipmilan \
    ipaddr=10.0.0.101 login=admin passwd=pass lanplus=1 \
    pcmk_host_list=node1

sudo pcs stonith create fence-node2 fence_ipmilan \
    ipaddr=10.0.0.102 login=admin passwd=pass lanplus=1 \
    pcmk_host_list=node2

sudo pcs constraint location fence-node1 avoids node1
sudo pcs constraint location fence-node2 avoids node2
sudo pcs property set stonith-enabled=true
```

## Step 3: Create a Resource Group

For an active-passive configuration, group all resources together so they all run on the same node:

```bash
# Virtual IP
sudo pcs resource create ClusterVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s

# Shared filesystem
sudo pcs resource create SharedFS ocf:heartbeat:Filesystem \
    device=/dev/sdb1 directory=/mnt/data fstype=xfs \
    op monitor interval=20s

# Application service
sudo pcs resource create AppService systemd:myapp \
    op monitor interval=30s

# Group them together
sudo pcs resource group add AppGroup ClusterVIP SharedFS AppService
```

## Step 4: Configure Resource Stickiness

Prevent unnecessary failback when the original node comes back:

```bash
sudo pcs resource defaults update resource-stickiness=100
```

This keeps resources on the current node even when the original node recovers.

## Step 5: Verify the Configuration

```bash
sudo pcs status
```

Expected output:

```
Node List:
  * Online: [ node1 node2 ]

Resource Group: AppGroup:
  * ClusterVIP  (ocf:heartbeat:IPaddr2):    Started node1
  * SharedFS    (ocf:heartbeat:Filesystem):  Started node1
  * AppService  (systemd:myapp):             Started node1
```

All resources run on node1 (active). Node2 is passive.

## Step 6: Test Failover

Simulate a failure by putting node1 in standby:

```bash
sudo pcs node standby node1
```

Verify all resources moved to node2:

```bash
sudo pcs status
```

Bring node1 back:

```bash
sudo pcs node unstandby node1
```

Due to resource stickiness, resources stay on node2 (no unnecessary failback).

## Step 7: Force Failback (If Needed)

To move resources back to node1:

```bash
sudo pcs resource move AppGroup node1
sudo pcs resource clear AppGroup
```

## Configuring Migration Threshold

Set how many failures trigger a move:

```bash
sudo pcs resource meta AppService migration-threshold=3 failure-timeout=120s
```

After 3 failures within 120 seconds, the resource moves to the other node.

## Monitoring Active-Passive Status

Check which node is active:

```bash
sudo pcs resource status
```

Check failover history:

```bash
sudo pcs resource failcount show
```

## Conclusion

An active-passive Pacemaker cluster on RHEL provides straightforward failover for stateful services. Group resources together, configure resource stickiness to prevent unnecessary failback, and always test failover before going to production.
