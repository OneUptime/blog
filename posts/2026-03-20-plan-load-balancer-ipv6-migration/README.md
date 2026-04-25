# How to Plan Load Balancer Changes for IPv6 Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Load Balancer, Migration, HAProxy, Nginx, Kubernetes

Description: Plan IPv6 enablement on load balancers including dual-stack virtual IPs, backend health checks over IPv6, and X-Forwarded-For header handling for IPv6 client addresses.

## Introduction

Load balancers sit at the entry point of your application stack and must be IPv6-capable for end users to connect over IPv6. Key changes include creating IPv6 virtual IPs (VIPs), configuring health checks to probe backends over IPv6, and ensuring client IP headers are correctly propagated for IPv6 addresses.

## HAProxy IPv6 Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s
    option forwardfor

# Frontend: dual-stack listeners

frontend web_ipv4
    bind 0.0.0.0:80
    bind 0.0.0.0:443 ssl crt /etc/ssl/certs/example.com.pem
    default_backend web_servers

frontend web_ipv6
    bind [::]:80 v6only
    bind [::]:443 v6only ssl crt /etc/ssl/certs/example.com.pem
    # IPv6 client address in X-Forwarded-For
    option forwardfor
    default_backend web_servers

# Backend: can include both IPv4 and IPv6 servers
backend web_servers
    balance roundrobin
    option httpchk GET /health

    # IPv4 backends
    server web1 10.0.0.1:8080 check
    server web2 10.0.0.2:8080 check

    # IPv6 backends
    server web3 [2001:db8::10]:8080 check
    server web4 [2001:db8::11]:8080 check
```

## Nginx IPv6 Load Balancer

```nginx
# /etc/nginx/nginx.conf

http {
    # Upstream supports both IPv4 and IPv6 backends
    upstream app_servers {
        least_conn;
        server 10.0.0.1:8080;
        server 10.0.0.2:8080;
        server [2001:db8::10]:8080;
        server [2001:db8::11]:8080;
    }

    # IPv4 and IPv6 listeners
    server {
        listen 80;
        listen [::]:80;
        listen 443 ssl;
        listen [::]:443 ssl;

        server_name example.com;
        ssl_certificate /etc/ssl/certs/example.com.pem;
        ssl_certificate_key /etc/ssl/private/example.com.key;

        location / {
            proxy_pass http://app_servers;
            # Pass IPv6 client address in headers
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Kubernetes LoadBalancer Service

```yaml
# Dual-stack LoadBalancer service for Kubernetes on AWS
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # AWS Load Balancer Controller annotations for a public dual-stack NLB
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
spec:
  type: LoadBalancer
  selector:
    app: web
  # Dual-stack: expose on both IPv4 and IPv6
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
```

## Handling IPv6 Client IPs in Applications

After enabling IPv6 on the load balancer, applications must correctly parse IPv6 client addresses from headers:

```python
# Python/Flask: extract real client IPv6 from X-Forwarded-For
from flask import request
import ipaddress

def get_client_ip() -> str:
    """Extract the real client IP from proxy headers."""
    xff = request.headers.get('X-Forwarded-For', '')
    if xff:
        # Take the leftmost (original client) address
        raw_ip = xff.split(',')[0].strip()
    else:
        raw_ip = request.remote_addr

    # Normalize: strip brackets and zone IDs
    raw_ip = raw_ip.strip('[]').split('%')[0]
    try:
        return str(ipaddress.ip_address(raw_ip))
    except ValueError:
        return raw_ip
```

## Health Check Planning

Update backend health checks to use IPv6 when backends have IPv6 addresses:

```bash
# Test IPv6 health check manually before configuring
curl -6 -f http://[2001:db8::10]:8080/health
curl -6 -f https://[2001:db8::10]:8443/health

# Verify load balancer reaches backends via IPv6
# Via HAProxy Runtime API:
# echo "show servers state web_servers" | socat stdio unix-connect:/var/run/haproxy/admin.sock
```

## Migration Steps

```mermaid
flowchart LR
    A[Audit current LB config] --> B[Add IPv6 VIP to frontend]
    B --> C[Add IPv6 backends]
    C --> D[Configure IPv6 health checks]
    D --> E[Update X-Forwarded-For handling]
    E --> F[Add AAAA DNS record for VIP]
    F --> G[Monitor IPv6 traffic]
    G --> H[Verify client IPs in app logs]
```

## Conclusion

Load balancer IPv6 migration requires adding `[::]:port` listeners for IPv6 frontend VIPs alongside existing IPv4 listeners, specifying backend addresses in bracket notation for IPv6 backends, and verifying that health check mechanisms support IPv6. Ensure applications correctly parse IPv6 addresses from `X-Forwarded-For` headers - IPv6 addresses with colons can break naive string-parsing code that assumes the first colon marks a port separator. Test health checks with `curl -6` before trusting automated check results.
