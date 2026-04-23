# How to Configure Rancher HA with HAProxy - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, HAProxy, High Availability, Load Balancer, TCP, Network

Description: Configure HAProxy as the front-end load balancer for Rancher HA with health checks, SSL passthrough, and statistics monitoring.

## Introduction

HAProxy is a high-performance, battle-tested TCP and HTTP load balancer. For on-premises Rancher HA deployments, HAProxy provides the traffic distribution and health checking needed to ensure continuous availability across multiple Rancher server nodes.

## Step 1: Install HAProxy

```bash
# Ubuntu/Debian

apt-get install -y haproxy keepalived

# RHEL/CentOS
yum install -y haproxy keepalived

# Verify version (2.4+ recommended)
haproxy -v
```

## Step 2: Configure HAProxy for Rancher

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log    local0
    log /dev/log    local1 notice
    maxconn 50000
    user haproxy
    group haproxy

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 30s
    timeout client  1800s
    timeout server  1800s

# Statistics dashboard
listen stats
    bind *:8080
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:strongpassword

# Rancher HTTP
frontend rancher_http_frontend
    bind *:80
    mode tcp
    option tcplog
    default_backend rancher_http_backend

backend rancher_http_backend
    mode tcp
    balance leastconn
    option tcp-check

    server rancher-node-1 10.0.0.11:80 check weight 1 maxconn 1000
    server rancher-node-2 10.0.0.12:80 check weight 1 maxconn 1000
    server rancher-node-3 10.0.0.13:80 check weight 1 maxconn 1000

# Rancher HTTPS (SSL Passthrough)
frontend rancher_https_frontend
    bind *:443
    mode tcp
    option tcplog
    default_backend rancher_https_backend

backend rancher_https_backend
    mode tcp
    balance leastconn    # Route to server with fewest active connections
    option httpchk
    http-check connect ssl sni rancher.example.com
    http-check send meth GET uri /healthz ver HTTP/1.1 hdr Host rancher.example.com
    http-check expect status 200

    server rancher-node-1 10.0.0.11:443 check weight 1 maxconn 1000
    server rancher-node-2 10.0.0.12:443 check weight 1 maxconn 1000
    server rancher-node-3 10.0.0.13:443 check weight 1 maxconn 1000

# Optional direct Kubernetes API access
# If this load balancer is also the RKE2 fixed registration address,
# add a separate listener for port 9345 as well.
frontend k8s_api_frontend
    bind *:6443
    mode tcp
    option tcplog
    default_backend k8s_api_backend

backend k8s_api_backend
    mode tcp
    balance roundrobin
    option tcp-check

    server k8s-node-1 10.0.0.11:6443 check
    server k8s-node-2 10.0.0.12:6443 check
    server k8s-node-3 10.0.0.13:6443 check
```

## Step 3: Enable and Start HAProxy

```bash
# Validate configuration syntax
haproxy -c -f /etc/haproxy/haproxy.cfg

# Enable and start the service
systemctl enable haproxy
systemctl start haproxy

# Check status
systemctl status haproxy
```

## Step 4: Configure HAProxy High Availability

Run HAProxy on two hosts with Keepalived for HA:

```conf
# /etc/keepalived/keepalived.conf (on HAProxy host 1)
global_defs {
    enable_script_security
    script_user root
}

vrrp_script check_haproxy {
    script "killall -0 haproxy"
    interval 2
    weight 2
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1
    track_script {
        check_haproxy
    }
    virtual_ipaddress {
        10.0.0.10/24    # Floating VIP
    }
}

# On HAProxy host 2, use state BACKUP and a lower priority such as 100.
```

```bash
systemctl enable keepalived
systemctl start keepalived
systemctl status keepalived
```

## Step 5: Monitor HAProxy Stats

Access the HAProxy statistics page at `http://haproxy-host:8080/stats` to monitor:
- Session rates per backend
- Current active connections
- Backend server health (green = UP, red = DOWN)
- Response times

## Step 6: Test Failover

```bash
# Verify load balancing is working
curl -k --resolve rancher.example.com:443:10.0.0.10 -o /dev/null -w '%{http_code}\n' https://rancher.example.com/healthz
# Expected: 200

# Simulate node failure (example for an RKE2-based Rancher HA cluster)
ssh 10.0.0.11 "sudo systemctl stop rke2-server"

# Rancher should still return HTTP 200 through the remaining nodes
curl -k --resolve rancher.example.com:443:10.0.0.10 -o /dev/null -w '%{http_code}\n' https://rancher.example.com/healthz
# Expected: 200
```

## Conclusion

HAProxy is a reliable, lightweight choice for on-premises Rancher HA load balancing. HTTPS health checks against `/healthz` verify that Rancher is responding on the configured hostname, providing more accurate health detection than a simple TCP connect check.
