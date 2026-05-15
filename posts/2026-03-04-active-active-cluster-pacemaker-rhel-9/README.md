# How to Set Up an Active-Active Cluster with Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Active-Active, High Availability, Cluster, Load Balancing, Linux

Description: Learn how to set up an active-active high availability cluster with Pacemaker on RHEL where all nodes run services simultaneously.

---

An active-active cluster runs services on all nodes simultaneously, distributing the workload. When a node fails, its workload is redistributed to the remaining nodes. This is used for stateless services like web servers and load balancers.

## Prerequisites

- Two or more RHEL servers with HA Add-On
- Stateless application that can run on multiple nodes
- STONITH fencing configured
- An external load balancer, or a virtual IP for failover

## Step 1: Set Up the Cluster

```bash
sudo pcs host auth node1 node2 node3 -u hacluster
sudo pcs cluster setup active-active node1 node2 node3
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Step 2: Configure Fencing

Configure fencing for each node (see the STONITH guide for details):

```bash
sudo pcs property set stonith-enabled=true
```

## Step 3: Create a Clone Resource

Clone resources run on multiple nodes simultaneously:

```bash
# Create the base resource

sudo pcs resource create WebServer ocf:heartbeat:apache \
    configfile=/etc/httpd/conf/httpd.conf \
    statusurl="http://127.0.0.1/server-status" \
    op monitor interval=30s

# Clone it to run on all nodes
sudo pcs resource clone WebServer
```

Verify it runs on all nodes:

```bash
sudo pcs status
```

Output:

```bash
Clone Set: WebServer-clone [WebServer]:
  * Started: [ node1 node2 node3 ]
```

## Step 4: Configure a Failover Virtual IP

For a single VIP that clients connect to:

```bash
sudo pcs resource create ClusterVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s
```

This VIP runs on one node at a time for failover. It does not load-balance traffic across all web server clones by itself; use an external load balancer for traffic distribution.

## Step 5: Use Promotable Clone Resources

For resources whose resource agent supports promoted and unpromoted roles (such as a replicated PostgreSQL database):

```bash
sudo pcs resource create DBServer ocf:heartbeat:pgsql \
    pgctl=/usr/bin/pg_ctl \
    psql=/usr/bin/psql \
    pgdata=/var/lib/pgsql/data \
    op monitor OCF_CHECK_LEVEL=0 timeout=30s interval=30s \
    op monitor OCF_CHECK_LEVEL=0 timeout=30s interval=29s role=Promoted

sudo pcs resource promotable DBServer \
    promoted-max=1 promoted-node-max=1 \
    clone-max=3 clone-node-max=1
```

## Step 6: Configure Clone Resource Limits

Control how many instances run:

```bash
# Maximum number of clones (default: number of nodes)
sudo pcs resource meta WebServer-clone clone-max=3

# Maximum clones per node
sudo pcs resource meta WebServer-clone clone-node-max=1
```

## Step 7: Colocation with Clone Resources

Colocate a VIP with the promoted instance of a promotable clone:

```bash
sudo pcs constraint colocation add ClusterVIP with promoted DBServer-clone INFINITY
```

Order the VIP to start after the promoted instance:

```bash
sudo pcs constraint order promote DBServer-clone then start ClusterVIP
```

## Step 8: Verify Active-Active Configuration

```bash
sudo pcs status
```

Check that clone resources are running on all nodes. Test by stopping one node:

```bash
sudo pcs node standby node2
sudo pcs status
```

The clone continues on the remaining nodes.

Bring the node back:

```bash
sudo pcs node unstandby node2
```

The clone resource automatically starts on the returning node.

## Monitoring Active-Active Resources

View clone status:

```bash
sudo pcs status resources
```

Check resource placement:

```bash
sudo pcs constraint location config
```

## Conclusion

Active-active Pacemaker clusters on RHEL maximize resource utilization by running services on all nodes. Use clone resources for stateless services and promotable clones for primary-secondary configurations. Combined with a virtual IP or external load balancer, this provides both high availability and load distribution.
