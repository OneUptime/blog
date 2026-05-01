# How to Configure F5 BIG-IP for IPv6 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: F5, BIG-IP, IPv6, Load Balancing, Enterprise, TMOS

Description: A guide to configuring F5 BIG-IP for IPv6 load balancing including virtual servers, pools, SNAT, and dual-stack deployment.

F5 BIG-IP supports IPv6 and provides enterprise-grade IPv6 load balancing with iRules, profiles, and monitoring. Configuration is done through the TMSH CLI or web interface.

## BIG-IP IPv6 Prerequisites

```bash
# Check TMOS version

tmsh show sys version

# Verify the LTM module is provisioned
tmsh list sys provision

# Review existing self IPs and routes before adding IPv6 objects
tmsh list net self
tmsh list net route
```

## Configure Self IP Addresses (IPv6)

BIG-IP's self IPs are the addresses the system uses for traffic management:

```bash
# Add IPv6 self IP to VLAN
tmsh create net self ipv6-self \
  address 2001:db8::1/64 \
  vlan external \
  allow-service default

# Add floating self IP for high availability
tmsh create net self ipv6-float \
  address 2001:db8::100/64 \
  vlan external \
  allow-service default \
  traffic-group traffic-group-1    # Floating traffic group
```

## Create IPv6 Pool

```bash
# Create a pool with IPv6 members
tmsh create ltm pool ipv6-pool \
  members add {
    v6-node-1:80 { address 2001:db8::10 }
    v6-node-2:80 { address 2001:db8::11 }
  } \
  monitor http

# Or a separate IPv4 pool for IPv4 services
tmsh create ltm pool ipv4-pool \
  members add {
    app-v4-1:80 { address 10.0.0.10 }
    app-v4-2:80 { address 10.0.0.11 }
  }
```

## Create Virtual Servers for IPv6 Load Balancing

```bash
# IPv4 virtual server forwarding to an IPv6 pool
tmsh create ltm virtual ipv4-to-ipv6-vs \
  destination 203.0.113.20:80 \
  pool ipv6-pool \
  ip-protocol tcp \
  profiles add {
    http { }
    tcp { }
  } \
  source-address-translation { type automap }

# IPv6-to-IPv6 virtual server
tmsh create ltm virtual ipv6-to-ipv6-vs \
  destination 2001:db8::200.80 \
  pool ipv6-pool \
  ip-protocol tcp \
  profiles add { http tcp }
```

## SNAT for IPv6

Source NAT allows backend servers to return traffic through BIG-IP:

```bash
# Create SNAT pool with IPv6 addresses
tmsh create ltm snatpool ipv6-snat-pool \
  members add {
    2001:db8::201
    2001:db8::202
  }

# Assign SNAT pool to virtual server
tmsh modify ltm virtual ipv6-to-ipv6-vs \
  source-address-translation {
    type snat
    pool ipv6-snat-pool
  }
```

## Dual-Stack Virtual Server

Accept both IPv4 and IPv6 clients on the same application by creating one virtual server per address family:

```bash
# IPv4 virtual server
tmsh create ltm virtual dualstack-ipv4-vs \
  destination 203.0.113.10:443 \
  pool ipv4-pool \
  ip-protocol tcp

# IPv6 virtual server
tmsh create ltm virtual dualstack-ipv6-vs \
  destination 2001:db8::300.443 \
  pool ipv6-pool \
  ip-protocol tcp

# Both virtual servers present the same service over IPv4 and IPv6
```

## IPv6 Monitoring

```bash
# Create IPv6 health monitor
tmsh create ltm monitor http ipv6-http-monitor \
  defaults-from http \
  destination *:80 \
  interval 5 \
  timeout 16 \
  send "GET /health HTTP/1.0\r\nConnection: close\r\n\r\n" \
  recv "200 OK"

# Apply monitor to pool
tmsh modify ltm pool ipv6-pool monitor ipv6-http-monitor
```

## iRules for IPv6

```tcl
# iRule: Log IPv6 client addresses
when CLIENT_ACCEPTED {
  if { [IP::version] == 6 } {
    log local0. "IPv6 client: [IP::client_addr] connecting to [virtual]"
  }
}

# iRule: Different pool for IPv6 clients
when HTTP_REQUEST {
  if { [IP::version] == 6 } {
    pool ipv6-optimized-pool
  } else {
    pool ipv4-pool
  }
}
```

## Verifying IPv6 Load Balancing

```bash
# Check virtual server status
tmsh show ltm virtual ipv6-to-ipv6-vs

# Check pool member status
tmsh show ltm pool ipv6-pool members

# Test IPv6 connectivity
curl -6 http://[2001:db8::200]/health

# Check connection table for IPv6
tmsh show sys connection cs-server-addr 2001:db8::200
```

F5 BIG-IP's comprehensive IPv6 support through TMSH and iRules makes it suitable for enterprise deployments that require sophisticated IPv6 load balancing policies alongside existing IPv4 infrastructure.
