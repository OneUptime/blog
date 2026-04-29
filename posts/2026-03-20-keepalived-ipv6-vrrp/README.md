# How to Configure keepalived with IPv6 VRRP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Keepalived, IPv6, VRRP, High Availability, Failover, Load Balancing

Description: A guide to configuring keepalived with VRRPv3 for IPv6 virtual IP addresses, providing high availability and automatic failover for IPv6 services.

keepalived implements VRRP (Virtual Router Redundancy Protocol) for high availability. VRRPv3 extends VRRP to support IPv6 virtual addresses. This guide covers configuring keepalived for IPv6 VIP failover with LVS/IPVS integration.

## VRRPv3 for IPv6

VRRPv3 is required for IPv6 (VRRPv2 only supports IPv4). keepalived supports VRRPv3 natively. For IPv6, the first virtual address advertised by VRRP must be the virtual router's link-local address.

## Basic IPv6 VRRP Configuration

```nginx
# /etc/keepalived/keepalived.conf (MASTER node)

global_defs {
    router_id KEEPALIVED_MASTER
    # IPv6 instances use VRRPv3; setting it explicitly is optional
    vrrp_version 3
}

vrrp_instance VI_IPV6 {
    state MASTER
    interface eth0

    # VRRP ID (1-255, must match between MASTER and BACKUP)
    virtual_router_id 51

    # Priority (MASTER has highest)
    priority 150

    # Advertisement interval (seconds)
    advert_int 1

    # VRRPv3 for IPv6 does not define authentication
    # IPv6 Virtual IP addresses (link-local first for RFC compliance)
    virtual_ipaddress {
        fe80::51/64 dev eth0
        2001:db8::100/64 dev eth0
        # Can add multiple VIPs:
        # 2001:db8::101/64 dev eth0
    }
}
```

```nginx
# /etc/keepalived/keepalived.conf (BACKUP node)

global_defs {
    router_id KEEPALIVED_BACKUP
    vrrp_version 3
}

vrrp_instance VI_IPV6 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100    # Lower priority than MASTER
    advert_int 1

    virtual_ipaddress {
        fe80::51/64 dev eth0
        2001:db8::100/64 dev eth0
    }
}
```

## Dual-Stack VRRP (IPv4 and IPv6)

```nginx
# VRRPv3 supports both IPv4 and IPv6, but each address family uses its own VRRP instance

vrrp_instance VI_IPV4 {
    state MASTER
    interface eth0
    virtual_router_id 52
    priority 150
    advert_int 1

    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }
}

vrrp_instance VI_IPV6 {
    state MASTER
    interface eth0
    virtual_router_id 53
    priority 150
    advert_int 1

    virtual_ipaddress {
        fe80::52/64 dev eth0
        2001:db8::100/64 dev eth0
    }
}
```

## VRRP with LVS Integration

```nginx
# VRRP + LVS for IPv6 load balancing with failover

vrrp_instance VI_IPV6_LB {
    state MASTER
    interface eth0
    virtual_router_id 53
    priority 150

    virtual_ipaddress {
        fe80::53/64 dev eth0
        2001:db8::100/64 dev eth0
    }
}

# IPv6 virtual server definition

virtual_server_group ipv6_group {
    2001:db8::100 80
}

virtual_server group ipv6_group {
    delay_loop 5
    lvs_sched rr
    lvs_method NAT
    protocol TCP

    # IPv6 real server
    real_server 2001:db8:1::10 80 {
        weight 1
        HTTP_GET {
            url {
                path /health
                status_code 200
            }
            connect_timeout 5
            retry 3
            delay_before_retry 3
        }
    }

    real_server 2001:db8:1::11 80 {
        weight 1
        HTTP_GET {
            url {
                path /health
                status_code 200
            }
            connect_timeout 5
            retry 3
            delay_before_retry 3
        }
    }
}
```

## Failover Scripts

```nginx
# Run scripts on VRRP state transitions
vrrp_script check_service {
    script "/usr/local/bin/check_ipv6_service.sh"
    interval 5
    weight -20    # Decrease priority by 20 if script fails
    fall 2        # 2 failures to mark as failed
    rise 2        # 2 successes to mark as up
}

vrrp_instance VI_IPV6 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 150

    virtual_ipaddress {
        fe80::51/64 dev eth0
        2001:db8::100/64 dev eth0
    }

    track_script {
        check_service
    }

    notify_master /usr/local/bin/master.sh
    notify_backup /usr/local/bin/backup.sh
    notify_fault  /usr/local/bin/fault.sh
}
```

## Managing keepalived

```bash
# Start keepalived
sudo systemctl start keepalived
sudo systemctl enable keepalived

# Check status
sudo systemctl status keepalived

# Verify VIP is on the correct node
ip -6 addr show dev eth0 | grep "2001:db8::100"

# Tail logs
sudo journalctl -u keepalived -f

# Test failover: stop keepalived on MASTER
sudo systemctl stop keepalived
# VIP should move to BACKUP in about 3.6 seconds with advert_int 1 and BACKUP priority 100
```

keepalived's VRRPv3 support makes it the standard tool for providing IPv6 virtual IP high availability on Linux, combining seamlessly with IPVS for complete IPv6 load balancing with automatic failover.
