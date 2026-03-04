# How to Configure a High Availability Apache HTTPD Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Apache, HTTPD, High Availability, Pacemaker, Cluster, Linux

Description: Learn how to set up a high availability Apache HTTPD web server cluster on RHEL with Pacemaker for automatic failover.

---

A highly available Apache HTTPD cluster on RHEL uses Pacemaker to manage a virtual IP and the web server service. When the active node fails, the VIP and Apache move to the standby node, keeping the web service accessible.

## Prerequisites

- Two RHEL servers with a running Pacemaker cluster
- STONITH fencing configured
- Apache HTTPD installed on both nodes
- Shared or synchronized web content

## Step 1: Install Apache on Both Nodes

On both nodes:

```bash
sudo dnf install httpd -y
```

## Step 2: Configure Apache

On both nodes, create a status page for monitoring:

```bash
sudo tee /etc/httpd/conf.d/server-status.conf << 'CONF'
<Location /server-status>
    SetHandler server-status
    Require local
</Location>
CONF
```

Create identical web content on both nodes:

```bash
echo "<h1>HA Web Server</h1>" | sudo tee /var/www/html/index.html
```

Do not enable or start Apache with systemd. Pacemaker will manage it:

```bash
sudo systemctl disable httpd
sudo systemctl stop httpd
```

## Step 3: Configure the Firewall

On both nodes:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 4: Create the Virtual IP Resource

```bash
sudo pcs resource create WebVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s
```

## Step 5: Create the Apache Resource

```bash
sudo pcs resource create WebServer ocf:heartbeat:apache \
    configfile=/etc/httpd/conf/httpd.conf \
    statusurl="http://127.0.0.1/server-status" \
    op monitor interval=30s \
    op start timeout=60s \
    op stop timeout=60s
```

## Step 6: Group the Resources

```bash
sudo pcs resource group add WebGroup WebVIP WebServer
```

This ensures the VIP starts before Apache and both run on the same node.

## Step 7: Configure Resource Stickiness

Prevent unnecessary failback:

```bash
sudo pcs resource defaults update resource-stickiness=100
```

## Step 8: Verify the Setup

```bash
sudo pcs status
```

Test the web server:

```bash
curl http://192.168.1.100/
```

## Step 9: Test Failover

Put the active node in standby:

```bash
sudo pcs node standby node1
```

Verify the VIP and Apache moved:

```bash
sudo pcs status
curl http://192.168.1.100/
```

Bring the node back:

```bash
sudo pcs node unstandby node1
```

## Synchronizing Web Content

For consistent content across nodes, use one of:

### rsync with cron

```bash
# On node1, sync to node2 every minute
* * * * * rsync -avz /var/www/html/ node2:/var/www/html/
```

### Shared Storage

Mount shared storage (NFS, GFS2, or iSCSI) at /var/www/html:

```bash
sudo pcs resource create WebFS ocf:heartbeat:Filesystem \
    device=nfs-server:/export/www directory=/var/www/html fstype=nfs \
    op monitor interval=20s

sudo pcs resource group add WebGroup WebVIP WebFS WebServer
```

## Conclusion

A high availability Apache cluster on RHEL with Pacemaker provides automatic failover for web services. Group the VIP, shared storage, and Apache resources together for consistent behavior. Test failover regularly to ensure reliability.
