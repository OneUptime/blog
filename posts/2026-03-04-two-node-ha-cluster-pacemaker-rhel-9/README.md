# How to Create a Two-Node High Availability Cluster with Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Two-Node Cluster, High Availability, Corosync, Linux

Description: Learn how to create and configure a two-node high availability cluster with Pacemaker on RHEL with proper quorum and fencing.

---

A two-node cluster is the most common HA configuration, providing automatic failover between two servers. RHEL Pacemaker handles two-node clusters with special quorum rules to ensure proper operation when one node fails.

## Prerequisites

- Two RHEL servers (node1 and node2)
- HA Add-On subscription enabled
- Network connectivity between nodes
- Shared storage or replicated data (if needed)

## Step 1: Prepare Both Nodes

On both nodes, configure /etc/hosts:

```bash
sudo tee -a /etc/hosts << 'HOSTS'
192.168.1.11 node1
192.168.1.12 node2
HOSTS
```

Install packages:

```bash
sudo subscription-manager repos --enable=rhel-9-for-x86_64-highavailability-rpms
sudo dnf install pcs pacemaker fence-agents-all -y
```

Configure firewall:

```bash
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
```

Set hacluster password (same on both nodes):

```bash
sudo passwd hacluster
```

Start pcsd:

```bash
sudo systemctl enable --now pcsd
```

## Step 2: Create the Cluster

From node1:

```bash
sudo pcs host auth node1 node2 -u hacluster
sudo pcs cluster setup two-node-cluster node1 node2
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Step 3: Configure Two-Node Quorum

For two-node clusters, Corosync uses special quorum handling. Verify:

```bash
sudo pcs quorum config
```

The `two_node: 1` option should be set automatically, which enables `wait_for_all` to prevent split-brain on simultaneous startup.

## Step 4: Configure STONITH Fencing

Fencing is required for production clusters. Example with fence_ipmilan:

```bash
sudo pcs stonith create fence-node1 fence_ipmilan \
    ipaddr=192.168.1.101 login=admin passwd=password \
    lanplus=1 pcmk_host_list=node1

sudo pcs stonith create fence-node2 fence_ipmilan \
    ipaddr=192.168.1.102 login=admin passwd=password \
    lanplus=1 pcmk_host_list=node2
```

Use location constraints to ensure each fence device runs on the opposite node:

```bash
sudo pcs constraint location fence-node1 avoids node1
sudo pcs constraint location fence-node2 avoids node2
```

Enable STONITH:

```bash
sudo pcs property set stonith-enabled=true
```

## Step 5: Add a Virtual IP Resource

```bash
sudo pcs resource create VirtualIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s
```

## Step 6: Add a Service Resource

Add an Apache web server resource:

```bash
sudo pcs resource create WebServer ocf:heartbeat:apache \
    configfile=/etc/httpd/conf/httpd.conf \
    statusurl="http://127.0.0.1/server-status" \
    op monitor interval=30s
```

## Step 7: Create Resource Group

Group the VIP and service so they stay together:

```bash
sudo pcs resource group add WebGroup VirtualIP WebServer
```

## Step 8: Verify the Cluster

```bash
sudo pcs status
```

Expected output shows both nodes online and resources running:

```
Cluster name: two-node-cluster
Status of pacemakerd: 'Pacemaker is running'

Node List:
  * Online: [ node1 node2 ]

Resource Group: WebGroup:
  * VirtualIP    (ocf:heartbeat:IPaddr2):     Started node1
  * WebServer    (ocf:heartbeat:apache):      Started node1
```

## Step 9: Test Failover

Put node1 in standby:

```bash
sudo pcs node standby node1
```

Verify resources moved to node2:

```bash
sudo pcs status
```

Bring node1 back:

```bash
sudo pcs node unstandby node1
```

## Conclusion

A two-node Pacemaker cluster on RHEL provides simple, effective high availability. The key considerations are proper fencing configuration and two-node quorum handling. Always test failover before going to production.
