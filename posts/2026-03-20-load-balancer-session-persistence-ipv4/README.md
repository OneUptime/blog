# How to Configure Load Balancer Session Persistence with IPv4 Source Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Balancing, Session Persistence, Sticky Sessions, IPv4, HAProxy, Nginx

Description: Configure load balancer session persistence (sticky sessions) based on client IPv4 source addresses to ensure requests from the same client always reach the same backend server.

## Introduction

Session persistence (also called sticky sessions) ensures that requests from the same client consistently reach the same backend server. This is important for stateful applications that store session data in memory or local files. IP-based persistence uses the client's IPv4 source address as the affinity key.

## IP-Based Persistence with HAProxy

HAProxy supports IP-based persistence using the `stick-table` feature:

```haproxy
# /etc/haproxy/haproxy.cfg

frontend http_front
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
    
    # Create a stick table keyed by source IPv4 address
    # 30-minute session timeout, store up to 1 million IPs
    stick-table type ip size 1m expire 30m
    
    # Learn the client IP from the request
    stick on src
    
    server web1 10.0.1.10:80 check
    server web2 10.0.1.11:80 check
    server web3 10.0.1.12:80 check
```

With this config, requests from `203.0.113.50` will continue to go to the same available backend server while the stick-table entry remains active for 30 minutes after the last request.

## IP-Based Persistence with Nginx

Nginx's `ip_hash` directive hashes the first three octets of the client IPv4 and keeps the same client on the same server unless that server becomes unavailable:

```nginx
# /etc/nginx/nginx.conf
upstream web_backends {
    ip_hash;              # Hash client IP to select backend consistently
    
    server 10.0.1.10:80;
    server 10.0.1.11:80;
    server 10.0.1.12:80;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://web_backends;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

For finer control, use the `hash` directive with the full IP:

```nginx
upstream web_backends {
    hash $remote_addr consistent;   # Hash full IP, consistent hashing
    
    server 10.0.1.10:80;
    server 10.0.1.11:80;
}
```

## AWS ALB Sticky Sessions

AWS ALB uses cookies, not IP, for persistence - but you can configure it:

```bash
# Enable sticky sessions on a target group (cookie-based)
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --attributes \
    Key=stickiness.enabled,Value=true \
    Key=stickiness.type,Value=lb_cookie \
    Key=stickiness.lb_cookie.duration_seconds,Value=86400
```

For NLBs, source IP-based persistence is available by enabling target group stickiness:

```bash
# Enable source IP stickiness on an NLB target group
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --attributes \
    Key=stickiness.enabled,Value=true \
    Key=stickiness.type,Value=source_ip
```

## Considerations and Limitations

- **NAT issues**: Clients behind NAT share one public IP - all will be pinned to the same server, causing uneven load
- **Mobile clients**: Mobile users often change IP addresses as they roam between networks
- **Security**: Avoid session persistence for security-sensitive applications where IP spoofing is a concern
- **Preferred alternative**: Use distributed session stores (Redis, Memcached) and stateless backend design instead of sticky sessions

## Testing Persistence

```bash
# Verify the same backend serves all requests from your IP
for i in {1..5}; do
  curl -s http://loadbalancer.example.com/server-info
done
```

All responses should show the same backend server ID.

## Conclusion

IP-based session persistence is a simple solution for stateful legacy applications, but it comes with scalability limitations. Whenever possible, prefer stateless application design with a shared session store to allow true load balancing without affinity constraints.
