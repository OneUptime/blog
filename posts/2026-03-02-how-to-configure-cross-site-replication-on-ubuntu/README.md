# How to Configure Cross-Site Replication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Replication, Disaster Recovery, High Availability, Database Administration

Description: A practical guide to configuring cross-site replication on Ubuntu for geographic redundancy, covering PostgreSQL streaming replication across data centers with latency considerations.

---

Cross-site replication extends your replication topology beyond a single data center to geographically distributed sites. The goal is geographic redundancy - if an entire site goes down (power failure, natural disaster, network partition), a replica at another location can take over. The tradeoff is that wide-area network (WAN) latency introduces challenges that local replication doesn't face.

This guide focuses on PostgreSQL cross-site streaming replication on Ubuntu, covering the specific configuration changes needed when replication crosses network boundaries.

## Understanding Cross-Site Replication Challenges

Before configuration, understand what makes cross-site replication different from local replication:

**Latency**: A local replica might have sub-millisecond replication lag. A replica 500 miles away might have 20-50ms round-trip time, which affects synchronous replication performance significantly.

**Bandwidth**: WAL data can be substantial on write-heavy systems. A site pushing 50MB/s of writes generates significant WAN bandwidth costs.

**Split-brain**: When the WAN link goes down, both sites continue operating independently. When connectivity restores, you need a strategy for reconciling divergent histories.

**Security**: Replication traffic crossing the public internet must be encrypted.

## Network Architecture

For cross-site replication, the typical setup is:

- Site A (primary datacenter): `10.0.1.0/24`, Primary PostgreSQL at `10.0.1.10`
- Site B (DR site): `10.0.2.0/24`, Standby PostgreSQL at `10.0.2.10`

Sites connected via a VPN tunnel (WireGuard or IPsec) or a dedicated MPLS link.

## Setting Up WireGuard for Secure Replication

If using the public internet between sites, establish a VPN first:

```bash
# Install WireGuard on both servers
sudo apt-get install -y wireguard

# Generate keys on primary (Site A)
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key
chmod 600 /etc/wireguard/private.key

# View the generated keys
cat /etc/wireguard/private.key
cat /etc/wireguard/public.key
```

Create the WireGuard config on Site A:

```ini
# /etc/wireguard/wg0.conf on Site A (primary)
[Interface]
Address = 172.16.0.1/30
ListenPort = 51820
PrivateKey = <site-a-private-key>

# PostUp/PreDown rules to allow replication traffic through the tunnel
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PreDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = <site-b-public-key>
AllowedIPs = 172.16.0.2/32
Endpoint = <site-b-public-ip>:51820
PersistentKeepalive = 25
```

```ini
# /etc/wireguard/wg0.conf on Site B (standby)
[Interface]
Address = 172.16.0.2/30
ListenPort = 51820
PrivateKey = <site-b-private-key>

[Peer]
PublicKey = <site-a-public-key>
AllowedIPs = 172.16.0.1/32
Endpoint = <site-a-public-ip>:51820
PersistentKeepalive = 25
```

Enable and start WireGuard on both sites:

```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

# Verify tunnel is up
sudo wg show
ping 172.16.0.2  # From Site A, ping Site B tunnel endpoint
```

## Configuring PostgreSQL for Cross-Site Replication

### Primary Server Configuration (Site A)

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Key settings for cross-site replication:

```ini
# WAL settings - larger WAL buffer helps absorb WAN latency spikes
wal_level = replica
max_wal_senders = 10

# Keep more WAL on disk to handle longer network outages
wal_keep_size = 1GB

# WAL archiving as a safety net for large replication gaps
archive_mode = on
archive_command = 'rsync -a %p postgres@172.16.0.2:/var/lib/postgresql/wal_archive/%f'

# Use asynchronous replication for the remote standby to avoid write latency
# (the remote standby is listed here for documentation only - sync mode is off by default)
synchronous_commit = local

# Timeout for standby connections - increase for WAN
wal_sender_timeout = 120s

# Compression can reduce WAN bandwidth usage
# wal_compression = on  # Available in PostgreSQL 9.5+
```

For the replication user and pg_hba.conf:

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

```text
# Allow Site B standby to connect via the VPN tunnel
host    replication     replicator      172.16.0.2/32           md5
```

### Standby Server Configuration (Site B)

After taking a base backup (same procedure as local standby), configure the standby for WAN-specific settings:

```bash
sudo nano /var/lib/postgresql/14/main/postgresql.auto.conf
```

```ini
# Connect to primary via VPN tunnel IP
primary_conninfo = 'host=172.16.0.1 port=5432 user=replicator password=replication_password application_name=site_b_standby connect_timeout=30'

# Use WAL archive as fallback if streaming falls too far behind
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'

# Always follow the latest timeline
recovery_target_timeline = 'latest'

# Slow down hot standby feedback to reduce primary overhead
hot_standby_feedback = on
wal_receiver_timeout = 120s
```

## Monitoring Cross-Site Replication

Replication lag is more significant across sites. Create a comprehensive monitoring script:

```bash
#!/bin/bash
# /usr/local/bin/monitor-cross-site-replication.sh
# Monitors replication health and network connectivity between sites

PRIMARY_HOST="172.16.0.1"
STANDBY_HOST="172.16.0.2"
WARN_LAG_SECONDS=60     # Warn at 1 minute lag
CRIT_LAG_SECONDS=300    # Critical at 5 minutes lag
LOG_FILE="/var/log/cross-site-replication.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check VPN tunnel health
check_vpn() {
    if ! ping -c 3 -W 5 "$PRIMARY_HOST" > /dev/null 2>&1; then
        log "CRITICAL: VPN tunnel to primary is DOWN"
        return 1
    fi
    log "VPN tunnel: OK"
    return 0
}

# Check replication lag
check_lag() {
    LAG=$(psql -h localhost -U postgres -t -c \
        "SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int, -1);")

    if [ "$LAG" -eq -1 ]; then
        log "WARNING: Cannot determine replication lag (no transactions replayed yet)"
        return 0
    fi

    if [ "$LAG" -gt "$CRIT_LAG_SECONDS" ]; then
        log "CRITICAL: Replication lag is ${LAG}s (threshold: ${CRIT_LAG_SECONDS}s)"
        return 2
    elif [ "$LAG" -gt "$WARN_LAG_SECONDS" ]; then
        log "WARNING: Replication lag is ${LAG}s (threshold: ${WARN_LAG_SECONDS}s)"
        return 1
    fi

    log "Replication lag: ${LAG}s - OK"
    return 0
}

# Check WAL receiver status
check_wal_receiver() {
    STATUS=$(psql -h localhost -U postgres -t -c \
        "SELECT status FROM pg_stat_wal_receiver;" 2>/dev/null | tr -d ' ')

    if [ "$STATUS" != "streaming" ]; then
        log "WARNING: WAL receiver status is '${STATUS}' (expected 'streaming')"
        return 1
    fi

    log "WAL receiver status: streaming - OK"
    return 0
}

check_vpn
check_lag
check_wal_receiver
```

## Handling Network Partitions

When the WAN link goes down, the standby enters a degraded state but continues operating with its last replicated data. Configure what happens:

```ini
# In postgresql.conf on primary - use async replication so WAN outages don't block writes
synchronous_standby_names = ''  # Empty = asynchronous replication (recommended for cross-site)
```

When the link comes back up, PostgreSQL automatically reconnects and resumes streaming replication from where it left off (using the WAL archive if the primary has moved too far ahead).

## Bandwidth Optimization

For high-traffic databases, WAL compression reduces WAN bandwidth usage:

```ini
# Enable WAL compression on the primary (PostgreSQL 9.5+)
wal_compression = on
```

You can also throttle replication to avoid saturating the WAN link:

```bash
# Use tc to limit replication traffic bandwidth on the standby
# Limit WAL receiver to 50Mbps to leave bandwidth for other traffic
sudo tc qdisc add dev eth0 root handle 1: htb default 30
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 50mbit
```

## Planned Failover Procedure

For a planned failover (maintenance, migration):

```bash
# Step 1: On primary, verify standby is caught up
psql -h 172.16.0.1 -U postgres -c "SELECT client_addr, state, sent_lsn, replay_lsn FROM pg_stat_replication;"

# Step 2: Stop writes to primary (application-level)
# Step 3: Wait for standby to apply all WAL
sleep 30

# Step 4: Promote the standby at Site B
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/14/main

# Step 5: Verify promotion
psql -h 172.16.0.2 -U postgres -c "SELECT pg_is_in_recovery();"
# Should return false

# Step 6: Update DNS or load balancer to point to Site B
```

## Summary

Cross-site replication on Ubuntu involves a few key differences from local replication:

- Always use asynchronous replication to avoid write latency amplification across WAN
- Increase WAL retention to handle longer network outages without requiring a full base backup
- Encrypt replication traffic with WireGuard or IPsec when crossing untrusted networks
- Monitor both replication lag and tunnel health, since either can indicate a problem
- Test failover regularly - the value of a DR site is in the drill, not just the setup

With proper configuration, cross-site replication provides strong protection against site-level failures with acceptable performance tradeoffs for most workloads.
