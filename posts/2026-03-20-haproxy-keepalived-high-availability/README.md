# How to Set Up HAProxy with Keepalived for High Availability on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Keepalived, High Availability, IPv4, VRRP, Failover

Description: Configure two HAProxy servers with Keepalived for active-passive high availability using a shared virtual IPv4 address and VRRP failover.

## Introduction

HAProxy itself is not HA - if the server running HAProxy fails, the load balancer becomes a single point of failure. Keepalived uses VRRP (Virtual Router Redundancy Protocol) to float a virtual IP (VIP) between two HAProxy nodes. The primary node holds the VIP; if it fails, the backup takes over in seconds.

## Architecture

```text
Clients → Virtual IP 10.0.1.100
               ↓
  ┌────────────┴────────────┐
  │                         │
  ▼                         ▼
haproxy-1 (MASTER)      haproxy-2 (BACKUP)
10.0.1.11               10.0.1.12

Both nodes load balance to:
  backend-1: 10.0.2.10
  backend-2: 10.0.2.11
```

## Step 1: Install HAProxy and Keepalived

```bash
# On both nodes

sudo apt-get update
sudo apt-get install -y haproxy keepalived
```

## Step 2: Configure HAProxy (Identical on Both Nodes)

```text
# /etc/haproxy/haproxy.cfg (same on haproxy-1 and haproxy-2)

global
    log /dev/log local0
    maxconn 50000

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend web
    bind 0.0.0.0:80
    default_backend web-backends

backend web-backends
    balance roundrobin
    option httpchk GET /health
    server web1 10.0.2.10:8080 check
    server web2 10.0.2.11:8080 check
```

## Step 3: Configure Keepalived on the Master Node

```text
# /etc/keepalived/keepalived.conf on haproxy-1 (MASTER)

global_defs {
    notification_email {
        admin@example.com
    }
    notification_email_from keepalived@example.com
    smtp_server 127.0.0.1
    router_id haproxy-1
}

vrrp_script chk_haproxy {
    script "kill -0 $(cat /var/run/haproxy.pid)"
    interval 2
    weight -20
}

vrrp_instance VI_1 {
    state MASTER
    interface ens3
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass Secret01
    }
    virtual_ipaddress {
        10.0.1.100/24
    }
    track_script {
        chk_haproxy
    }
}
```

## Step 4: Configure Keepalived on the Backup Node

```text
# /etc/keepalived/keepalived.conf on haproxy-2 (BACKUP)
# Same as master but with router_id haproxy-2, state BACKUP, and lower priority

global_defs {
    notification_email {
        admin@example.com
    }
    notification_email_from keepalived@example.com
    smtp_server 127.0.0.1
    router_id haproxy-2
}

vrrp_script chk_haproxy {
    script "kill -0 $(cat /var/run/haproxy.pid)"
    interval 2
    weight -20
}

vrrp_instance VI_1 {
    state BACKUP
    interface ens3
    virtual_router_id 51     # Must match master
    priority 90              # Lower than master's 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass Secret01      # Must match master
    }
    virtual_ipaddress {
        10.0.1.100/24        # Same VIP as master
    }
    track_script {
        chk_haproxy
    }
}
```

## Step 5: Start Services

```bash
# On both nodes
sudo systemctl enable --now haproxy
sudo systemctl enable --now keepalived
```

## Verifying VIP Ownership

```bash
# On master: should show 10.0.1.100
ip addr show ens3 | grep 10.0.1.100

# Check keepalived state
sudo systemctl status keepalived
```

## Testing Failover

```bash
# Stop HAProxy on the master
sudo systemctl stop haproxy

# Within 2-3 seconds, backup takes the VIP
# Check on backup node:
ip addr show ens3 | grep 10.0.1.100
```

The `weight -20` on the VRRP script reduces the master's effective priority from 100 to 80 when HAProxy is down, causing the backup (priority 90) to become master.

## Enabling Non-Local IP Binding

This is only required if you change HAProxy to bind directly to the VIP instead of `0.0.0.0:80`. With the frontend shown above, HAProxy already listens on all local IPv4 addresses, so you can skip this step.

```bash
# On both nodes, only if binding HAProxy directly to the VIP
echo "net.ipv4.ip_nonlocal_bind = 1" | sudo tee -a /etc/sysctl.d/haproxy.conf
sudo sysctl -p /etc/sysctl.d/haproxy.conf
```

## Conclusion

Keepalived VRRP floats a virtual IP between two HAProxy nodes. Configure identical HAProxy on both. Set `state MASTER` with higher priority on the primary and `state BACKUP` with lower priority on the secondary. The VRRP health check script ensures the VIP moves when HAProxy stops, not only when the network fails.
