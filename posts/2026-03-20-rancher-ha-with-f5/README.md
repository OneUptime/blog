# How to Configure Rancher HA with F5 - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, F5 BIG-IP, High Availability, Enterprise, Load Balancer, SSL

Description: Configure F5 BIG-IP as the enterprise load balancer for Rancher HA with iRules for health checking, persistence profiles, and SSL offloading configuration.

## Introduction

F5 BIG-IP is the enterprise standard for application delivery in regulated industries. Configuring it for Rancher HA requires creating virtual servers, pools with health monitors, and load balancer settings that support long-lived WebSocket connections for cluster agents.

## Prerequisites

- F5 BIG-IP LTM with appropriate license
- Management access to BIG-IP (TMSH or GUI)
- Three Rancher server nodes registered as pool members

## Step 1: Create Pool Members (Nodes)

```bash
# Using TMSH (Traffic Management Shell)

# Add Rancher server nodes to BIG-IP

tmsh create ltm node rancher-node-1 address 10.0.0.11
tmsh create ltm node rancher-node-2 address 10.0.0.12
tmsh create ltm node rancher-node-3 address 10.0.0.13
```

## Step 2: Create a Health Monitor

```bash
# Create an HTTPS health monitor for Rancher's /healthz endpoint
tmsh create ltm monitor https rancher-health-monitor \
  defaults-from https \
  interval 10 \
  timeout 31 \
  recv "200" \
  send "GET /healthz HTTP/1.0\r\nHost: rancher.example.com\r\n\r\n" \
  ssl-profile /Common/serverssl
```

## Step 3: Create the Rancher Pool

```bash
# Create pool with health monitor and load balancing algorithm
tmsh create ltm pool rancher-https-pool \
  load-balancing-mode least-connections-members \
  monitor rancher-health-monitor \
  members add { \
    rancher-node-1:443 { address 10.0.0.11 } \
    rancher-node-2:443 { address 10.0.0.12 } \
    rancher-node-3:443 { address 10.0.0.13 } \
  }
```

## Step 4: Configure FastL4 Profile (SSL Passthrough)

For SSL passthrough (recommended for Rancher):

```bash
# Create a FastL4 profile for SSL passthrough
tmsh create ltm profile fastl4 rancher-fastl4 \
  defaults-from fastl4 \
  idle-timeout 1800 \
  reset-on-timeout disabled

# Create virtual server with FastL4 (bypasses SSL processing)
tmsh create ltm virtual rancher-https-vs \
  destination 10.0.0.10:443 \
  ip-protocol tcp \
  pool rancher-https-pool \
  profiles replace-all-with { rancher-fastl4 } \
  source-address-translation { type automap }
```

Port 80 is optional but commonly forwarded as well so the ingress controller can redirect HTTP to HTTPS.

## Step 5: Configure RKE2 Control Plane Listeners (If Needed)

If the same F5 device is also fronting an HA RKE2 management cluster, configure both the supervisor listener on port 9345 and the Kubernetes API listener on port 6443.

```bash
# Pool for the RKE2 supervisor (port 9345)
tmsh create ltm pool rke2-supervisor-pool \
  load-balancing-mode least-connections-members \
  monitor tcp \
  members add { \
    rancher-node-1:9345 { address 10.0.0.11 } \
    rancher-node-2:9345 { address 10.0.0.12 } \
    rancher-node-3:9345 { address 10.0.0.13 } \
  }

tmsh create ltm virtual rke2-supervisor-vs \
  destination 10.0.0.10:9345 \
  ip-protocol tcp \
  pool rke2-supervisor-pool \
  profiles replace-all-with { rancher-fastl4 } \
  source-address-translation { type automap }

# Pool for the Kubernetes API (port 6443)
tmsh create ltm pool k8s-api-pool \
  load-balancing-mode least-connections-members \
  monitor tcp \
  members add { \
    rancher-node-1:6443 { address 10.0.0.11 } \
    rancher-node-2:6443 { address 10.0.0.12 } \
    rancher-node-3:6443 { address 10.0.0.13 } \
  }

tmsh create ltm virtual k8s-api-vs \
  destination 10.0.0.10:6443 \
  ip-protocol tcp \
  pool k8s-api-pool \
  profiles replace-all-with { rancher-fastl4 } \
  source-address-translation { type automap }
```

## Step 6: Configure Persistence for WebSocket Connections

Rancher uses long-lived WebSocket connections for cluster agents. Source-address persistence is optional and keeps reconnecting clients on the same Rancher node behind the VIP:

```bash
# Create source address persistence profile
tmsh create ltm persistence source-addr rancher-persistence \
  defaults-from source_addr \
  timeout 3600

# Apply to the virtual server
tmsh modify ltm virtual rancher-https-vs \
  persist replace-all-with { rancher-persistence { default yes } }
```

## Step 7: Save Configuration

```bash
# Save BIG-IP configuration
tmsh save /sys config
```

## Conclusion

F5 BIG-IP provides enterprise-grade load balancing for Rancher HA with FastL4-based SSL passthrough, application-layer health monitors, and optional source-address persistence. If the same BIG-IP also fronts the HA RKE2 management cluster, expose port 9345 for the supervisor and 6443 for the Kubernetes API in addition to the Rancher HTTPS listener.
