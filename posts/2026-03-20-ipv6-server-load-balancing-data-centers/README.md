# How to Configure IPv6 for Server Load Balancing in Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Load Balancing, HAProxy, Nginx, Data Center, High Availability

Description: Configure IPv6 server load balancing in data centers using HAProxy and NGINX, including VIP setup and health check configuration.

## IPv6 Load Balancing Overview

Server load balancers (SLBs) in IPv6 data centers operate on Virtual IP (VIP) addresses. The load balancer accepts traffic on its IPv6 VIP and distributes it to backend servers. In proxy-based deployments, NAT between the VIP and backends is typically not required.

## HAProxy IPv6 Configuration

HAProxy natively supports IPv6 frontends and backends. Here is a complete HTTP load balancing configuration:

```text
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    stats socket /var/run/haproxy/admin.sock mode 660 level admin

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s

# Frontend: listen on IPv6 VIP

frontend web_frontend
    bind [2001:db8:100::1]:80
    bind [2001:db8:100::1]:443 ssl crt /etc/ssl/certs/server.pem
    default_backend web_backends

# Backend: distribute to IPv6 application servers
backend web_backends
    balance roundrobin
    option httpchk GET /health
    server app1 [2001:db8:200::10]:8080 check
    server app2 [2001:db8:200::11]:8080 check
    server app3 [2001:db8:200::12]:8080 check
```

Note: IPv6 addresses in HAProxy configurations must be wrapped in square brackets.

## NGINX IPv6 Load Balancing

NGINX upstream blocks work with IPv6 addresses:

```nginx
# /etc/nginx/nginx.conf

upstream app_servers {
    least_conn;
    server [2001:db8:200::10]:8080;
    server [2001:db8:200::11]:8080;
    server [2001:db8:200::12]:8080;
}

server {
    # Listen on both IPv4 and IPv6
    listen [::]:80 ipv6only=off;
    listen [::]:443 ssl ipv6only=off;
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location / {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Direct Server Return (DSR) with IPv6

DSR is efficient for high-traffic load balancing - backends respond directly to clients without traffic returning through the load balancer. On Linux, this is typically implemented with IPVS in direct-routing mode:

```bash
# On the load balancer: create an IPv6 virtual service and use direct routing (-g)
ipvsadm -A -t [2001:db8:100::1]:80 -s rr
ipvsadm -a -t [2001:db8:100::1]:80 -r [2001:db8:200::10]:80 -g
ipvsadm -a -t [2001:db8:100::1]:80 -r [2001:db8:200::11]:80 -g
ipvsadm -a -t [2001:db8:100::1]:80 -r [2001:db8:200::12]:80 -g

# On each backend server: add the VIP to loopback
ip -6 addr add 2001:db8:100::1/128 dev lo
```

A production DSR deployment also needs correct return routing and neighbor discovery handling for the VIP on the backend servers.

## Health Checks

Ensure health checks use IPv6 endpoints. For HAProxy, the `check` keyword on backend servers triggers health probes automatically. Monitor check results:

```bash
# View HAProxy stats via socket
echo "show stat" | socat /var/run/haproxy/admin.sock stdio | cut -d',' -f1,2,18
```

## Anycast VIP for Multi-Site Load Balancing

For geographic load distribution, advertise the same VIP from multiple data centers via BGP anycast. Traffic is routed to the topologically closest data center according to BGP routing policy.

## Conclusion

IPv6 load balancing is straightforward with tools like HAProxy and NGINX. The key differences from IPv4 in these configurations are the bracket notation for addresses in configuration files and the fact that IPv6 deployments typically do not need NAT for address conservation. Plan your VIP prefix separately from backend server prefixes for clean firewall policies.
