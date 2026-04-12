# How to Set Up MySQL High Availability with Keepalived

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Keepalived, High Availability, Virtual IP, Failover

Description: Use Keepalived and VRRP to provide a floating virtual IP for MySQL so applications transparently connect to the active primary after a failover.

---

## Why Keepalived for MySQL HA

MySQL replication provides data redundancy, but applications still need to know which server is the current primary. Keepalived manages a virtual IP (VIP) using VRRP. Only the active node holds the VIP. When the active node fails, Keepalived on the standby node detects the failure and claims the VIP within seconds, so applications connecting to the VIP automatically reach the new primary.

## Installing Keepalived

Install on both MySQL nodes:

```bash
sudo apt-get update
sudo apt-get install -y keepalived
```

## Configuration on the Primary Node

Create `/etc/keepalived/keepalived.conf` on the primary:

```text
global_defs {
  router_id MYSQL_PRIMARY
}

vrrp_script check_mysql {
  script "/usr/local/bin/check_mysql.sh"
  interval 2
  weight -30
  fall 2
  rise 2
}

vrrp_instance VI_MYSQL {
  state MASTER
  interface eth0
  virtual_router_id 51
  priority 100
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass mysqlHA1
  }
  virtual_ipaddress {
    192.168.1.100/24
  }
  track_script {
    check_mysql
  }
}
```

## Configuration on the Standby Node

Create `/etc/keepalived/keepalived.conf` on the standby. Use `state BACKUP` and a lower `priority`:

```text
global_defs {
  router_id MYSQL_STANDBY
}

vrrp_script check_mysql {
  script "/usr/local/bin/check_mysql.sh"
  interval 2
  weight -30
  fall 2
  rise 2
}

vrrp_instance VI_MYSQL {
  state BACKUP
  interface eth0
  virtual_router_id 51
  priority 90
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass mysqlHA1
  }
  virtual_ipaddress {
    192.168.1.100/24
  }
  track_script {
    check_mysql
  }
}
```

## MySQL Health Check Script

Create `/usr/local/bin/check_mysql.sh` on both nodes:

```bash
#!/bin/bash
mysqladmin -u keepalived -pcheck_secret ping 2>/dev/null
exit $?
```

```bash
sudo chmod +x /usr/local/bin/check_mysql.sh
```

Create the MySQL user:

```sql
CREATE USER 'keepalived'@'localhost' IDENTIFIED BY 'check_secret';
GRANT PROCESS ON *.* TO 'keepalived'@'localhost';
FLUSH PRIVILEGES;
```

The `weight -30` in `vrrp_script` means if the check fails twice in a row, the node's effective priority drops by 30. If the standby has priority 90 and the primary drops to 70, the standby takes over.

## Starting Keepalived

```bash
sudo systemctl enable keepalived
sudo systemctl start keepalived
```

Check which node holds the VIP:

```bash
ip addr show eth0 | grep 192.168.1.100
```

## Testing Failover

Stop MySQL on the primary and watch the VIP move:

```bash
sudo systemctl stop mysql
# On standby node:
ip addr show eth0 | grep 192.168.1.100
```

Applications connected to `192.168.1.100` will experience a brief interruption while the VIP moves, after which new connections go to the standby.

## Summary

Keepalived provides a simple virtual IP layer for MySQL high availability using VRRP. The health check script ensures the VIP only lives on a node where MySQL is actually running. Combine Keepalived with MySQL semi-synchronous replication and an automated promotion script to build a full HA stack that recovers from primary failures without manual intervention.
