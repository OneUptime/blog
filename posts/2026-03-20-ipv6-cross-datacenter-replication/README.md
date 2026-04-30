# How to Configure IPv6 for Cross-Data-Center Replication - Datacenter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Replication, Data Center, Storage, Networking

Description: Configure IPv6 networking for cross-data-center storage and database replication with QoS, path selection, and bandwidth management.

## Replication Traffic IPv6 Design

Cross-DC replication needs dedicated IPv6 paths to prevent competing with production traffic:

```text
DC1 (2001:db8:dc1::/48)
  Storage VLAN:  2001:db8:dc1:100::/64
  DB Repl VLAN:  2001:db8:dc1:200::/64
       |
    DCI Link (dedicated)
       |
DC2 (2001:db8:dc2::/48)
  Storage VLAN:  2001:db8:dc2:100::/64
  DB Repl VLAN:  2001:db8:dc2:200::/64
```

## Dedicated Replication VRF

```text
! Cisco - Separate VRF for replication traffic

vrf definition REPLICATION
  rd 65001:999
  address-family ipv6

interface GigabitEthernet0/1
  description DCI_REPLICATION_LINK
  vrf forwarding REPLICATION
  ipv6 address 2001:db8:ffff:999::1/64

router bgp 65001
  neighbor 2001:db8:ffff:999::2 remote-as 65002
  address-family ipv6 vrf REPLICATION
    neighbor 2001:db8:ffff:999::2 activate
    network 2001:db8:dc1:100::/64
    network 2001:db8:dc1:200::/64
```

## QoS for Replication Traffic

```bash
# Linux tc: QoS for IPv6 replication traffic

# Guarantee 1Gbps and allow bursts up to 2Gbps for replication

tc qdisc add dev eth-dci root handle 1: htb default 10
tc class add dev eth-dci parent 1: classid 1:1 htb rate 10gbit

# Production traffic: 8Gbps
tc class add dev eth-dci parent 1:1 classid 1:10 htb rate 8gbit ceil 10gbit

# Replication traffic: 2Gbps max
tc class add dev eth-dci parent 1:1 classid 1:20 htb rate 1gbit ceil 2gbit

# Match IPv6 replication subnet
tc filter add dev eth-dci protocol ipv6 parent 1:0 prio 1 \
    u32 match ip6 src 2001:db8:dc1:100::/64 \
    flowid 1:20
```

## MySQL Replication over IPv6

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Bind to IPv6 address
bind-address = 2001:db8:dc1:200::10

# Replication settings
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_do_db = production_db
```

```sql
-- On DC2 replica
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '2001:db8:dc1:200::10',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'replica',
  SOURCE_PASSWORD = 'replpass',
  SOURCE_LOG_FILE = 'mysql-bin.000001',
  SOURCE_LOG_POS = 4;

START REPLICA;
SHOW REPLICA STATUS\G
```

## PostgreSQL Streaming Replication over IPv6

```bash
# /etc/postgresql/14/main/postgresql.conf
listen_addresses = '2001:db8:dc1:200::10'
wal_level = replica
max_wal_senders = 3

# /etc/postgresql/14/main/pg_hba.conf
host replication replicator 2001:db8:dc2:200::/64 md5

# On DC2 replica
pg_basebackup -h 2001:db8:dc1:200::10 -U replicator \
    -D /var/lib/postgresql/14/main --write-recovery-conf

# postgresql.auto.conf (created by --write-recovery-conf)
primary_conninfo = "host=2001:db8:dc1:200::10 user=replicator"
```

## Monitoring Replication Lag

```bash
#!/bin/bash
# monitor-replication.sh - Track cross-DC replication lag

# MySQL lag
MYSQL_LAG=$(mysql -h 2001:db8:dc2:200::10 -u monitor \
    -e "SHOW REPLICA STATUS\G" | grep "Seconds_Behind_Source" | awk '{print $2}')
echo "MySQL replication lag: ${MYSQL_LAG}s"

# PostgreSQL lag
PG_LAG=$(psql -h 2001:db8:dc2:200::10 -U postgres \
    -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INT;" \
    -t 2>/dev/null | tr -d ' ')
echo "PostgreSQL replication lag: ${PG_LAG}s"

# Alert thresholds
[ "${MYSQL_LAG}" -gt 30 ] && echo "ALERT: MySQL lag > 30s"
[ "${PG_LAG}" -gt 60 ] && echo "ALERT: PostgreSQL lag > 60s"
```

## Conclusion

Cross-DC replication over IPv6 benefits from dedicated VRFs and VLANs to isolate replication traffic from production workloads. Use separate /64 subnets for storage and database replication within each DC's /48 prefix. Apply QoS with Linux tc htb to limit replication bandwidth and prevent saturation of DCI links. MySQL and PostgreSQL both support IPv6 natively - bracket the IPv6 address in connection strings where required. Monitor replication lag as a KPI, setting alerts at 30 seconds (MySQL) and 60 seconds (PostgreSQL) for latency-sensitive cross-DC replication.
