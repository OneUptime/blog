# How to Configure Booth for Multi-Site Pacemaker Clusters on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Booth, Pacemaker, Multi-Site, High Availability, Cluster, Linux

Description: Learn how to configure Booth for multi-site Pacemaker clusters on RHEL to provide geographic failover between data centers.

---

Booth is a cluster ticket manager that enables multi-site Pacemaker clusters on RHEL. It coordinates failover between geographically separated clusters, ensuring that resources run at only one site at a time using distributed consensus.

## Prerequisites

- Two Pacemaker clusters at different sites
- An arbitrator node (can be a small VM at a third location)
- Network connectivity between all sites
- STONITH fencing configured at each site

## Understanding Booth Architecture

Booth uses tickets to control which site runs resources:

- A **ticket** is a token that grants the right to run specific resources
- Only the site holding a ticket can run the associated resources
- An **arbitrator** provides a third vote to prevent split-brain between two sites

## Step 1: Install Booth

On all cluster nodes:

```bash
sudo dnf install booth-site -y
```

On the arbitrator only:

```bash
sudo dnf install pcs booth-core booth-arbitrator -y
```

## Step 2: Configure Booth

Create the Booth configuration on one node of one cluster:

```bash
sudo pcs booth setup sites 192.168.1.100 192.168.2.100 arbitrators 192.168.3.100
sudo pcs booth ticket add webserver-ticket expire=600 timeout=10 retries=5 renewal-freq=30 before-acquire-handler="/usr/share/booth/service-runnable WebGroup"
```

The site IP addresses should be the floating IPs of each cluster. Synchronize the Booth configuration to the local cluster, then pull it to the arbitrator and the second cluster:

```bash
sudo pcs booth sync

# On the arbitrator
sudo pcs host auth cluster1-node1
sudo pcs booth pull cluster1-node1

# On a node in site 2
sudo pcs host auth cluster1-node1
sudo pcs booth pull cluster1-node1
sudo pcs booth sync
```

## Step 3: Configure Firewall

On all cluster nodes and the arbitrator:

```bash
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --add-service=high-availability
```

## Step 4: Start Booth

On the arbitrator:

```bash
sudo pcs booth start
sudo pcs booth enable
```

On each cluster site, start Booth as a cluster resource (not with systemd directly):

```bash
# On a node in site 1
sudo pcs booth create ip 192.168.1.100

# On a node in site 2
sudo pcs booth create ip 192.168.2.100
```

## Step 5: Configure Ticket Constraints

On both sites, add a ticket constraint to the resource that should be controlled by Booth:

```bash
sudo pcs constraint ticket add webserver-ticket WebGroup
```

This means WebGroup only runs on the site that holds the webserver-ticket.

## Step 6: Grant a Ticket

Grant the ticket to site 1:

```bash
sudo pcs booth ticket grant webserver-ticket
```

Verify ticket status:

```bash
sudo pcs booth status
```

## Step 7: Test Failover

Revoke the ticket from site 1, then grant it from a node in site 2:

```bash
sudo pcs booth ticket revoke webserver-ticket
sudo pcs booth ticket grant webserver-ticket
```

Verify resources moved to site 2:

```bash
sudo pcs status
```

## Automatic Failover

Booth handles automatic failover when a site goes down. If site 1 becomes unreachable:

1. The ticket expires after the `expire` timeout (600 seconds)
2. Site 2 and the arbitrator agree to grant the ticket to site 2
3. Resources start at site 2

## Monitoring Booth

Check ticket status:

```bash
sudo pcs booth status
```

Check Booth configuration:

```bash
sudo pcs booth config
```

View Booth logs:

```bash
sudo journalctl -u booth@booth --no-pager -n 50
```

## Conclusion

Booth provides multi-site coordination for Pacemaker clusters on RHEL. The ticket mechanism ensures that resources run at only one site, and the arbitrator prevents split-brain between sites. Use Booth for geographic disaster recovery where automated failover between data centers is required.
