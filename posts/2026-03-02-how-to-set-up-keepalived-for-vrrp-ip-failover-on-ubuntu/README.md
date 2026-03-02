# How to Set Up Keepalived for VRRP/IP Failover on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, keepalived, VRRP, High Availability, Networking

Description: Configure Keepalived on Ubuntu for VRRP-based virtual IP failover, including master/backup setup, health checks, and tracking scripts for service-aware failover.

---

Keepalived is a lightweight daemon that implements VRRP (Virtual Router Redundancy Protocol) to provide automatic IP failover between servers. When the master server fails, a backup server claims the virtual IP within seconds. This is simpler to set up than Pacemaker/Corosync for use cases that only need virtual IP failover - think load balancers, edge routers, or any service where you just need the IP to move.

## How VRRP Works

VRRP is a network protocol originally designed for router redundancy. In a Keepalived setup:

1. Multiple servers share a virtual IP (VIP)
2. One server is the MASTER and holds the VIP
3. Other servers are BACKUPs and send/receive VRRP advertisements
4. If the MASTER stops sending advertisements (failure/shutdown), a BACKUP with the highest priority promotes itself to MASTER and claims the VIP
5. When the original MASTER recovers, it can reclaim the VIP (preemptive mode) or not (non-preemptive)

## Lab Setup

- `server1`: 192.168.10.11 (initial MASTER)
- `server2`: 192.168.10.12 (BACKUP)
- Virtual IP: 192.168.10.100 (floats between servers)
- Interface: `eth0` on both servers

## Installation

```bash
# Install on both servers
sudo apt update
sudo apt install -y keepalived

# Enable service
sudo systemctl enable keepalived
```

## Basic Configuration

### Master Server (server1)

Create `/etc/keepalived/keepalived.conf` on server1:

```bash
sudo tee /etc/keepalived/keepalived.conf <<'EOF'
global_defs {
    # Router ID - unique identifier for this node
    router_id server1
    # Suppress log messages when same state is retained
    vrrp_skip_if_not_master
}

vrrp_instance VI_1 {
    # This server starts as MASTER
    state MASTER

    # Network interface to run VRRP on
    interface eth0

    # Virtual router ID - must be same on all nodes in this VRRP group (1-255)
    virtual_router_id 51

    # Priority - higher wins. MASTER should be highest.
    # MASTER: 101, BACKUP: 100 (or lower)
    priority 101

    # VRRP advertisement interval in seconds
    advert_int 1

    # Authentication for VRRP messages (prevents rogue nodes)
    authentication {
        auth_type PASS
        auth_pass mySecurePass123
    }

    # The virtual IP address(es) managed by this instance
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:vip
    }
}
EOF
```

### Backup Server (server2)

Create `/etc/keepalived/keepalived.conf` on server2:

```bash
sudo tee /etc/keepalived/keepalived.conf <<'EOF'
global_defs {
    router_id server2
}

vrrp_instance VI_1 {
    # This server starts as BACKUP
    state BACKUP

    interface eth0

    # Same virtual_router_id as the MASTER
    virtual_router_id 51

    # Lower priority than MASTER
    priority 100

    advert_int 1

    authentication {
        auth_type PASS
        auth_pass mySecurePass123
    }

    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:vip
    }
}
EOF
```

## Starting Keepalived

```bash
# Start on both servers
sudo systemctl start keepalived

# Check status
sudo systemctl status keepalived

# Verify VIP is on server1 (MASTER)
ip addr show eth0 | grep 192.168.10.100
# Should show on server1, not server2
```

## Testing Failover

```bash
# Verify VIP is on server1
ssh server1 "ip addr show eth0 | grep 192.168.10.100"

# From another machine, verify connectivity to VIP
ping -c 5 192.168.10.100

# Simulate server1 failure (stop keepalived)
ssh server1 "sudo systemctl stop keepalived"

# Monitor - VIP should appear on server2 within 3 seconds
watch -n 1 "ip addr show eth0 | grep 192.168.10.100"  # run on server2

# Restore server1
ssh server1 "sudo systemctl start keepalived"
# With priority 101 vs 100, server1 reclaims the VIP (preemptive)
```

## Disabling Preemption

By default, when the MASTER recovers, it reclaims the VIP (preemption). To prevent this and reduce unnecessary failovers:

```ini
vrrp_instance VI_1 {
    state BACKUP   # Both nodes start as BACKUP
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1

    # Disable preemption - whoever has the VIP keeps it
    nopreempt

    authentication {
        auth_type PASS
        auth_pass mySecurePass123
    }

    virtual_ipaddress {
        192.168.10.100/24
    }
}
```

With `nopreempt`, both nodes declare themselves BACKUP in the config. The one with higher priority becomes MASTER initially, but won't try to reclaim the VIP after a failure/recovery cycle.

## Health Check Tracking Scripts

Plain VRRP failover only detects server failure, not service failure. If nginx crashes on server1 but the server is still up, the VIP stays on server1. Tracking scripts fix this:

```bash
# Create a health check script
sudo tee /etc/keepalived/check_nginx.sh <<'EOF'
#!/bin/bash
# Return 0 if nginx is running, 1 if not

if ! systemctl is-active --quiet nginx; then
    exit 1
fi

# Also test if nginx responds
if ! curl -sf --max-time 3 http://localhost/ > /dev/null 2>&1; then
    exit 1
fi

exit 0
EOF

sudo chmod +x /etc/keepalived/check_nginx.sh
```

Add the track script to keepalived.conf:

```ini
global_defs {
    router_id server1
}

# Define the tracking script
vrrp_script check_nginx {
    script "/etc/keepalived/check_nginx.sh"

    # Run every 3 seconds
    interval 3

    # Decrease priority by 20 when script fails
    weight -20

    # Must fail this many times before decreasing priority
    fall 2

    # Must succeed this many times before increasing priority back
    rise 2
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass mySecurePass123
    }

    virtual_ipaddress {
        192.168.10.100/24
    }

    # Attach the tracking script
    track_script {
        check_nginx
    }
}
```

With this configuration:
- server1 normal: priority 101, holds VIP
- server1 nginx fails: priority drops to 81 (101 - 20), server2 at 100 wins, VIP moves
- server1 nginx recovers: priority returns to 101, VIP moves back (if preemptive)

## Multiple VIPs

A single Keepalived instance can manage multiple VIPs:

```ini
virtual_ipaddress {
    192.168.10.100/24 dev eth0 label eth0:vip0
    192.168.10.101/24 dev eth0 label eth0:vip1
    10.0.0.50/24 dev eth1 label eth1:vip
}
```

Or multiple independent VRRP instances with different virtual_router_ids:

```ini
# First instance - web VIP
vrrp_instance VI_WEB {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    virtual_ipaddress {
        192.168.10.100/24
    }
}

# Second instance - database VIP (maybe server2 is MASTER for this one)
vrrp_instance VI_DB {
    state BACKUP
    interface eth0
    virtual_router_id 52
    priority 100
    virtual_ipaddress {
        192.168.10.200/24
    }
}
```

This load-distributes between servers: server1 holds the web VIP, server2 holds the database VIP. Each serves as backup for the other.

## Notification Scripts

Execute scripts when state changes occur:

```bash
# Create notification scripts
sudo tee /etc/keepalived/notify_master.sh <<'EOF'
#!/bin/bash
# Called when this node becomes MASTER
logger "Keepalived: Became MASTER for $1"
systemctl start nginx
EOF

sudo tee /etc/keepalived/notify_backup.sh <<'EOF'
#!/bin/bash
# Called when this node transitions to BACKUP
logger "Keepalived: Became BACKUP for $1"
EOF

sudo tee /etc/keepalived/notify_fault.sh <<'EOF'
#!/bin/bash
# Called when tracking script fails
logger "Keepalived: FAULT detected for $1"
EOF

sudo chmod +x /etc/keepalived/notify_*.sh
```

Add to keepalived.conf:

```ini
vrrp_instance VI_1 {
    # ... other config ...

    notify_master /etc/keepalived/notify_master.sh
    notify_backup /etc/keepalived/notify_backup.sh
    notify_fault  /etc/keepalived/notify_fault.sh
}
```

## Monitoring Keepalived

```bash
# Check Keepalived status and current state
sudo systemctl status keepalived

# View Keepalived logs
sudo journalctl -u keepalived -f

# Check which node holds the VIP
ip addr show | grep "192.168.10.100"

# Check VRRP advertisement packets (requires tcpdump)
sudo tcpdump -n -i eth0 vrrp

# Keepalived statistics
sudo kill -USR1 $(pidof keepalived)
cat /tmp/keepalived.stats
```

## Configuring Firewall for VRRP

VRRP uses IP protocol 112 and sends to multicast address 224.0.0.18. Allow it through the firewall:

```bash
# UFW
sudo ufw allow in on eth0 proto 112
sudo ufw allow to 224.0.0.18

# Or iptables directly
sudo iptables -A INPUT -i eth0 -p 112 -j ACCEPT
sudo iptables -A INPUT -i eth0 -d 224.0.0.18 -j ACCEPT
```

If your servers are on different subnets or behind a router that blocks multicast, configure unicast VRRP:

```ini
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1

    # Use unicast instead of multicast for VRRP advertisements
    unicast_src_ip 192.168.10.11
    unicast_peer {
        192.168.10.12
    }

    virtual_ipaddress {
        192.168.10.100/24
    }
}
```

Keepalived with VRRP is the right tool when you need virtual IP failover without the full complexity of Pacemaker/Corosync. It is widely used in front of load balancers (HAProxy, nginx), at the edge of container clusters, and anywhere you need a simple, reliable floating IP.
