# How to Configure Rancher HA with F5

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, F5, BIG-IP, Enterprise

Description: Configure F5 BIG-IP as the enterprise load balancer for Rancher HA deployments with iRules, health monitors, and SSL offloading for mission-critical environments.

## Introduction

F5 BIG-IP is a common choice in enterprise environments for load balancing Rancher HA deployments. Its advanced traffic management capabilities, comprehensive health monitoring, and iRule scripting provide the fine-grained control needed for complex enterprise requirements. This guide covers F5 configuration for Rancher HA.

## Prerequisites

- F5 BIG-IP LTM (version 14.x or later)
- Access to F5 management interface (TMSH or GUI)
- Running Rancher HA cluster (3 nodes)
- Rancher installed for external TLS termination (`--set tls=external`)
- If Rancher is running on RKE2 with ingress-nginx, `use-forwarded-headers: "true"` enabled
- TLS certificate imported into F5
- F5 admin credentials

## Step 1: Create Health Monitor

```tcl
# TMSH commands for F5 configuration

# Create HTTP health monitor for Rancher when TLS terminates on F5

tmsh create ltm monitor http rancher_http_monitor {
    defaults-from http
    interval 10
    timeout 31
    send "GET /healthz HTTP/1.1\r\nHost: rancher.example.com\r\nConnection: Close\r\n\r\n"
}
```

## Step 2: Create Node Objects

```tcl
# Create node objects for Rancher servers
tmsh create ltm node rancher-01 address 10.0.0.11
tmsh create ltm node rancher-02 address 10.0.0.12
tmsh create ltm node rancher-03 address 10.0.0.13

# Create node for RKE2 API servers (same nodes, different ports)
# (Nodes are shared across pools)
```

## Step 3: Create Pool for Rancher Web Traffic

```tcl
# Create pool for Rancher web traffic
tmsh create ltm pool rancher_http_pool {
    members {
        rancher-01:80 { address 10.0.0.11 }
        rancher-02:80 { address 10.0.0.12 }
        rancher-03:80 { address 10.0.0.13 }
    }
    load-balancing-mode least-connections-member
    monitor rancher_http_monitor
    service-down-action none
}

# Create pool for RKE2 API server
tmsh create ltm pool rke2_api_pool {
    members {
        rancher-01:6443 { address 10.0.0.11 }
        rancher-02:6443 { address 10.0.0.12 }
        rancher-03:6443 { address 10.0.0.13 }
    }
    load-balancing-mode least-connections-member
    monitor tcp_half_open
}

# Create pool for RKE2 registration
tmsh create ltm pool rke2_register_pool {
    members {
        rancher-01:9345 { address 10.0.0.11 }
        rancher-02:9345 { address 10.0.0.12 }
        rancher-03:9345 { address 10.0.0.13 }
    }
    load-balancing-mode least-connections-member
    monitor tcp
}
```

## Step 4: Configure SSL and HTTP Profiles

```tcl
# Import certificate and key to F5
# (Use GUI to import, or use TMSH with base64-encoded cert)

# Create client SSL profile for frontend (client to F5)
tmsh create ltm profile client-ssl rancher_client_ssl {
    defaults-from clientssl
    cert-key-chain {
        rancher {
            cert rancher.crt
            key rancher.key
            chain rancher-chain.crt
        }
    }
    # Modern TLS only
    options { no-sslv3 no-tlsv1 no-tlsv1.1 }
    ciphers "ECDHE+AES128+AESGCM:ECDHE+AES256+AESGCM"
}

# Create HTTP profile for Rancher and preserve client IPs in X-Forwarded-For
tmsh create ltm profile http rancher_http {
    defaults-from http
    insert-xforwarded-for enabled
}

# Enable HTTP/2 for clients that negotiate it on the frontend
tmsh create ltm profile http2 rancher_http2 {
    defaults-from http2
}
```

## Step 5: Create iRule for Forwarded Headers and Long-Lived Connections

```tcl
# Add the proxy headers Rancher requires for external TLS termination
tmsh create ltm rule rancher_headers_irule {
    when HTTP_REQUEST {
        HTTP::header replace X-Forwarded-Proto "https"
        HTTP::header replace X-Forwarded-Port "443"
        TCP::idletime 1800
    }
}
```

## Step 6: Create Virtual Servers

```tcl
# Rancher HTTPS virtual server (with SSL offloading)
tmsh create ltm virtual rancher_https_vs {
    destination 10.0.0.100:443
    ip-protocol tcp
    pool rancher_http_pool
    profiles {
        rancher_client_ssl { context clientside }
        rancher_http {}
        rancher_http2 { context clientside }
        websocket {}
        tcp {}
    }
    rules {
        rancher_headers_irule
    }
    source-address-translation {
        type automap
    }
    translate-address enabled
    translate-port enabled
}

# HTTP to HTTPS redirect
tmsh create ltm virtual rancher_http_vs {
    destination 10.0.0.100:80
    ip-protocol tcp
    rules {
        _sys_https_redirect
    }
    profiles {
        http {}
        tcp {}
    }
}

# RKE2 API server (TCP passthrough)
tmsh create ltm virtual rke2_api_vs {
    destination 10.0.0.100:6443
    ip-protocol tcp
    pool rke2_api_pool
    profiles {
        tcp {}
    }
    translate-address enabled
}

# RKE2 registration
tmsh create ltm virtual rke2_register_vs {
    destination 10.0.0.100:9345
    ip-protocol tcp
    pool rke2_register_pool
    profiles {
        tcp {}
    }
    translate-address enabled
}
```

## Step 7: Enable Connection Persistence

```tcl
# Create source address persistence profile for Rancher UI traffic
tmsh create ltm persistence source-addr rancher_src_persistence {
    defaults-from source_addr
    timeout 1800
}

# Apply to the virtual server
tmsh modify ltm virtual rancher_https_vs {
    persist replace-all-with { rancher_src_persistence }
}
```

## Step 8: Save and Verify Configuration

```bash
# Save F5 configuration
tmsh save sys config

# Check pool member status
tmsh show ltm pool rancher_http_pool

# Check virtual server statistics
tmsh show ltm virtual rancher_https_vs

# Test from F5 shell
curl -sk -H 'Host: rancher.example.com' https://10.0.0.100/healthz
```

## Conclusion

F5 BIG-IP provides enterprise-grade capabilities for Rancher HA, including health monitoring, proxy header insertion for external TLS termination, HTTP/2 and WebSocket support, and source persistence for long-lived connections. When Rancher TLS is terminated on F5, send Rancher UI traffic to backend port 80 with the required forwarded headers, while keeping the RKE2 control-plane ports (`6443` and `9345`) as TCP pass-through services. For enterprises already invested in F5 infrastructure, this approach leverages existing tooling and expertise while delivering the reliability expected in mission-critical environments.
