# How to Configure DNS Failover and High Availability with Unbound on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Unbound, High Availability, Linux

Description: Learn how to configure DNS Failover and High Availability with Unbound on RHEL with step-by-step instructions, configuration examples, and best practices.

---

DNS is a critical service - if it goes down, name resolution fails and applications stRHELking. This guide covers how to set up Unbound in a highly available confiRHELon with failover on RHEL 9.

## Prerequisites

- RHEL more RHEL 9 servers
- Root or sudo access
- A shared virtual IP address (VIP)

## Strategy 1: Multiple Resolvers in resolv.conf

The simplest approach is listing multiple DNS servers:

```bash
sudo vi /etc/resolv.conf
```

```
nameserver 10.0.1.10
nameserver 10.0.1.11
options timeout:2 attempts:2
```

The client tries the second server if the first does not respond within the timeout.

## Strategy 2: Keepalived with Virtual IP

Install keepalived on both DNS servers:

```bash
sudo dnf install -y keepalived unbound
```

Configure the master:

```bash
sudo vi /etc/keepalived/keepalived.conf
```

```
vrrp_script check_unbound {
    script "/usr/bin/systemctl is-active unbound"
    interval 2
    weight -20
}

vrrp_instance DNS_VIP {
    state MASTER
    interface eth0
    virtual_router_id 53
    priority 100
    advert_int 1

    virtual_ipaddress {
        10.0.1.100/24
    }

    track_script {
        check_unbound
    }
}
```

Configure the backup with `state BACKUP` and `priority 90`.

```bash
sudo systemctl enable --now keepalived
```

## Strategy 3: Unbound with Stub Zones for Redundancy

Configure Unbound to forward specific zones to multiple servers:

```yaml
stub-zone:
    name: "internal.example.com"
    stub-addr: 10.0.1.10
    stub-addr: 10.0.1.11
    stub-first: yes
```

## Step 4: Test Failover

```bash
# Verify VIP is active
ip addr show eth0

# Stop unbound on master
sudo systemctl stop unbound

# Verify VIP moves to backup
# (check from backup server)
ip addr show eth0
```

## Monitoring

```bash
sudo unbound-control status
sudo unbound-control stats | grep total.num
```

## Conclusion

DNS high availability on RHEL 9 can be achieved through multiple resolvers, keepalived VIP failover, or a combination of both. Keepalived with health checks provides the fastest failover with transparent client behavior.
RHEL