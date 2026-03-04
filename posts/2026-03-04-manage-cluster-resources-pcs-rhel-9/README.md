# How to Manage Cluster Resources with pcs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, pcs, Pacemaker, Cluster, Resources, High Availability, Linux

Description: Learn how to create, manage, and monitor cluster resources using the pcs command on RHEL Pacemaker clusters.

---

The `pcs` command is the primary tool for managing Pacemaker cluster resources on RHEL. It provides a unified interface for creating resources, configuring constraints, and monitoring cluster health.

## Prerequisites

- A running RHEL Pacemaker cluster
- Root or sudo access

## Listing Available Resource Agents

View all available resource agents:

```bash
pcs resource agents
```

View agents from a specific provider:

```bash
pcs resource agents ocf:heartbeat
```

Get help for a specific agent:

```bash
pcs resource describe ocf:heartbeat:IPaddr2
```

## Creating Resources

### Virtual IP Address

```bash
sudo pcs resource create VIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s
```

### Apache Web Server

```bash
sudo pcs resource create WebServer ocf:heartbeat:apache \
    configfile=/etc/httpd/conf/httpd.conf \
    statusurl="http://127.0.0.1/server-status" \
    op monitor interval=30s
```

### Filesystem Mount

```bash
sudo pcs resource create SharedFS ocf:heartbeat:Filesystem \
    device=/dev/sdb1 directory=/mnt/shared fstype=xfs \
    op monitor interval=20s
```

### Systemd Service

```bash
sudo pcs resource create MyService systemd:myservice \
    op monitor interval=30s
```

## Resource Groups

Group resources to run on the same node and start/stop in order:

```bash
sudo pcs resource group add WebGroup VIP WebServer
```

Resources start in order (VIP first, then WebServer) and stop in reverse order.

Add to an existing group at a specific position:

```bash
sudo pcs resource group add WebGroup SharedFS --before WebServer
```

## Viewing Resources

List all resources:

```bash
sudo pcs resource status
```

Detailed resource information:

```bash
sudo pcs resource config
```

Show a specific resource:

```bash
sudo pcs resource config VIP
```

## Starting and Stopping Resources

Stop a resource:

```bash
sudo pcs resource disable VIP
```

Start a resource:

```bash
sudo pcs resource enable VIP
```

Restart a resource:

```bash
sudo pcs resource restart VIP
```

## Moving Resources

Move a resource to a specific node:

```bash
sudo pcs resource move VIP node2
```

This creates a temporary location constraint. Remove it after the move:

```bash
sudo pcs resource clear VIP
```

## Deleting Resources

Remove a resource:

```bash
sudo pcs resource delete VIP
```

## Modifying Resource Parameters

Update a resource parameter:

```bash
sudo pcs resource update VIP ip=192.168.1.200
```

## Configuring Resource Operations

Set monitoring interval:

```bash
sudo pcs resource op add VIP monitor interval=15s timeout=30s
```

Remove an operation:

```bash
sudo pcs resource op remove VIP monitor interval=30s
```

## Resource Meta Attributes

Set how long to wait before moving a resource after a failure:

```bash
sudo pcs resource meta VIP migration-threshold=3
sudo pcs resource meta VIP failure-timeout=60s
```

Make a resource prefer a specific node:

```bash
sudo pcs resource meta VIP resource-stickiness=100
```

Prevent a resource from being managed by the cluster:

```bash
sudo pcs resource unmanage VIP
```

Re-enable management:

```bash
sudo pcs resource manage VIP
```

## Cleaning Up Failed Resources

If a resource has failed, clear the failure count:

```bash
sudo pcs resource cleanup VIP
```

Clear all resource failures:

```bash
sudo pcs resource cleanup
```

## Conclusion

The pcs command on RHEL provides comprehensive resource management for Pacemaker clusters. Use resource groups to keep related resources together, configure monitoring operations for health checking, and use meta attributes to control failover behavior.
