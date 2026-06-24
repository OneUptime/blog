# How to Configure Rancher HA with HAProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, HAProxy, Load Balancing

Description: Configure HAProxy as the load balancer for Rancher HA deployments with health checks, SSL passthrough, and WebSocket support for reliable cluster management.

## Introduction

HAProxy is a high-performance, battle-tested load balancer commonly used in front of Rancher HA deployments. Its fine-grained configuration options make it ideal for handling Rancher's mix of TCP traffic on ports 80/443 and long-lived WebSocket connections. This guide covers Rancher's recommended Layer 4 HAProxy configuration for Rancher HA, plus an alternative setup for external TLS termination.

## Prerequisites

- HAProxy installed on a dedicated node or VM
- Running Rancher HA cluster (three nodes are used in the examples below)
- TLS certificate for Rancher hostname if you plan to terminate TLS at HAProxy
- Rancher installed with `--set tls=external` if you plan to terminate TLS at HAProxy
- HAProxy node with connectivity to all Rancher nodes

## Step 1: Install HAProxy

```bash
# Ubuntu/Debian

apt update
apt install -y haproxy

# RHEL/CentOS
yum install -y haproxy

# Verify version
haproxy -v
```

## Step 2: Configure HAProxy for Rancher

```haproxy
# /etc/haproxy/haproxy.cfg - Complete HAProxy configuration for Rancher

global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy

defaults
    log global
    mode tcp
    option tcplog
    option dontlognull
    timeout connect 30s
    timeout client 1800s
    timeout server 1800s
    timeout tunnel 1800s

#-------------------
# Rancher UI/API
#-------------------
frontend rancher_http
    bind *:80
    default_backend rancher_http_backend

frontend rancher_https
    bind *:443
    default_backend rancher_https_backend

#-------------------
# RKE2 API Server
#-------------------
frontend rke2_api
    bind *:6443
    mode tcp
    option tcplog
    default_backend rke2_api_backend

frontend rke2_register
    bind *:9345
    mode tcp
    option tcplog
    default_backend rke2_register_backend

#-------------------
# Backends
#-------------------
backend rancher_https_backend
    mode tcp
    balance roundrobin
    option tcp-check
    default-server inter 10s fall 3 rise 2

    server rancher-01 10.0.0.11:443 check
    server rancher-02 10.0.0.12:443 check
    server rancher-03 10.0.0.13:443 check

backend rancher_http_backend
    mode tcp
    balance roundrobin
    option tcp-check
    default-server inter 10s fall 3 rise 2

    server rancher-01 10.0.0.11:80 check
    server rancher-02 10.0.0.12:80 check
    server rancher-03 10.0.0.13:80 check

backend rke2_api_backend
    mode tcp
    balance roundrobin
    option tcp-check

    server cp-01 10.0.0.11:6443 check
    server cp-02 10.0.0.12:6443 check
    server cp-03 10.0.0.13:6443 check

backend rke2_register_backend
    mode tcp
    balance roundrobin

    server cp-01 10.0.0.11:9345 check
    server cp-02 10.0.0.12:9345 check
    server cp-03 10.0.0.13:9345 check

#-------------------
# HAProxy Stats
#-------------------
frontend stats
    bind *:8404
    mode http
    option httplog
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:securepassword
    stats hide-version
```

## Step 3: Configure SSL Certificate (External TLS Termination Only)

```bash
# Combine certificate and private key for HAProxy
mkdir -p /etc/haproxy/certs

cat /etc/ssl/certs/rancher.crt \
    /etc/ssl/private/rancher.key \
    > /etc/haproxy/certs/rancher.pem

chmod 600 /etc/haproxy/certs/rancher.pem
```

## Step 4: Configure External TLS Termination (Alternative)

```haproxy
# For external TLS termination (Rancher installed with --set tls=external)
frontend rancher_https
    bind *:443 ssl crt /etc/haproxy/certs/rancher.pem alpn h2,http/1.1
    mode http
    option forwardfor
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443
    default_backend rancher_http_backend

frontend rancher_http
    bind *:80
    mode http
    redirect scheme https code 301

backend rancher_http_backend
    mode http
    option httpchk
    http-check send meth GET uri /healthz ver HTTP/1.1 hdr Host rancher.example.com
    http-check expect status 200
    balance roundrobin
    default-server inter 10s fall 3 rise 2

    server rancher-01 10.0.0.11:80 check
    server rancher-02 10.0.0.12:80 check
    server rancher-03 10.0.0.13:80 check
```

## Step 5: Enable and Verify HAProxy

```bash
# Validate configuration
haproxy -c -f /etc/haproxy/haproxy.cfg

# Start HAProxy
systemctl enable haproxy
systemctl start haproxy

# Check HAProxy status
systemctl status haproxy

# View stats
curl -u admin:securepassword http://localhost:8404/stats

# Test Rancher health through HAProxy
curl -sk https://rancher.example.com/healthz
```

## Step 6: Configure HAProxy High Availability with Keepalived

```conf
# Run HAProxy on 2+ nodes with keepalived VIP
# haproxy-primary keepalived.conf
vrrp_script chk_haproxy {
    script "pidof haproxy"
    interval 2
    weight 2
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101

    track_script {
        chk_haproxy
    }

    virtual_ipaddress {
        10.0.0.100/24
    }
}
```

## Step 7: Monitor HAProxy

```bash
# HAProxy stats via socket
echo "show stat" | socat unix-connect:/run/haproxy/admin.sock stdio | \
  cut -d',' -f1,2,18,19,21 | grep rancher

# Show current connections
echo "show info" | socat unix-connect:/run/haproxy/admin.sock stdio | \
  grep -E "CurrConns|MaxConn|Uptime"

# Disable a server for maintenance
echo "disable server rancher_https_backend/rancher-01" | \
  socat unix-connect:/run/haproxy/admin.sock stdio
```

## Conclusion

HAProxy provides enterprise-grade load balancing for Rancher HA with long-lived connection support and real-time monitoring. For Rancher Manager on Kubernetes, the recommended starting point is Layer 4 forwarding on ports 80 and 443. If you terminate TLS at HAProxy instead, configure Rancher with `--set tls=external`, pass the required proxy headers, and use the `/healthz` endpoint for HTTP health checks. For production deployments, run HAProxy in an active-passive pair with keepalived to eliminate the load balancer itself as a single point of failure.
