# How to Back Up and Recover a Ceph Cluster on RHEL After Node Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, Backups, Recovery, Disaster Recovery

Description: Back up critical Ceph cluster configuration and recover from node failures on RHEL, including monitor recovery, OSD replacement, and data restoration.

---

Ceph self-heals by replicating data across OSDs, but losing enough nodes at once or losing all monitors can be catastrophic. Backing up cluster configuration and knowing recovery procedures is essential.

## Back Up Cluster Configuration

```bash
# Back up the monitor map
sudo ceph mon getmap -o /backup/ceph/monmap.bin

# Back up the OSD map
sudo ceph osd getmap -o /backup/ceph/osdmap.bin

# Back up the CRUSH map
sudo ceph osd getcrushmap -o /backup/ceph/crushmap.bin

# Back up authentication keys
sudo ceph auth export -o /backup/ceph/auth-keys.txt

# Back up the ceph.conf
sudo cp /etc/ceph/ceph.conf /backup/ceph/ceph.conf

# Back up the admin keyring
sudo cp /etc/ceph/ceph.client.admin.keyring /backup/ceph/
```

Schedule these backups with a cron job:

```bash
# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/ceph-backup.sh" | sudo tee -a /var/spool/cron/root
```

## Recover from a Single OSD Node Failure

When an OSD node goes down, Ceph starts recovery automatically:

```bash
# Check cluster health
sudo ceph health detail

# See which OSDs are down
sudo ceph osd tree | grep down

# If the node will be down for a long time, mark its OSDs out
sudo ceph osd out osd.5
sudo ceph osd out osd.6

# Monitor recovery progress
sudo ceph -w
```

## Replace a Failed OSD Node

After replacing the hardware:

```bash
# Add the new host back to the cluster
sudo ceph orch host add node2 192.168.1.11

# Remove the old OSD entries
sudo ceph osd purge osd.5 --yes-i-really-mean-it
sudo ceph osd purge osd.6 --yes-i-really-mean-it

# Add new OSDs on the replacement node
sudo ceph orch daemon add osd node2:/dev/sdb
sudo ceph orch daemon add osd node2:/dev/sdc
```

## Recover a Monitor

If a monitor node fails:

```bash
# Check monitor quorum
sudo ceph mon stat

# If quorum is still intact, remove the failed monitor
sudo ceph mon remove node2

# Add a new monitor on a replacement node
sudo ceph orch daemon add mon node4:192.168.1.14
```

## Emergency Monitor Recovery

If you lose quorum (majority of monitors):

```bash
# On a surviving monitor node, extract the monmap
sudo ceph-mon -i node1 --extract-monmap /tmp/monmap

# Remove failed monitors from the monmap
monmaptool /tmp/monmap --rm node2
monmaptool /tmp/monmap --rm node3

# Inject the modified monmap
sudo ceph-mon -i node1 --inject-monmap /tmp/monmap

# Start the monitor
sudo systemctl start ceph-mon@node1
```

## Verify Recovery

```bash
# Wait for cluster to reach HEALTH_OK
sudo ceph status

# Verify all PGs are active+clean
sudo ceph pg stat

# Check data integrity with scrubbing
sudo ceph osd deep-scrub all
```

Regular backups of cluster metadata and familiarity with recovery procedures will minimize downtime when failures occur.
