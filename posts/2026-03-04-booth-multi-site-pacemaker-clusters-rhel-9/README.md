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

On all cluster nodes and the arbitrator:

```bash
sudo dnf install booth-site -y
```

On the arbitrator only:

```bash
sudo dnf install booth-arbitrator -y
```

## Step 2: Configure Booth

Create the same configuration on all nodes and the arbitrator:

```bash
sudo tee /etc/booth/booth.conf << 'CONF'
transport="UDP"
port="9929"

# Site 1 cluster
site="192.168.1.100"

# Site 2 cluster
site="192.168.2.100"

# Arbitrator
arbitrator="192.168.3.100"

# Define a ticket
ticket="webserver-ticket"
    expire="600"
    timeout="10"
    retries="5"
    renewal-freq="30"
    before-acquire-handler="/usr/share/booth/service-runnable.sh"
CONF
```

The IP addresses should be the virtual IPs of each cluster or the IPs of specific nodes.

## Step 3: Configure Firewall

On all nodes:

```bash
sudo firewall-cmd --permanent --add-port=9929/tcp
sudo firewall-cmd --permanent --add-port=9929/udp
sudo firewall-cmd --reload
```

## Step 4: Start Booth

On the arbitrator:

```bash
sudo systemctl enable --now booth@booth
```

On each cluster site, start Booth as a cluster resource (not with systemd directly):

```bash
sudo pcs resource create booth-ip ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24

sudo pcs resource create booth-site ocf:pacemaker:booth-site \
    config=/etc/booth/booth.conf \
    op monitor interval=30s

sudo pcs resource group add booth-group booth-ip booth-site
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
sudo booth client grant -t webserver-ticket -s 192.168.1.100
```

Verify ticket status:

```bash
sudo booth client list
```

## Step 7: Test Failover

Revoke the ticket from site 1 and grant to site 2:

```bash
sudo booth client revoke -t webserver-ticket -s 192.168.1.100
sudo booth client grant -t webserver-ticket -s 192.168.2.100
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
sudo booth client list
```

Check Booth service status:

```bash
sudo systemctl status booth@booth
```

View Booth logs:

```bash
sudo journalctl -u booth@booth --no-pager -n 50
```

## Conclusion

Booth provides multi-site coordination for Pacemaker clusters on RHEL. The ticket mechanism ensures that resources run at only one site, and the arbitrator prevents split-brain between sites. Use Booth for geographic disaster recovery where automated failover between data centers is required.
