# How to Configure the Corosync Cluster Engine on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Corosync, Cluster, High Availability, Pacemaker, Linux

Description: Learn how to configure the Corosync cluster communication engine on RHEL for reliable cluster messaging and membership.

---

Corosync is the cluster communication layer that Pacemaker relies on for node membership, messaging, and quorum. On RHEL, Corosync is configured automatically when you create a cluster with pcs, but understanding its configuration is essential for tuning and troubleshooting.

## Prerequisites

- A RHEL cluster set up with pcs and Pacemaker
- Root or sudo access on all nodes

## Understanding Corosync

Corosync provides:

- **Cluster membership** - Tracks which nodes are alive
- **Messaging** - Reliable message delivery between nodes
- **Quorum** - Determines if the cluster has enough nodes to operate

## Viewing the Corosync Configuration

The configuration is stored in `/etc/corosync/corosync.conf`:

```bash
cat /etc/corosync/corosync.conf
```

A typical configuration:

```
totem {
    version: 2
    cluster_name: my-cluster
    transport: knet
    crypto_cipher: aes256
    crypto_hash: sha256
}

nodelist {
    node {
        ring0_addr: node1
        name: node1
        nodeid: 1
    }
    node {
        ring0_addr: node2
        name: node2
        nodeid: 2
    }
}

quorum {
    provider: corosync_votequorum
    two_node: 1
}

logging {
    to_logfile: yes
    logfile: /var/log/cluster/corosync.log
    to_syslog: yes
}
```

## Configuring the Transport

RHEL defaults to `knet` (Kronosnet) transport, which supports multiple links, encryption, and compression:

```
totem {
    transport: knet
}
```

Alternative transports:

- `knet` - Default, supports redundant links and encryption
- `udpu` - Unicast UDP (legacy)

## Configuring Redundant Network Links

For high availability of cluster communication, configure multiple network links:

```bash
sudo pcs cluster setup my-cluster \
    node1 addr=10.0.1.1 addr=10.0.2.1 \
    node2 addr=10.0.1.2 addr=10.0.2.2
```

This creates two communication links. If one network fails, the cluster continues using the other.

Verify link status:

```bash
sudo pcs status corosync
sudo corosync-cfgtool -s
```

## Configuring Encryption

Corosync encrypts cluster communication by default with knet. Verify encryption settings:

```bash
grep crypto /etc/corosync/corosync.conf
```

Change encryption settings:

```bash
sudo pcs cluster config update totem crypto_cipher=aes256 crypto_hash=sha256
```

## Configuring the Totem Protocol

Adjust token timeout (time before declaring a node dead):

```bash
sudo pcs cluster config update totem token=10000
```

The default is 3000ms (3 seconds). Increase it for networks with higher latency.

Adjust consensus timeout:

```bash
sudo pcs cluster config update totem consensus=12000
```

## Viewing Corosync Status

Check ring status:

```bash
sudo corosync-cfgtool -s
```

Check membership:

```bash
sudo corosync-cmapctl | grep members
```

View Corosync quorum status:

```bash
sudo corosync-quorumtool
```

## Monitoring Corosync Logs

View real-time logs:

```bash
sudo tail -f /var/log/cluster/corosync.log
```

Or via journalctl:

```bash
sudo journalctl -u corosync -f
```

## Troubleshooting Corosync

### Nodes Not Seeing Each Other

Check firewall rules:

```bash
sudo firewall-cmd --list-services | grep high-availability
```

Verify network connectivity:

```bash
ping node2
```

Check that Corosync is running:

```bash
sudo systemctl status corosync
```

### Token Timeouts

If nodes frequently leave and rejoin, increase the token timeout:

```bash
sudo pcs cluster config update totem token=10000
```

### Authentication Failures

Regenerate the Corosync auth key:

```bash
sudo pcs cluster destroy
sudo pcs host auth node1 node2 -u hacluster
sudo pcs cluster setup my-cluster node1 node2
sudo pcs cluster start --all
```

## Conclusion

Corosync is the communication backbone of RHEL Pacemaker clusters. Configure redundant network links for resilience, adjust token timeouts for your network, and monitor logs for membership issues. Use pcs commands to manage Corosync configuration rather than editing files directly.
