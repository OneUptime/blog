# How to Set Up Cross-Site RHEL Replication for Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Disaster Recovery, Replication, DRBD, Cross-Site, Linux

Description: Set up cross-site data replication on RHEL using DRBD and rsync to protect against site-level failures and meet strict disaster recovery requirements.

---

Cross-site replication ensures that a copy of your data exists at a geographically separate location. On RHEL, you can achieve this with DRBD for block-level replication or rsync for file-level replication.

## File-Level Cross-Site Replication with rsync

For most use cases, scheduled rsync over SSH provides reliable cross-site replication:

```bash
#!/bin/bash
# /usr/local/bin/cross-site-replicate.sh
# Replicate data to a remote disaster recovery site

PRIMARY_DIRS="/etc /home /var/www /var/lib/pgsql"
DR_HOST="dr-server.remote-site.example.com"
DR_USER="repl"
SSH_KEY="/root/.ssh/dr_replication_key"

for DIR in $PRIMARY_DIRS; do
  rsync -az --delete \
    -e "ssh -i ${SSH_KEY} -p 2222" \
    "${DIR}/" \
    "${DR_USER}@${DR_HOST}:${DIR}/" \
    2>> /var/log/cross-site-repl.log
done
```

Schedule it to run frequently:

```bash
# Replicate every 15 minutes
echo '*/15 * * * * root /usr/local/bin/cross-site-replicate.sh' > /etc/cron.d/cross-site-repl
```

## Block-Level Replication with DRBD

DRBD replicates data at the block device level, providing near-real-time replication:

```bash
# Install DRBD (from ELRepo or a supported repository)
sudo dnf install -y drbd90-utils kmod-drbd90

# Load the DRBD kernel module
sudo modprobe drbd
```

Configure a DRBD resource:

```bash
# /etc/drbd.d/data.res
resource data {
    protocol C;    # Synchronous replication (strongest consistency)

    on primary-server {
        device    /dev/drbd0;
        disk      /dev/sdb1;
        address   10.0.1.10:7789;
        meta-disk internal;
    }

    on dr-server {
        device    /dev/drbd0;
        disk      /dev/sdb1;
        address   10.0.2.10:7789;
        meta-disk internal;
    }

    net {
        # For cross-site (WAN) replication, use protocol A (async)
        # protocol A;
        max-buffers     8192;
        max-epoch-size  8192;
    }
}
```

Initialize and start DRBD:

```bash
# On both servers: create metadata
sudo drbdadm create-md data

# On both servers: bring up the resource
sudo drbdadm up data

# On the primary server: perform initial sync
sudo drbdadm primary --force data

# Check sync status
sudo drbdadm status data
```

## Choosing a Replication Protocol

- **Protocol A (asynchronous):** Best for cross-site WAN links. Lower latency impact but some data loss possible.
- **Protocol B (semi-synchronous):** Data is written to remote memory. Good compromise.
- **Protocol C (synchronous):** No data loss, but requires low-latency links. Best for same-site or short-distance replication.

For cross-site disaster recovery over a WAN link, protocol A is typically the right choice to avoid performance degradation.
