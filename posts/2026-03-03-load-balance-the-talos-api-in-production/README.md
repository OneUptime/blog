# How to Load Balance the Talos API in Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Load Balancing, High Availability, Production, Kubernetes

Description: A production-focused guide to load balancing the Talos Linux API across control plane nodes using various load balancer solutions.

---

In a production Talos Linux cluster, the Talos API is your primary management interface. It runs on port 50000 on every control plane node and handles everything from configuration updates to cluster bootstrapping. Without load balancing, you depend on a single node's IP for management access, which means losing that node also means losing management capability until you manually switch to another. This guide covers the practical approaches to load balancing the Talos API for production reliability.

## What Needs Load Balancing

A Talos cluster has two distinct APIs that benefit from load balancing:

1. **Talos API (port 50000)** - Used by `talosctl` for machine management
2. **Kubernetes API (port 6443)** - Used by `kubectl` and all Kubernetes clients

Both are gRPC-based and use TLS. The load balancing approach is similar for both, and it makes sense to handle them together.

## Option 1: Talos Built-In VIP

The simplest option for bare metal or environments without external load balancers is the built-in Virtual IP feature in Talos. A VIP floats between control plane nodes, and the currently active node responds to the VIP address:

```yaml
# Machine config for each control plane node
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.10/24  # Node's actual IP (different per node)
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
        vip:
          ip: 10.0.1.100  # Shared VIP (same on all CP nodes)
  certSANs:
    - 10.0.1.100
```

The VIP uses ARP or BGP to advertise the floating IP. When the active node fails, another control plane node claims the VIP. The failover takes a few seconds.

Pros:
- No external infrastructure needed
- Simple to configure
- Works on bare metal

Cons:
- Active-passive (only one node handles traffic at a time)
- Requires all control plane nodes to be on the same Layer 2 network (for ARP mode)
- No health checking beyond node availability

## Option 2: HAProxy

HAProxy is a widely used load balancer that works well for TCP proxying of the Talos and Kubernetes APIs:

```bash
# Install HAProxy on a dedicated server
sudo apt install -y haproxy
```

Configure HAProxy for both APIs:

```
# /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    maxconn 4096
    daemon

defaults
    mode tcp
    log global
    timeout connect 10s
    timeout client 600s
    timeout server 600s
    retries 3

# Talos API load balancing
frontend talos_api_frontend
    bind *:50000
    default_backend talos_api_backend

backend talos_api_backend
    option tcp-check
    balance roundrobin
    server cp-1 10.0.1.10:50000 check inter 5s fall 3 rise 2
    server cp-2 10.0.1.11:50000 check inter 5s fall 3 rise 2
    server cp-3 10.0.1.12:50000 check inter 5s fall 3 rise 2

# Kubernetes API load balancing
frontend kube_api_frontend
    bind *:6443
    default_backend kube_api_backend

backend kube_api_backend
    option tcp-check
    balance roundrobin
    server cp-1 10.0.1.10:6443 check inter 5s fall 3 rise 2
    server cp-2 10.0.1.11:6443 check inter 5s fall 3 rise 2
    server cp-3 10.0.1.12:6443 check inter 5s fall 3 rise 2
```

The key configuration details:

- `mode tcp` because gRPC requires Layer 4 proxying
- `timeout client/server 600s` for long-lived gRPC streams
- `check inter 5s fall 3 rise 2` provides health checking with reasonable thresholds

Enable the HAProxy stats page for monitoring:

```
# Add to haproxy.cfg
frontend stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST
```

## Option 3: Keepalived with HAProxy

For high availability of the load balancer itself, pair HAProxy with Keepalived. This runs two HAProxy instances in active-passive mode with a floating VIP:

```
# /etc/keepalived/keepalived.conf on the primary
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
        auth_pass mypassword
    }
    virtual_ipaddress {
        10.0.1.100
    }
    track_script {
        check_haproxy
    }
}
```

```
# /etc/keepalived/keepalived.conf on the backup
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass mypassword
    }
    virtual_ipaddress {
        10.0.1.100
    }
    track_script {
        check_haproxy
    }
}
```

This gives you a highly available load balancer pair. If the primary HAProxy goes down, Keepalived moves the VIP to the backup within seconds.

## Option 4: Cloud Load Balancers

In cloud environments, use the native load balancer service.

### AWS Network Load Balancer

```bash
# Create a target group for the Talos API
aws elbv2 create-target-group \
    --name talos-api-tg \
    --protocol TCP \
    --port 50000 \
    --vpc-id vpc-12345 \
    --health-check-protocol TCP \
    --health-check-port 50000

# Create the NLB
aws elbv2 create-load-balancer \
    --name talos-api-lb \
    --type network \
    --subnets subnet-abc subnet-def subnet-ghi \
    --scheme internal

# Create a listener
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:... \
    --protocol TCP \
    --port 50000 \
    --default-actions Type=forward,TargetGroupArn=arn:aws:...

# Register targets
aws elbv2 register-targets \
    --target-group-arn arn:aws:... \
    --targets Id=i-cp1 Id=i-cp2 Id=i-cp3
```

### DNS-Based Configuration After LB Creation

After creating the load balancer, update your Talos configuration to use its address:

```yaml
machine:
  certSANs:
    - talos-api-lb-abc123.elb.us-east-1.amazonaws.com
cluster:
  controlPlane:
    endpoint: https://talos-api-lb-abc123.elb.us-east-1.amazonaws.com:6443
```

## Configuring talosctl for Load Balanced Access

Once your load balancer is running, update your talosctl configuration:

```bash
# Set the endpoint to the load balancer
talosctl config endpoint lb.example.com

# Verify connectivity
talosctl version

# You can still target specific nodes for node-specific operations
talosctl --nodes 10.0.1.10 service etcd status
```

The `endpoint` is where talosctl connects to, while `--nodes` specifies which node should execute the command. The load balancer handles routing the connection to any available control plane node, and that node forwards the request to the target node.

## Health Check Configuration

Proper health checks are critical for production load balancing. The load balancer needs to detect unhealthy nodes quickly and stop sending traffic to them.

For TCP health checks (simplest approach):

```
# HAProxy TCP health check
backend talos_api_backend
    option tcp-check
    server cp-1 10.0.1.10:50000 check inter 5s fall 3 rise 2
```

This checks if the TCP port is open. A node that crashes or loses network connectivity will be detected within 15 seconds (3 failures at 5 second intervals).

For more thorough checks, you can create a small script that runs on the load balancer:

```bash
#!/bin/bash
# /usr/local/bin/check-talos.sh
# Returns 0 if the Talos API is responding

NODE=$1
timeout 5 talosctl version --nodes "$NODE" --endpoints "$NODE" > /dev/null 2>&1
```

## Monitoring Load Balancer Health

Set up monitoring to alert when the load balancer or backend nodes have issues:

```yaml
# Prometheus alert rules for HAProxy
groups:
  - name: haproxy-alerts
    rules:
      - alert: TalosAPIBackendDown
        expr: haproxy_backend_active_servers{backend="talos_api_backend"} < 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Less than 2 Talos API backends are healthy"

      - alert: AllTalosAPIBackendsDown
        expr: haproxy_backend_active_servers{backend="talos_api_backend"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "All Talos API backends are down"
```

## Connection Persistence

The Talos API uses gRPC, which creates long-lived HTTP/2 connections. This is important for load balancer configuration because:

- Round-robin balancing may not distribute load evenly since connections persist
- The `least_conn` algorithm works better for gRPC workloads
- Connection draining during maintenance needs longer timeouts

Configure your load balancer accordingly:

```
# HAProxy with least connections balancing
backend talos_api_backend
    balance leastconn
    option tcp-check
    timeout server 600s
    server cp-1 10.0.1.10:50000 check inter 5s fall 3 rise 2
    server cp-2 10.0.1.11:50000 check inter 5s fall 3 rise 2
    server cp-3 10.0.1.12:50000 check inter 5s fall 3 rise 2
```

## Testing Failover

After setting up load balancing, test that failover works:

```bash
# Continuous connectivity test
while true; do
    talosctl version --endpoints lb.example.com 2>&1 | head -1
    sleep 2
done

# In another terminal, simulate a node failure by shutting down a CP node
# Then watch the connectivity test - it should continue working
# after a brief interruption during failover
```

## Conclusion

Load balancing the Talos API is essential for production clusters. The right approach depends on your infrastructure. Use the built-in VIP for simple bare metal setups, HAProxy with Keepalived for more robust bare metal deployments, and native cloud load balancers in cloud environments. Whichever option you choose, make sure to configure appropriate health checks, include all load balancer addresses in your certificate SANs, and test failover before relying on it. A well-configured load balancer ensures that you can always manage your cluster, even when individual control plane nodes are down for maintenance or have failed.
