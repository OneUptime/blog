# How to Configure HAProxy Load Balancing on pfSense for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, HAProxy, Load Balancing, IPv4, Reverse Proxy, High Availability

Description: Configure HAProxy on pfSense to load balance IPv4 HTTP/HTTPS traffic across multiple backend servers, with health checks, SSL termination, and ACL-based routing.

## Introduction

The pfSense HAProxy package provides a full Layer 7 load balancer and reverse proxy. It can distribute traffic across backend pools, perform health checks, terminate SSL, and route requests based on host headers or URL paths.

## Install HAProxy Package

Navigate to **System > Package Manager > Available Packages**:
- Install: `haproxy`

## Backend Server Pool

Navigate to **Services > HAProxy > Backend > Add**:

```text
Name:           web-backend
Mode:           HTTP
Balance:        roundrobin

Servers:
  Name: web1   Address: 192.168.1.101  Port: 80  Weight: 1
  Name: web2   Address: 192.168.1.102  Port: 80  Weight: 1
  Name: web3   Address: 192.168.1.103  Port: 80  Weight: 1

Health checking:
  Type:    HTTP
  Interval: 3s
  Check URI: /health
  Expected status: 200
```

## Frontend Listener

Navigate to **Services > HAProxy > Frontend > Add**:

```text
Name:           http-frontend
Status:         Active
Bind address:   0.0.0.0:80
Type:           HTTP/HTTPS

Default backend: web-backend

# ACL-based routing (optional)

ACL name: is-api   expression: path_beg /api/
Use backend: api-backend  when: is-api
```

## HTTPS Termination

```text
Frontend bind:  0.0.0.0:443
Type: HTTP/HTTPS (SSL offloading)
SSL Offloading: checked
Certificate:    Select your pfSense certificate
Add HTTPS: Enforce HTTPS (redirect HTTP → HTTPS)
```

## HAProxy Configuration File (Generated)

```haproxy
# /var/etc/haproxy/haproxy.cfg (auto-generated)

global
    maxconn 10000
    tune.ssl.default-dh-param 2048

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s
    option httplog
    option forwardfor

frontend http-frontend
    bind 0.0.0.0:80
    default_backend web-backend

backend web-backend
    balance roundrobin
    option httpchk GET /health
    server web1 192.168.1.101:80 check inter 3s
    server web2 192.168.1.102:80 check inter 3s
    server web3 192.168.1.103:80 check inter 3s
```

## Firewall Rule for HAProxy

Navigate to **Firewall > Rules > WAN > Add**:
```text
Protocol: TCP
Destination: WAN address
Port: 80, 443
Description: Allow HTTP/HTTPS to HAProxy

```

## Monitor HAProxy Status

Navigate to **Services > HAProxy > Stats**:
- Shows per-backend server status, request rates, error counts

Or via URL: `http://<LAN-IP>:9000/haproxy?stats`

## Conclusion

HAProxy on pfSense provides enterprise load balancing without separate hardware. Define a backend pool with server IPs and health checks, create a frontend that binds to a WAN IP and port, and add WAN firewall rules. SSL termination moves crypto work to pfSense, keeping backend servers simple HTTP.
