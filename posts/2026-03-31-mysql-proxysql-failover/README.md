# How to Configure ProxySQL Failover for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Failover, High Availability, Replication

Description: Configure ProxySQL automatic failover for MySQL so that write traffic is redirected to a new primary when the current primary becomes unavailable.

---

## How ProxySQL Handles Failover

ProxySQL does not perform primary promotion itself - that is left to an external tool such as Orchestrator or MHA. ProxySQL's role is to detect that a backend is unhealthy, shun it, and route new connections to a healthy server in the same hostgroup. Automatic failover therefore requires two things: ProxySQL health checks and an external tool to promote a replica to primary. When `mysql_replication_hostgroups` is configured, ProxySQL automatically reassigns servers between hostgroups based on the `read_only` variable, so the external tool does not need to update `mysql_servers` directly.

## Configuring Health Checks

ProxySQL's monitor module pings each server on a configurable interval. Tune these variables to get fast detection:

```sql
SET mysql-monitor_connect_interval    = 2000;   -- ms between connect checks
SET mysql-monitor_ping_interval       = 2000;   -- ms between ping checks
SET mysql-monitor_ping_timeout        = 1000;   -- ms before ping is considered failed
SET mysql-monitor_connect_timeout     = 1000;
SET mysql-monitor_read_only_interval  = 1500;   -- ms between read_only checks
LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

## Detecting Primaries via read_only

MySQL replicas are typically configured with `read_only=ON`. ProxySQL can use this to automatically assign servers to the correct hostgroup:

```sql
UPDATE mysql_replication_hostgroups
SET writer_hostgroup=10, reader_hostgroup=20
WHERE writer_hostgroup=10;

-- Or insert a new entry
INSERT INTO mysql_replication_hostgroups
  (writer_hostgroup, reader_hostgroup, check_type)
VALUES (10, 20, 'read_only');

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

With this in place, ProxySQL monitors `@@read_only` on every server. Servers with `read_only=OFF` are placed in hostgroup 10 (writes), and servers with `read_only=ON` go to hostgroup 20 (reads). When a replica is promoted to primary, `read_only` is set to `OFF` on the new primary, and ProxySQL automatically moves it to the write hostgroup - no manual intervention needed.

## Handling the Failed Primary

When the old primary fails, ProxySQL shuns it. After your external failover tool promotes a replica, the old primary may be reconfigured as a new replica with `read_only=ON`. ProxySQL will then move it back to the read hostgroup automatically once it comes online.

## Testing Failover

Use the monitor logs to confirm ProxySQL detected the failure:

```sql
SELECT hostname, port, time_start_us, connect_success_time_us, connect_error
FROM mysql_server_connect_log
ORDER BY time_start_us DESC
LIMIT 20;
```

Simulate a failure by stopping MySQL on the primary:

```bash
sudo systemctl stop mysql
```

Then observe that `stats_mysql_connection_pool` shows the old primary as `SHUNNED` and the new primary in hostgroup 10.

## Keeping ProxySQL Highly Available

ProxySQL itself can be a single point of failure. Run multiple ProxySQL instances behind a virtual IP managed by Keepalived:

```bash
# On each ProxySQL host
sudo apt-get install -y keepalived
```

```text
# /etc/keepalived/keepalived.conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    virtual_ipaddress {
        192.168.1.50/24
    }
}
```

Applications connect to `192.168.1.50`, which floats between ProxySQL instances.

## Summary

ProxySQL failover for MySQL relies on the `mysql_replication_hostgroups` table and the monitor module's `read_only` checks to automatically reassign servers between write and read hostgroups after a primary promotion. Combine this with a tool like Orchestrator for actual promotion logic, and Keepalived for ProxySQL-level redundancy, to build a fully automated MySQL high-availability stack.
