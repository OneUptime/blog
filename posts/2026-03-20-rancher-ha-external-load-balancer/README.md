# How to Configure Rancher HA with External Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Load Balancer, Kubernetes, TLS Termination, Network

Description: Configure an external load balancer for Rancher HA to distribute traffic across multiple server nodes with health checks and TLS passthrough.

## Introduction

An external load balancer in front of Rancher HA serves two purposes: distributing incoming Rancher traffic across Rancher Server nodes, and providing a single stable endpoint for downstream cluster agents and users. This guide covers load balancer configuration for Rancher HA deployments.

## TLS Termination Strategy

Rancher supports two load balancer TLS modes:

1. **TLS Passthrough**: Load balancer forwards raw TCP; Rancher handles TLS. Simpler but requires Layer 4 (TCP) load balancing.
2. **TLS Termination**: Load balancer handles TLS and forwards HTTP to Rancher on port 80. For Rancher installed with Helm, configure `--set tls=external`.

TLS Passthrough is recommended for production as it preserves end-to-end encryption. Rancher recommends a Layer 4 load balancer forwarding `80/tcp` and `443/tcp` to the Rancher cluster nodes.

## Option 1: Cloud Load Balancer (AWS NLB)

```bash
# Create an AWS Network Load Balancer

aws elbv2 create-load-balancer \
  --name rancher-nlb \
  --type network \
  --scheme internet-facing \
  --subnets subnet-abc123 subnet-def456 subnet-ghi789

# Create target group for Rancher HTTPS/443
aws elbv2 create-target-group \
  --name rancher-servers \
  --protocol TCP \
  --port 443 \
  --vpc-id vpc-12345678 \
  --target-type ip \
  --health-check-protocol HTTPS \
  --health-check-path /healthz \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2

# Register Rancher server IPs
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=10.0.0.11 Id=10.0.0.12 Id=10.0.0.13

# Create a TCP listener for TLS passthrough
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

If you want Rancher's HTTP-to-HTTPS redirect through the load balancer, add a separate TCP listener and target group for port `80` as well.

## Option 2: HAProxy Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    maxconn 50000
    log stdout local0

defaults
    log global
    option tcplog
    timeout connect 5s
    timeout client 50s
    timeout server 50s

# Rancher HTTPS frontend (TLS passthrough)
frontend rancher-https
    bind *:443
    mode tcp
    default_backend rancher-servers

backend rancher-servers
    mode tcp
    balance roundrobin
    option tcp-check
    # TLS handshake health check
    server rancher-1 10.0.0.11:443 check check-ssl verify none
    server rancher-2 10.0.0.12:443 check check-ssl verify none
    server rancher-3 10.0.0.13:443 check check-ssl verify none

# Ensure the load balancer DNS name or VIP is included in the cluster TLS SANs.

# RKE2 supervisor frontend (required for RKE2 node registration)
frontend rke2-supervisor
    bind *:9345
    mode tcp
    default_backend rke2-supervisors

backend rke2-supervisors
    mode tcp
    balance roundrobin
    server server-1 10.0.0.11:9345 check
    server server-2 10.0.0.12:9345 check
    server server-3 10.0.0.13:9345 check

# Kubernetes API frontend (K3s and RKE2)
frontend k8s-api
    bind *:6443
    mode tcp
    default_backend k8s-api-servers

backend k8s-api-servers
    mode tcp
    balance roundrobin
    server server-1 10.0.0.11:6443 check
    server server-2 10.0.0.12:6443 check
    server server-3 10.0.0.13:6443 check
```

If you also want Rancher's HTTP-to-HTTPS redirect, add a matching TCP frontend and backend for port `80`.

## Option 3: Keepalived for a Load Balancer VIP

For on-premises HA, Keepalived can provide a virtual IP for a pair of external load balancer nodes. Use it alongside HAProxy or another load balancer; by itself it provides failover, not traffic distribution.

```conf
# /etc/keepalived/keepalived.conf on each load balancer node

vrrp_script check_rancher {
    script "curl -k -s https://localhost/healthz"
    interval 3
    weight 10
}

vrrp_instance VI_RANCHER {
    state MASTER        # Set to BACKUP on the peer load balancer
    interface eth0
    virtual_router_id 51
    priority 100        # Highest priority = active node; lower on the peer
    advert_int 1

    track_script {
        check_rancher
    }

    virtual_ipaddress {
        10.0.0.10/24    # Virtual IP shared by the load balancer pair
    }
}
```

## Health Check Configuration

```bash
# Rancher health endpoint (returns 200 when healthy)
curl -k https://rancher.example.com/healthz
# Response: ok

# Version info from the Rancher API
curl -k https://rancher.example.com/v3/settings/server-version
```

## Conclusion

The external load balancer is the entry point for Rancher management traffic. TLS passthrough with a Layer 4 load balancer is the recommended approach for production, and `/healthz` is the correct Rancher health-check endpoint. For K3s, load-balance port `6443`; for RKE2, load-balance both `6443` and `9345`, and ensure the load balancer DNS name or VIP is included in the cluster TLS SANs.
