# How to Set Up External Load Balancers for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Load Balancer, External, HAProxy, Nginx, Kubernetes, Infrastructure

Description: Configure external load balancers like HAProxy and Nginx for Talos Linux clusters to distribute traffic and provide high availability.

---

While in-cluster load balancers like MetalLB and kube-vip work well for many scenarios, there are good reasons to run a dedicated external load balancer in front of your Talos Linux cluster. External load balancers can handle TLS termination, provide advanced health checking, offer connection draining, and integrate with existing network infrastructure. They also keep the load balancing logic outside the cluster, which means it continues working even if Kubernetes has issues.

This guide covers setting up HAProxy and Nginx as external load balancers for Talos Linux clusters.

## When to Use External Load Balancers

External load balancers make sense when:

- You need the control plane to be accessible through a stable endpoint before the cluster is fully bootstrapped
- You want TLS termination outside the cluster
- You need integration with existing network monitoring and security tools
- You require advanced traffic management (rate limiting, circuit breaking) at the infrastructure level
- Your organization's compliance requirements mandate it

## HAProxy for the Kubernetes API Server

The most critical use of an external load balancer with Talos is load balancing the Kubernetes API server. This ensures `kubectl` and all cluster components can reach the API even if individual control plane nodes go down.

Install HAProxy on a dedicated machine (or VM):

```bash
# On Ubuntu/Debian
apt-get update && apt-get install -y haproxy

# On RHEL/CentOS
yum install -y haproxy
```

Configure HAProxy for the Talos control plane:

```
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # TLS settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms
    retries 3

# Stats page
frontend stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s

# Kubernetes API Server
frontend k8s-api
    bind *:6443
    mode tcp
    option tcplog
    default_backend k8s-api-backend

backend k8s-api-backend
    mode tcp
    option tcp-check
    balance roundrobin
    default-server inter 10s downinter 5s rise 2 fall 2 slowstart 60s

    # Talos control plane nodes
    server cp-1 10.0.0.10:6443 check
    server cp-2 10.0.0.11:6443 check
    server cp-3 10.0.0.12:6443 check
```

Start HAProxy:

```bash
systemctl enable haproxy
systemctl start haproxy

# Verify it is running
systemctl status haproxy
curl -s http://localhost:8404/stats
```

Now configure Talos to use the HAProxy address as the endpoint:

```yaml
# talos machine config
cluster:
  controlPlane:
    endpoint: https://haproxy.example.com:6443
```

## HAProxy for Application Traffic

Extend the HAProxy configuration to load balance application traffic across your Talos worker nodes:

```
# Application traffic - HTTP
frontend http-in
    bind *:80
    mode http
    option httplog
    option forwardfor

    # Route based on hostname
    acl host_app1 hdr(host) -i app1.example.com
    acl host_app2 hdr(host) -i app2.example.com

    use_backend app1-backend if host_app1
    use_backend app2-backend if host_app2
    default_backend default-backend

# Application traffic - HTTPS
frontend https-in
    bind *:443 ssl crt /etc/haproxy/certs/
    mode http
    option httplog
    option forwardfor
    http-request set-header X-Forwarded-Proto https

    acl host_app1 hdr(host) -i app1.example.com
    acl host_app2 hdr(host) -i app2.example.com

    use_backend app1-backend if host_app1
    use_backend app2-backend if host_app2
    default_backend default-backend

backend app1-backend
    mode http
    balance leastconn
    option httpchk GET /health
    http-check expect status 200

    # NodePort of the app1 service
    server worker-1 10.0.0.20:30080 check
    server worker-2 10.0.0.21:30080 check
    server worker-3 10.0.0.22:30080 check

backend app2-backend
    mode http
    balance leastconn
    option httpchk GET /health
    http-check expect status 200

    server worker-1 10.0.0.20:30081 check
    server worker-2 10.0.0.21:30081 check
    server worker-3 10.0.0.22:30081 check

backend default-backend
    mode http
    server worker-1 10.0.0.20:30000 check
    server worker-2 10.0.0.21:30000 check
    server worker-3 10.0.0.22:30000 check
```

## Nginx as a Load Balancer

Nginx can also serve as an external load balancer. It is particularly good when you also need it for caching or as a reverse proxy:

```nginx
# /etc/nginx/nginx.conf

stream {
    # Kubernetes API Server load balancing
    upstream k8s_api {
        least_conn;
        server 10.0.0.10:6443 max_fails=3 fail_timeout=10s;
        server 10.0.0.11:6443 max_fails=3 fail_timeout=10s;
        server 10.0.0.12:6443 max_fails=3 fail_timeout=10s;
    }

    server {
        listen 6443;
        proxy_pass k8s_api;
        proxy_timeout 10m;
        proxy_connect_timeout 5s;
    }
}

http {
    # Application load balancing
    upstream ingress_http {
        least_conn;
        server 10.0.0.20:80 max_fails=3 fail_timeout=10s;
        server 10.0.0.21:80 max_fails=3 fail_timeout=10s;
        server 10.0.0.22:80 max_fails=3 fail_timeout=10s;
    }

    upstream ingress_https {
        least_conn;
        server 10.0.0.20:443 max_fails=3 fail_timeout=10s;
        server 10.0.0.21:443 max_fails=3 fail_timeout=10s;
        server 10.0.0.22:443 max_fails=3 fail_timeout=10s;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://ingress_http;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl;
        ssl_certificate /etc/nginx/certs/wildcard.crt;
        ssl_certificate_key /etc/nginx/certs/wildcard.key;

        location / {
            proxy_pass https://ingress_https;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
    }
}
```

## Making the Load Balancer Highly Available

A single load balancer is itself a single point of failure. Use keepalived to run two HAProxy instances in an active-passive pair:

```bash
# Install keepalived on both LB nodes
apt-get install -y keepalived
```

```
# /etc/keepalived/keepalived.conf on the primary LB

vrrp_script check_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight 2
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass your_password
    }

    virtual_ipaddress {
        192.168.1.100/24
    }

    track_script {
        check_haproxy
    }
}
```

```
# /etc/keepalived/keepalived.conf on the backup LB

vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass your_password
    }

    virtual_ipaddress {
        192.168.1.100/24
    }

    track_script {
        check_haproxy
    }
}
```

## Dynamic Backend Discovery

For clusters where worker nodes change (autoscaling, replacement), you can use consul-template or confd to dynamically update HAProxy backends:

```bash
#!/bin/bash
# update-haproxy-backends.sh
# Updates HAProxy backend list from Kubernetes node list

KUBECONFIG="/etc/kubernetes/kubeconfig"
HAPROXY_TEMPLATE="/etc/haproxy/haproxy.cfg.tmpl"
HAPROXY_CONFIG="/etc/haproxy/haproxy.cfg"

# Get current worker node IPs
WORKERS=$(kubectl --kubeconfig=$KUBECONFIG get nodes \
    -l node-role.kubernetes.io/worker \
    -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

# Generate backend server lines
BACKENDS=""
COUNT=1
for ip in $WORKERS; do
    BACKENDS="${BACKENDS}    server worker-${COUNT} ${ip}:30080 check\n"
    COUNT=$((COUNT + 1))
done

# Update the config from template
sed "s|{{WORKER_BACKENDS}}|${BACKENDS}|g" "$HAPROXY_TEMPLATE" > "$HAPROXY_CONFIG"

# Reload HAProxy (graceful - no dropped connections)
systemctl reload haproxy
```

## Health Check Configuration

Configure thorough health checks to ensure traffic only goes to healthy nodes:

```
backend k8s-workers
    mode http
    balance roundrobin

    # HTTP health check
    option httpchk GET /healthz
    http-check expect status 200

    # Backend settings
    default-server inter 5s downinter 2s rise 3 fall 3 maxconn 256

    server worker-1 10.0.0.20:30080 check
    server worker-2 10.0.0.21:30080 check
    server worker-3 10.0.0.22:30080 check
```

## Wrapping Up

External load balancers add a reliable layer of traffic management in front of your Talos Linux cluster. HAProxy and Nginx are both excellent choices - HAProxy for pure load balancing performance and advanced health checking, Nginx when you also need HTTP-level features. The key is making the load balancer itself highly available with keepalived or a similar solution, and keeping the backend list in sync with your cluster's actual node inventory.
