# How to Monitor MySQL Replication with MaxScale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MaxScale, Replication, Monitoring, High Availability

Description: Use MaxScale's built-in MariaDB Monitor and CLI to track MySQL replication topology, lag, and server state in real time.

---

## MaxScale Monitor Overview

MaxScale includes a monitor module that continuously polls MySQL servers to track their role (primary or replica), replication lag, and overall health. The monitor updates server state in real time so the router can route queries to the correct backend. The standard monitor module for replication is `mariadbmon` (formerly known as `mysqlmon` before it was renamed in MaxScale 2.2).

## Configuring the Monitor

Add a monitor section to `/etc/maxscale.cnf`:

```text
[mysql-monitor]
type=monitor
module=mariadbmon
servers=primary,replica1,replica2
user=maxscale_monitor
password=monitor_secret
monitor_interval=2000ms
replication_user=repl_user
replication_password=repl_secret
auto_failover=false
auto_rejoin=false
```

Create the monitor user on MySQL:

```sql
CREATE USER 'maxscale_monitor'@'%' IDENTIFIED BY 'monitor_secret';
GRANT REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'maxscale_monitor'@'%';
FLUSH PRIVILEGES;
```

## Viewing Server States

Use `maxctrl` to check the current state of every monitored server:

```bash
maxctrl list servers
```

Example output:

```text
+-----------+---------------+------+--------+--------------------+
| Server    | Address       | Port | State  | Current Connections|
+-----------+---------------+------+--------+--------------------+
| primary   | 192.168.1.10  | 3306 | Master | 5                  |
| replica1  | 192.168.1.11  | 3306 | Slave  | 3                  |
| replica2  | 192.168.1.12  | 3306 | Slave  | 2                  |
+-----------+---------------+------+--------+--------------------+
```

## Checking Replication Lag

Get detailed replication information for each server:

```bash
maxctrl show server replica1
```

Look for the `Replication Lag`, `Slave SQL Running`, and `Gtid IO Position` fields in the output. Lag values above your SLA threshold indicate a replica falling behind.

## Monitoring via MaxScale REST API

MaxScale exposes a REST API on port 8989 by default. Query it to build custom monitoring dashboards or integrate with alerting systems:

```bash
curl -u admin:mariadb http://localhost:8989/v1/servers | \
  python3 -m json.tool | grep -A5 '"state"'
```

Or get monitor-specific details:

```bash
curl -u admin:mariadb http://localhost:8989/v1/monitors/mysql-monitor
```

## Setting Up MaxScale Replication Lag Alerting

Integrate MaxScale server status into a monitoring script that pages your team when replication lag exceeds a threshold:

```bash
#!/bin/bash
LAG=$(maxctrl show server replica1 --tsv | grep 'Replication Lag' | awk -F'\t' '{print $2}')
if [ "$LAG" -gt 30 ]; then
  echo "ALERT: replica1 replication lag is ${LAG}s" | \
    mail -s "MySQL Replication Lag Alert" ops@example.com
fi
```

Schedule this script with cron or plug it into your alerting pipeline.

## Viewing the Monitor Log

MaxScale writes detailed monitor events to its main log file:

```bash
sudo tail -f /var/log/maxscale/maxscale.log | grep -i "monitor\|replication\|master\|slave"
```

Look for messages like `Server changed state` to track topology changes over time.

## Summary

MaxScale's monitor module tracks MySQL replication topology and lag automatically, updating server states that the router uses for query routing. Use `maxctrl list servers` and `maxctrl show server` for quick CLI checks, the REST API for programmatic access, and log tailing for event-driven visibility. Scripting lag checks against the REST API or CLI output gives you a lightweight alerting layer without additional monitoring agents.
