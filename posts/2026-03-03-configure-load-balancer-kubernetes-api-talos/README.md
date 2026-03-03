# How to Configure a Load Balancer for the Kubernetes API in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Load Balancer, Kubernetes API, High Availability, Networking

Description: Set up a load balancer to distribute Kubernetes API traffic across your Talos Linux control plane nodes for high availability.

---

In a multi-node Talos Linux cluster, the Kubernetes API server runs on every control plane node. But kubectl, worker nodes, and other clients need a single, stable address to connect to. If they connect directly to one control plane node and that node goes down, everything loses access to the API.

A load balancer solves this by sitting in front of all control plane nodes and distributing API requests across them. When a node fails, the load balancer stops sending traffic to it, and clients are unaffected.

## Why You Need a Load Balancer

Without a load balancer, you have a single point of failure. Even with three healthy control plane nodes, if clients are all connecting to node 1 and node 1 goes down, the cluster looks unavailable even though nodes 2 and 3 are perfectly fine.

The load balancer provides:

- A single stable endpoint for the Kubernetes API
- Automatic failover when a control plane node goes down
- Health checking to detect unhealthy nodes
- Optional traffic distribution across healthy nodes

## Load Balancer Options

You have several options depending on your environment:

| Option | Best For | Complexity |
|--------|----------|------------|
| Talos VIP | Small/medium clusters, no extra infrastructure | Low |
| HAProxy | On-premises production | Medium |
| nginx (TCP) | Existing nginx infrastructure | Medium |
| Cloud LB (NLB/ALB) | Cloud deployments | Low |
| keepalived + HAProxy | Maximum on-prem resilience | High |

This guide focuses on external load balancers. For VIP (built into Talos), see the dedicated VIP guide.

## Requirements for the Load Balancer

Whatever solution you choose, the load balancer must:

1. **Use TCP mode (Layer 4)** - The Kubernetes API server handles its own TLS. The load balancer should not terminate TLS.
2. **Forward to port 6443** - The API server listens on this port on each control plane node.
3. **Perform health checks** - Detect and remove unhealthy nodes from the rotation.
4. **Support long-lived connections** - kubectl watch and other streaming operations create persistent connections.

## Setting Up HAProxy

HAProxy is the most popular choice for on-premises Talos clusters.

### Installation

```bash
# On Ubuntu/Debian
sudo apt update && sudo apt install haproxy -y

# On CentOS/RHEL
sudo yum install haproxy -y
```

### Configuration

```bash
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 4096
    daemon

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5s
    timeout client  300s
    timeout server  300s
    retries 3

# Kubernetes API frontend
frontend k8s-api
    bind *:6443
    mode tcp
    default_backend k8s-api-servers

# Kubernetes API backend
backend k8s-api-servers
    mode tcp
    balance roundrobin
    option tcp-check

    # Health check: try to connect to port 6443
    server cp1 192.168.1.101:6443 check fall 3 rise 2 inter 5s
    server cp2 192.168.1.102:6443 check fall 3 rise 2 inter 5s
    server cp3 192.168.1.103:6443 check fall 3 rise 2 inter 5s

# Optional: Talos API frontend (for talosctl access)
frontend talos-api
    bind *:50000
    mode tcp
    default_backend talos-api-servers

backend talos-api-servers
    mode tcp
    balance roundrobin
    option tcp-check
    server cp1 192.168.1.101:50000 check fall 3 rise 2 inter 5s
    server cp2 192.168.1.102:50000 check fall 3 rise 2 inter 5s
    server cp3 192.168.1.103:50000 check fall 3 rise 2 inter 5s

# Stats page (optional, useful for monitoring)
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
```

### Key Configuration Parameters

- **balance roundrobin** - Distributes connections evenly across servers. Other options include `leastconn` (send to server with fewest connections) and `source` (stick client to same server).
- **check fall 3 rise 2** - Mark a server as down after 3 consecutive failed health checks. Mark it as up after 2 successful ones.
- **inter 5s** - Check health every 5 seconds.
- **timeout client/server 300s** - 5-minute timeout supports long-running kubectl operations.

### Start HAProxy

```bash
# Validate the configuration
haproxy -c -f /etc/haproxy/haproxy.cfg

# Start and enable the service
sudo systemctl start haproxy
sudo systemctl enable haproxy

# Check the status
sudo systemctl status haproxy
```

### Using the HAProxy Stats Page

If you enabled the stats listener, visit `http://<haproxy-ip>:8404/stats` in your browser. It shows the health of each backend server, connection counts, and error rates.

## Setting Up nginx as a TCP Load Balancer

If you prefer nginx:

```bash
# /etc/nginx/nginx.conf

# TCP load balancing requires the stream module
stream {
    # Upstream for the Kubernetes API
    upstream k8s_api {
        least_conn;
        server 192.168.1.101:6443 max_fails=3 fail_timeout=30s;
        server 192.168.1.102:6443 max_fails=3 fail_timeout=30s;
        server 192.168.1.103:6443 max_fails=3 fail_timeout=30s;
    }

    # Listen on port 6443 and proxy to the upstream
    server {
        listen 6443;
        proxy_pass k8s_api;
        proxy_timeout 300s;
        proxy_connect_timeout 5s;
    }
}
```

Make sure the nginx `stream` module is loaded. On some installations, you may need to add:

```bash
# Check if the stream module is available
nginx -V 2>&1 | grep stream

# If not available, install it
# On Ubuntu: sudo apt install libnginx-mod-stream
```

## Using the Load Balancer with Talos

When generating your Talos cluster configuration, use the load balancer's address as the endpoint:

```bash
# Use the load balancer address as the Kubernetes endpoint
talosctl gen config prod-cluster https://lb.example.com:6443
```

All generated configurations will reference this endpoint. Worker nodes will connect to the API server through the load balancer, and your kubeconfig will also use this address.

### DNS Configuration

Point a DNS name at your load balancer:

```
k8s-api.example.com.  IN  A  192.168.1.50    # The load balancer's IP
```

Using a DNS name is preferred over an IP because you can move the load balancer to a different IP without reconfiguring the cluster.

## High Availability for the Load Balancer

A single load balancer is itself a single point of failure. For true production HA, run two load balancers with keepalived:

```bash
# /etc/keepalived/keepalived.conf (on the primary load balancer)
vrrp_instance K8S_LB {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass secretpassword
    }
    virtual_ipaddress {
        192.168.1.50/24    # Floating VIP for the load balancer
    }
}
```

```bash
# On the backup load balancer, change state to BACKUP and priority to 99
```

This setup gives you a floating IP (192.168.1.50) that moves between your two load balancers. Both run HAProxy with identical configurations, and keepalived manages which one holds the VIP.

## Testing Failover

After setting up your load balancer, test that failover works:

```bash
# Verify the API is reachable through the load balancer
kubectl get nodes

# Stop one control plane node
talosctl shutdown --nodes 192.168.1.101

# Verify the API is still reachable
kubectl get nodes

# The load balancer should route to the remaining nodes
# Bring the node back
talosctl reboot --nodes 192.168.1.101
```

If kubectl continues to work after shutting down a control plane node, your load balancer is functioning correctly.

## Monitoring the Load Balancer

Keep an eye on your load balancer's health:

- Monitor connection counts and error rates
- Alert on backend servers going down
- Track latency through the load balancer
- Monitor the load balancer host's CPU and memory

For HAProxy, the stats page provides most of this information. For production, export metrics to Prometheus using the haproxy_exporter.

A properly configured load balancer is one of the most important components in a production Talos Linux cluster. It is the piece that turns your multi-node control plane from "multiple servers running the API" into "a single, resilient API endpoint."
