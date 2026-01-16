# How to Install Apache APISIX on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache APISIX, API Gateway, Ubuntu, DevOps, Microservices, Load Balancing, Security, Observability

Description: A complete guide to installing, configuring, and operating Apache APISIX API gateway on Ubuntu with etcd, plugins, authentication, and monitoring.

---

Apache APISIX is a dynamic, real-time, high-performance API gateway that provides rich traffic management features such as load balancing, dynamic upstream, canary release, circuit breaking, authentication, and observability. Built on NGINX and OpenResty, it delivers exceptional performance while remaining cloud-native and highly extensible through its plugin architecture.

## What is Apache APISIX?

Apache APISIX is a top-level Apache Software Foundation project designed to handle API traffic for microservices, serverless architectures, and traditional applications. Unlike static configuration gateways, APISIX uses etcd as its configuration center, enabling real-time configuration changes without restarts.

### APISIX vs Alternatives

| Feature | Apache APISIX | Kong | NGINX | Traefik |
|---------|---------------|------|-------|---------|
| Configuration | Dynamic (etcd) | Database/Declarative | Static files | Dynamic |
| Performance | Very High | High | Very High | Medium |
| Plugin System | Lua/Wasm/External | Lua | Lua/C | Middleware |
| Dashboard | Built-in | Enterprise | Third-party | Built-in |
| Open Source | Fully | Core only | Yes | Yes |
| Kubernetes Native | Yes | Yes | Via Ingress | Yes |
| Hot Reload | Yes | Partial | Manual | Yes |

APISIX excels when you need dynamic configuration, high performance, and a rich plugin ecosystem without vendor lock-in.

## Prerequisites

Before installing APISIX, ensure your Ubuntu system meets these requirements.

```bash
# Check Ubuntu version (20.04 LTS or newer recommended)
lsb_release -a

# Update system packages to ensure we have the latest security patches
sudo apt update && sudo apt upgrade -y

# Install essential dependencies for building and running APISIX
sudo apt install -y curl wget git build-essential libpcre3 libpcre3-dev libssl-dev zlib1g-dev
```

Minimum system requirements:
- Ubuntu 20.04 LTS or newer
- 2 CPU cores (4 recommended for production)
- 4 GB RAM (8 GB recommended)
- 20 GB disk space

## Installing etcd (Required Backend)

APISIX uses etcd as its configuration store. All routes, upstreams, and plugin configurations are stored in etcd, enabling distributed configuration and high availability.

### Installing etcd from Binary

Download and install the latest stable version of etcd. This script downloads the binary, extracts it, and moves it to the system path.

```bash
# Define etcd version and download URL
ETCD_VERSION="3.5.11"
DOWNLOAD_URL="https://github.com/etcd-io/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz"

# Download and extract etcd binaries
curl -L ${DOWNLOAD_URL} -o /tmp/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz
tar xzvf /tmp/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz -C /tmp/

# Move binaries to system path for global access
sudo mv /tmp/etcd-v${ETCD_VERSION}-linux-amd64/etcd /usr/local/bin/
sudo mv /tmp/etcd-v${ETCD_VERSION}-linux-amd64/etcdctl /usr/local/bin/

# Verify installation by checking version
etcd --version
etcdctl version
```

### Creating etcd Systemd Service

Set up etcd as a systemd service for automatic startup and management. This configuration is suitable for single-node development setups.

```bash
# Create etcd data directory with proper permissions
sudo mkdir -p /var/lib/etcd
sudo mkdir -p /etc/etcd

# Create etcd user for security (running as non-root)
sudo useradd -r -s /bin/false etcd
sudo chown -R etcd:etcd /var/lib/etcd
```

Create the systemd service file for etcd. This defines how the system starts and manages the etcd process.

```bash
# Create the systemd unit file for etcd service
sudo tee /etc/systemd/system/etcd.service > /dev/null <<EOF
[Unit]
Description=etcd key-value store
Documentation=https://etcd.io/docs/
After=network.target

[Service]
Type=notify
User=etcd
ExecStart=/usr/local/bin/etcd \\
  --name node1 \\
  --data-dir /var/lib/etcd \\
  --listen-client-urls http://0.0.0.0:2379 \\
  --advertise-client-urls http://127.0.0.1:2379 \\
  --listen-peer-urls http://0.0.0.0:2380 \\
  --initial-advertise-peer-urls http://127.0.0.1:2380 \\
  --initial-cluster node1=http://127.0.0.1:2380 \\
  --initial-cluster-token etcd-cluster-1 \\
  --initial-cluster-state new
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start etcd service. The service will now start automatically on system boot.

```bash
# Reload systemd to recognize the new service file
sudo systemctl daemon-reload

# Enable etcd to start on boot
sudo systemctl enable etcd

# Start etcd service immediately
sudo systemctl start etcd

# Verify etcd is running and healthy
sudo systemctl status etcd
etcdctl endpoint health
```

## Installing Apache APISIX

APISIX can be installed via package manager, from source, or using Docker. The package manager approach is recommended for production Ubuntu deployments.

### Method 1: Install via APT Repository (Recommended)

Add the official APISIX repository and install using apt. This method ensures easy updates and dependency management.

```bash
# Install required dependencies for adding repositories
sudo apt install -y gnupg2 lsb-release software-properties-common

# Add the Apache APISIX GPG key for package verification
curl -fsSL https://repos.apiseven.com/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/apisix-archive-keyring.gpg

# Add the APISIX repository to apt sources
echo "deb [signed-by=/usr/share/keyrings/apisix-archive-keyring.gpg] https://repos.apiseven.com/packages/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/apisix.list

# Update package lists to include APISIX packages
sudo apt update

# Install Apache APISIX
sudo apt install -y apisix
```

### Method 2: Install from Source

For development or customization, install APISIX from source. This requires OpenResty and LuaRocks.

```bash
# Install OpenResty (the platform APISIX runs on)
wget -O - https://openresty.org/package/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/openresty.gpg
echo "deb [signed-by=/usr/share/keyrings/openresty.gpg] http://openresty.org/package/ubuntu $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/openresty.list
sudo apt update
sudo apt install -y openresty openresty-openssl111-dev

# Install LuaRocks for Lua package management
sudo apt install -y luarocks

# Clone APISIX repository and install
git clone https://github.com/apache/apisix.git /opt/apisix
cd /opt/apisix
git checkout release/3.8

# Install APISIX dependencies using LuaRocks
make deps
```

### Initialize and Start APISIX

Initialize APISIX configuration and start the service. APISIX will connect to etcd and begin accepting traffic.

```bash
# Initialize APISIX (creates default configuration)
sudo apisix init

# Start APISIX service
sudo apisix start

# Verify APISIX is running by checking the admin API
curl -s http://127.0.0.1:9180/apisix/admin/routes -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq .

# Check APISIX version and status
sudo apisix version
```

## Configuration Overview

APISIX configuration is stored in `/usr/local/apisix/conf/config.yaml`. This file controls the gateway behavior, admin API access, and plugin settings.

### Main Configuration File

Review and customize the main configuration. Key sections include etcd connection, admin API settings, and plugin configuration.

```yaml
# /usr/local/apisix/conf/config.yaml
# Main APISIX configuration file

apisix:
  # Node listener configuration - where APISIX accepts traffic
  node_listen: 9080                    # HTTP port for proxy traffic
  enable_ipv6: false                   # Disable IPv6 if not needed
  enable_admin: true                   # Enable the Admin API
  admin_listen:
    ip: 0.0.0.0                        # Admin API listen address
    port: 9180                         # Admin API port

  # SSL/TLS listener for HTTPS traffic
  ssl:
    enable: true
    listen:
      - port: 9443                     # HTTPS port

# Admin API authentication - CHANGE THIS IN PRODUCTION
admin_key:
  - name: admin                        # Admin user name
    key: edd1c9f034335f136f87ad84b625c8f1  # API key (change this!)
    role: admin                        # Full admin access
  - name: viewer
    key: 4054f7cf07e344346cd3f287985e76a2
    role: viewer                       # Read-only access

# etcd configuration - connection to configuration store
etcd:
  host:
    - "http://127.0.0.1:2379"          # etcd cluster endpoints
  prefix: /apisix                      # Key prefix in etcd
  timeout: 30                          # Connection timeout in seconds

# Plugin configuration
plugins:
  - api-breaker                        # Circuit breaker
  - authz-keycloak                     # Keycloak authorization
  - basic-auth                         # Basic authentication
  - batch-requests                     # Request batching
  - consumer-restriction               # Consumer access control
  - cors                               # Cross-origin resource sharing
  - echo                               # Echo plugin for testing
  - fault-injection                    # Fault injection for testing
  - grpc-transcode                     # gRPC to HTTP transcoding
  - hmac-auth                          # HMAC authentication
  - http-logger                        # HTTP logging
  - ip-restriction                     # IP-based access control
  - jwt-auth                           # JWT authentication
  - kafka-logger                       # Kafka logging
  - key-auth                           # API key authentication
  - limit-conn                         # Connection limiting
  - limit-count                        # Request count limiting
  - limit-req                          # Request rate limiting
  - node-status                        # Node status endpoint
  - openid-connect                     # OpenID Connect
  - prometheus                         # Prometheus metrics
  - proxy-cache                        # Response caching
  - proxy-mirror                       # Traffic mirroring
  - proxy-rewrite                      # Request/response rewriting
  - redirect                           # URL redirects
  - referer-restriction                # Referer-based access control
  - request-id                         # Request ID generation
  - request-validation                 # Request validation
  - response-rewrite                   # Response modification
  - serverless-post-function           # Serverless functions
  - serverless-pre-function
  - sls-logger                         # SLS logging
  - syslog                             # Syslog output
  - tcp-logger                         # TCP logging
  - udp-logger                         # UDP logging
  - uri-blocker                        # URI blocking
  - wolf-rbac                          # Wolf RBAC
  - zipkin                             # Zipkin tracing
  - traffic-split                      # Traffic splitting
  - proxy-control                      # Proxy control
  - request-body-rewrite               # Request body modification
```

After modifying configuration, reload APISIX to apply changes.

```bash
# Reload APISIX configuration without downtime
sudo apisix reload

# Or restart for major configuration changes
sudo apisix stop && sudo apisix start
```

## Creating Routes and Upstreams

Routes define how incoming requests are matched and forwarded to backend services. Upstreams define the backend service endpoints.

### Creating an Upstream

An upstream represents a group of backend servers. Configure load balancing, health checks, and failover behavior here.

```bash
# Create an upstream with multiple backend nodes
# This upstream uses round-robin load balancing across two servers
curl -X PUT http://127.0.0.1:9180/apisix/admin/upstreams/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "backend-service",
    "desc": "Production backend servers",
    "type": "roundrobin",
    "nodes": {
      "192.168.1.10:8080": 1,
      "192.168.1.11:8080": 1
    },
    "retries": 3,
    "retry_timeout": 5,
    "timeout": {
      "connect": 5,
      "send": 10,
      "read": 10
    },
    "checks": {
      "active": {
        "type": "http",
        "http_path": "/health",
        "healthy": {
          "interval": 5,
          "successes": 2
        },
        "unhealthy": {
          "interval": 2,
          "http_failures": 3
        }
      }
    }
  }'
```

### Creating a Route

Routes match incoming requests based on URI, host, methods, and other criteria. They connect to upstreams and can apply plugins.

```bash
# Create a route that forwards /api/* requests to the upstream
# This route enables several plugins for security and observability
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "api-route",
    "desc": "Main API endpoint",
    "uri": "/api/*",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "upstream_id": "1",
    "plugins": {
      "proxy-rewrite": {
        "regex_uri": ["^/api/(.*)", "/$1"]
      }
    }
  }'
```

### Route with Inline Upstream

For simpler setups, define the upstream directly in the route without creating a separate upstream object.

```bash
# Create a route with an inline upstream definition
# Useful for single-purpose routes that don't share backends
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/2 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "user-service",
    "uri": "/users/*",
    "methods": ["GET", "POST"],
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "user-service.internal:3000": 1
      }
    }
  }'
```

## Plugin System Overview

APISIX plugins extend gateway functionality. Plugins can be applied globally, per-route, per-service, or per-consumer. They execute in a defined order during request/response phases.

### Plugin Categories

APISIX organizes plugins into several categories:
- **Authentication**: key-auth, jwt-auth, basic-auth, openid-connect
- **Security**: ip-restriction, uri-blocker, consumer-restriction, cors
- **Traffic Control**: limit-req, limit-count, limit-conn, traffic-split
- **Observability**: prometheus, zipkin, skywalking, http-logger
- **Transformation**: proxy-rewrite, response-rewrite, grpc-transcode

### Enabling Plugins Globally

Enable a plugin for all routes by adding it to the global rules.

```bash
# Create a global rule that applies plugins to all traffic
# This example adds request-id to every request
curl -X PUT http://127.0.0.1:9180/apisix/admin/global_rules/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "plugins": {
      "request-id": {
        "header_name": "X-Request-ID",
        "include_in_response": true
      },
      "prometheus": {}
    }
  }'
```

## Authentication Plugins

APISIX provides multiple authentication mechanisms. Choose based on your security requirements and client capabilities.

### Key Authentication (key-auth)

API key authentication is simple and effective for service-to-service communication. Keys are stored in APISIX and validated on each request.

First, create a consumer with an API key.

```bash
# Create a consumer with key-auth credentials
# Consumers represent API clients with their own credentials and permissions
curl -X PUT http://127.0.0.1:9180/apisix/admin/consumers/service-a \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "service-a",
    "desc": "Backend Service A",
    "plugins": {
      "key-auth": {
        "key": "service-a-secret-key-12345"
      }
    }
  }'
```

Enable key-auth on a route to require authentication.

```bash
# Update route to require key authentication
# Requests without valid API key will receive 401 Unauthorized
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/3 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "protected-api",
    "uri": "/protected/*",
    "upstream_id": "1",
    "plugins": {
      "key-auth": {
        "header": "X-API-Key",
        "query": "api_key",
        "hide_credentials": true
      }
    }
  }'
```

Test the protected route with and without authentication.

```bash
# Test without API key - should return 401 Unauthorized
curl -i http://127.0.0.1:9080/protected/resource

# Test with valid API key - should succeed
curl -i http://127.0.0.1:9080/protected/resource \
  -H 'X-API-Key: service-a-secret-key-12345'
```

### JWT Authentication (jwt-auth)

JWT authentication is ideal for user-facing APIs. APISIX validates JWT tokens and extracts claims for authorization.

Create a consumer with JWT credentials including the signing secret.

```bash
# Create a consumer with JWT authentication
# The secret is used to verify token signatures
curl -X PUT http://127.0.0.1:9180/apisix/admin/consumers/mobile-app \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "mobile-app",
    "plugins": {
      "jwt-auth": {
        "key": "mobile-app-key",
        "secret": "my-super-secret-key-for-jwt-signing",
        "algorithm": "HS256",
        "exp": 86400,
        "base64_secret": false
      }
    }
  }'
```

Enable JWT authentication on a route.

```bash
# Create a route requiring JWT authentication
# Tokens can be passed in header, query, or cookie
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/4 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "jwt-protected-api",
    "uri": "/v2/api/*",
    "upstream_id": "1",
    "plugins": {
      "jwt-auth": {
        "header": "Authorization",
        "query": "token",
        "cookie": "jwt"
      }
    }
  }'
```

APISIX can also sign JWTs for you using the built-in endpoint.

```bash
# Generate a JWT token using APISIX's signing endpoint
# This is useful for testing or simple auth flows
curl -X GET http://127.0.0.1:9080/apisix/plugin/jwt/sign?key=mobile-app-key

# Use the returned token in requests
curl -i http://127.0.0.1:9080/v2/api/users \
  -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
```

### Combining Authentication with Authorization

Use consumer-restriction to limit which consumers can access specific routes.

```bash
# Create a route accessible only by specific consumers
# Combines authentication with authorization
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/5 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "admin-only-route",
    "uri": "/admin/*",
    "upstream_id": "1",
    "plugins": {
      "key-auth": {},
      "consumer-restriction": {
        "whitelist": ["admin-user", "super-admin"],
        "rejected_code": 403,
        "rejected_msg": "Access denied: admin privileges required"
      }
    }
  }'
```

## Traffic Control

APISIX provides comprehensive traffic management capabilities to protect backends and ensure fair resource usage.

### Rate Limiting (limit-req)

Limit request rates using the leaky bucket algorithm. Protects backends from traffic spikes and ensures fair usage.

```bash
# Apply rate limiting to a route
# Allows 10 requests per second with bursts up to 20
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/6 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "rate-limited-api",
    "uri": "/public/*",
    "upstream_id": "1",
    "plugins": {
      "limit-req": {
        "rate": 10,
        "burst": 20,
        "key_type": "var",
        "key": "remote_addr",
        "rejected_code": 429,
        "rejected_msg": "Rate limit exceeded. Please slow down."
      }
    }
  }'
```

### Request Count Limiting (limit-count)

Limit requests by count within a time window. Useful for API quota management.

```bash
# Apply count-based rate limiting
# Allows 1000 requests per hour per API key
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/7 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "quota-limited-api",
    "uri": "/quota/*",
    "upstream_id": "1",
    "plugins": {
      "key-auth": {},
      "limit-count": {
        "count": 1000,
        "time_window": 3600,
        "key_type": "var",
        "key": "consumer_name",
        "policy": "local",
        "rejected_code": 429,
        "rejected_msg": "API quota exceeded. Upgrade your plan for higher limits.",
        "show_limit_quota_header": true
      }
    }
  }'
```

### Traffic Split

Split traffic between multiple upstreams for canary deployments or A/B testing.

```bash
# Create upstreams for traffic splitting
# Production upstream (stable version)
curl -X PUT http://127.0.0.1:9180/apisix/admin/upstreams/production \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "production",
    "type": "roundrobin",
    "nodes": {"prod-server:8080": 1}
  }'

# Canary upstream (new version being tested)
curl -X PUT http://127.0.0.1:9180/apisix/admin/upstreams/canary \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "canary",
    "type": "roundrobin",
    "nodes": {"canary-server:8080": 1}
  }'
```

Create a route with traffic splitting. This example sends 90% of traffic to production and 10% to canary.

```bash
# Create route with traffic splitting for canary deployment
# 90% production, 10% canary - adjust weights as confidence grows
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/8 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "canary-route",
    "uri": "/app/*",
    "plugins": {
      "traffic-split": {
        "rules": [
          {
            "weighted_upstreams": [
              {
                "upstream_id": "production",
                "weight": 90
              },
              {
                "upstream_id": "canary",
                "weight": 10
              }
            ]
          }
        ]
      }
    }
  }'
```

### Header-Based Traffic Split

Route traffic based on request headers for more controlled rollouts.

```bash
# Route traffic based on header values
# Users with X-Canary: true header go to canary
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/9 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "header-based-canary",
    "uri": "/feature/*",
    "plugins": {
      "traffic-split": {
        "rules": [
          {
            "match": [
              {
                "vars": [["http_x_canary", "==", "true"]]
              }
            ],
            "weighted_upstreams": [
              {
                "upstream_id": "canary",
                "weight": 100
              }
            ]
          }
        ],
        "weighted_upstreams": [
          {
            "upstream_id": "production",
            "weight": 100
          }
        ]
      }
    }
  }'
```

## Observability

APISIX integrates with popular observability tools for metrics, logging, and tracing.

### Prometheus Metrics

APISIX exposes detailed metrics in Prometheus format. Enable the prometheus plugin globally for comprehensive monitoring.

```bash
# Enable Prometheus plugin globally for all routes
curl -X PUT http://127.0.0.1:9180/apisix/admin/global_rules/prometheus \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "plugins": {
      "prometheus": {
        "prefer_name": true
      }
    }
  }'
```

Configure Prometheus to scrape APISIX metrics. Add this job to your Prometheus configuration.

```yaml
# prometheus.yml - Add this scrape config for APISIX metrics
scrape_configs:
  - job_name: 'apisix'
    scrape_interval: 15s                    # How often to scrape
    metrics_path: '/apisix/prometheus/metrics'  # Metrics endpoint
    static_configs:
      - targets: ['apisix-server:9091']     # APISIX Prometheus port
    # Optional: add labels for identification
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'apisix-gateway'
```

APISIX exposes metrics including:
- `apisix_http_status`: HTTP response status counts
- `apisix_http_latency`: Request latency histograms
- `apisix_bandwidth`: Bandwidth usage
- `apisix_upstream_status`: Upstream health status
- `apisix_node_info`: APISIX node information

### HTTP Logging

Send access logs to an HTTP endpoint for centralized logging.

```bash
# Configure HTTP logging to send logs to a logging service
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/10 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "logged-route",
    "uri": "/logged/*",
    "upstream_id": "1",
    "plugins": {
      "http-logger": {
        "uri": "http://logging-service:8080/logs",
        "batch_max_size": 100,
        "max_retry_count": 3,
        "retry_delay": 2,
        "buffer_duration": 60,
        "inactive_timeout": 5,
        "concat_method": "json",
        "include_req_body": true,
        "include_resp_body": false
      }
    }
  }'
```

### Kafka Logging

For high-volume logging, send logs directly to Kafka.

```bash
# Configure Kafka logging for high-throughput log ingestion
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/11 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "kafka-logged-route",
    "uri": "/events/*",
    "upstream_id": "1",
    "plugins": {
      "kafka-logger": {
        "broker_list": {
          "kafka-1.internal:9092": 1,
          "kafka-2.internal:9092": 1,
          "kafka-3.internal:9092": 1
        },
        "kafka_topic": "apisix-access-logs",
        "key": "route_id",
        "batch_max_size": 500,
        "buffer_duration": 30,
        "max_retry_count": 3
      }
    }
  }'
```

### Distributed Tracing with Zipkin

Enable distributed tracing to track requests across services.

```bash
# Enable Zipkin tracing for distributed request tracking
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/12 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "traced-route",
    "uri": "/traced/*",
    "upstream_id": "1",
    "plugins": {
      "zipkin": {
        "endpoint": "http://zipkin:9411/api/v2/spans",
        "sample_ratio": 0.1,
        "service_name": "apisix-gateway",
        "server_addr": "apisix-node-1"
      }
    }
  }'
```

## Dashboard Installation

The APISIX Dashboard provides a web UI for managing routes, upstreams, and plugins.

### Installing Dashboard via Docker

The easiest way to run the dashboard is via Docker.

```bash
# Pull the official APISIX Dashboard image
docker pull apache/apisix-dashboard:latest

# Run the dashboard container
# Maps port 9000 and connects to your etcd instance
docker run -d \
  --name apisix-dashboard \
  -p 9000:9000 \
  -v /path/to/dashboard-config.yaml:/usr/local/apisix-dashboard/conf/conf.yaml \
  apache/apisix-dashboard:latest
```

### Dashboard Configuration

Create the dashboard configuration file. This configures the dashboard to connect to your etcd and APISIX instances.

```yaml
# /path/to/dashboard-config.yaml
# APISIX Dashboard configuration

conf:
  listen:
    host: 0.0.0.0                          # Listen on all interfaces
    port: 9000                             # Dashboard web port
  etcd:
    endpoints:                             # etcd cluster endpoints
      - "http://etcd-host:2379"
    prefix: /apisix                        # Must match APISIX prefix
    mtls:
      key_file: ""                         # TLS key for etcd (optional)
      cert_file: ""                        # TLS cert for etcd (optional)
      ca_file: ""                          # CA cert for etcd (optional)
  log:
    error_log:
      level: warn                          # Log level: debug, info, warn, error
      file_path: logs/error.log
    access_log:
      file_path: logs/access.log

authentication:
  secret: your-secret-key-change-this      # Session signing secret
  expire_time: 3600                        # Session expiration (seconds)
  users:                                   # Dashboard users
    - username: admin
      password: admin123                   # Change in production!
```

### Installing Dashboard from Package

Install the dashboard alongside APISIX for a unified setup.

```bash
# Download and install APISIX Dashboard
wget https://github.com/apache/apisix-dashboard/releases/download/v3.0.1/apisix-dashboard-3.0.1-0.el7.x86_64.rpm
sudo apt install -y alien
sudo alien -i apisix-dashboard-3.0.1-0.el7.x86_64.rpm

# Or build from source
git clone https://github.com/apache/apisix-dashboard.git
cd apisix-dashboard
make build
```

Access the dashboard at `http://your-server:9000` and log in with the configured credentials.

## SSL/TLS Configuration

Secure your API gateway with SSL/TLS certificates for HTTPS traffic.

### Adding SSL Certificates

Upload SSL certificates to APISIX for HTTPS termination.

```bash
# Add an SSL certificate for a domain
# The certificate and key should be PEM-encoded
curl -X PUT http://127.0.0.1:9180/apisix/admin/ssls/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "cert": "-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIUB...\n-----END CERTIFICATE-----",
    "key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----",
    "snis": ["api.example.com", "*.example.com"]
  }'
```

### Loading Certificates from Files

For easier management, load certificates from files using a script.

```bash
#!/bin/bash
# Script to upload SSL certificate from files

DOMAIN="api.example.com"
CERT_FILE="/etc/ssl/certs/${DOMAIN}.crt"
KEY_FILE="/etc/ssl/private/${DOMAIN}.key"
ADMIN_KEY="edd1c9f034335f136f87ad84b625c8f1"

# Read certificate and key, escaping for JSON
CERT=$(cat "$CERT_FILE" | awk '{printf "%s\\n", $0}')
KEY=$(cat "$KEY_FILE" | awk '{printf "%s\\n", $0}')

# Upload to APISIX
curl -X PUT "http://127.0.0.1:9180/apisix/admin/ssls/${DOMAIN}" \
  -H "X-API-KEY: ${ADMIN_KEY}" \
  -H 'Content-Type: application/json' \
  -d "{
    \"cert\": \"${CERT}\",
    \"key\": \"${KEY}\",
    \"snis\": [\"${DOMAIN}\", \"*.${DOMAIN}\"]
  }"
```

### Enforcing HTTPS

Redirect HTTP traffic to HTTPS using the redirect plugin.

```bash
# Create a route that redirects HTTP to HTTPS
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/https-redirect \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "https-redirect",
    "uri": "/*",
    "plugins": {
      "redirect": {
        "http_to_https": true,
        "ret_code": 301
      }
    }
  }'
```

### Let's Encrypt Integration

APISIX supports automatic certificate management with Let's Encrypt using the ACME protocol. Enable this in the configuration file.

```yaml
# Add to config.yaml for automatic SSL certificate management
apisix:
  ssl:
    enable: true
    listen:
      - port: 9443

# Enable ACME plugin for Let's Encrypt
plugins:
  - acme

# ACME (Let's Encrypt) configuration
plugin_attr:
  acme:
    # Let's Encrypt API endpoint (use staging for testing)
    api_uri: "https://acme-v02.api.letsencrypt.org/directory"
    # Your email for certificate notifications
    account_email: "admin@example.com"
    # Path for ACME challenge verification
    challenge_uri: "/.well-known/acme-challenge"
```

## Docker Compose Deployment

Deploy APISIX with all components using Docker Compose for reproducible environments.

### Complete Docker Compose Stack

This Docker Compose file sets up APISIX, etcd, and the dashboard in a production-ready configuration.

```yaml
# docker-compose.yaml
# Complete APISIX stack with etcd and dashboard

version: "3.8"

services:
  # etcd - Configuration store for APISIX
  etcd:
    image: bitnami/etcd:3.5
    container_name: apisix-etcd
    restart: unless-stopped
    environment:
      ETCD_ENABLE_V2: "true"                    # Enable v2 API for compatibility
      ALLOW_NONE_AUTHENTICATION: "yes"          # Disable auth for simplicity
      ETCD_ADVERTISE_CLIENT_URLS: "http://etcd:2379"
      ETCD_LISTEN_CLIENT_URLS: "http://0.0.0.0:2379"
    volumes:
      - etcd_data:/bitnami/etcd                 # Persist etcd data
    networks:
      - apisix-network
    healthcheck:
      test: ["CMD", "etcdctl", "endpoint", "health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # APISIX - API Gateway
  apisix:
    image: apache/apisix:3.8.0-debian
    container_name: apisix
    restart: unless-stopped
    depends_on:
      etcd:
        condition: service_healthy
    ports:
      - "9080:9080"                             # HTTP proxy port
      - "9443:9443"                             # HTTPS proxy port
      - "9180:9180"                             # Admin API port
      - "9091:9091"                             # Prometheus metrics port
    volumes:
      - ./apisix-config.yaml:/usr/local/apisix/conf/config.yaml:ro
      - ./apisix-logs:/usr/local/apisix/logs
    networks:
      - apisix-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9080/apisix/status"]
      interval: 10s
      timeout: 5s
      retries: 3

  # APISIX Dashboard - Web management UI
  dashboard:
    image: apache/apisix-dashboard:latest
    container_name: apisix-dashboard
    restart: unless-stopped
    depends_on:
      - etcd
      - apisix
    ports:
      - "9000:9000"                             # Dashboard web UI port
    volumes:
      - ./dashboard-config.yaml:/usr/local/apisix-dashboard/conf/conf.yaml:ro
    networks:
      - apisix-network

  # Example backend service for testing
  httpbin:
    image: kennethreitz/httpbin
    container_name: httpbin
    restart: unless-stopped
    networks:
      - apisix-network

volumes:
  etcd_data:
    driver: local

networks:
  apisix-network:
    driver: bridge
```

### APISIX Configuration for Docker

Create the APISIX configuration file for the Docker deployment.

```yaml
# apisix-config.yaml - Configuration for Docker deployment

apisix:
  node_listen: 9080
  enable_ipv6: false
  enable_admin: true
  admin_listen:
    ip: 0.0.0.0
    port: 9180

  ssl:
    enable: true
    listen:
      - port: 9443

deployment:
  role: traditional
  role_traditional:
    config_provider: etcd
  admin:
    admin_key:
      - name: admin
        key: edd1c9f034335f136f87ad84b625c8f1
        role: admin

etcd:
  host:
    - "http://etcd:2379"                       # Use Docker service name
  prefix: /apisix
  timeout: 30

plugin_attr:
  prometheus:
    export_addr:
      ip: "0.0.0.0"
      port: 9091

plugins:
  - api-breaker
  - basic-auth
  - consumer-restriction
  - cors
  - gzip
  - ip-restriction
  - jwt-auth
  - key-auth
  - limit-conn
  - limit-count
  - limit-req
  - prometheus
  - proxy-rewrite
  - redirect
  - request-id
  - response-rewrite
  - traffic-split
  - zipkin
  - http-logger
```

### Dashboard Configuration for Docker

Create the dashboard configuration for Docker deployment.

```yaml
# dashboard-config.yaml - Dashboard configuration for Docker

conf:
  listen:
    host: 0.0.0.0
    port: 9000
  etcd:
    endpoints:
      - "http://etcd:2379"                     # Use Docker service name
    prefix: /apisix
  log:
    error_log:
      level: warn
      file_path: logs/error.log
    access_log:
      file_path: logs/access.log

authentication:
  secret: dashboard-secret-change-in-production
  expire_time: 3600
  users:
    - username: admin
      password: admin
```

### Deploying the Stack

Deploy and manage the APISIX stack with Docker Compose.

```bash
# Create configuration files (as shown above)
mkdir -p apisix-logs

# Start the stack in detached mode
docker-compose up -d

# Check status of all services
docker-compose ps

# View logs from APISIX
docker-compose logs -f apisix

# Test the deployment
curl -i http://localhost:9080/apisix/status

# Create a test route to httpbin backend
curl -X PUT http://127.0.0.1:9180/apisix/admin/routes/test \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -H 'Content-Type: application/json' \
  -d '{
    "uri": "/get",
    "upstream": {
      "type": "roundrobin",
      "nodes": {"httpbin:80": 1}
    }
  }'

# Test the route
curl http://localhost:9080/get

# Stop the stack
docker-compose down

# Stop and remove volumes (for clean restart)
docker-compose down -v
```

## Troubleshooting

Common issues and their solutions when running APISIX.

### etcd Connection Issues

If APISIX cannot connect to etcd, check connectivity and configuration.

```bash
# Check if etcd is running and healthy
etcdctl endpoint health --endpoints=http://127.0.0.1:2379

# Check etcd member list for cluster status
etcdctl member list --endpoints=http://127.0.0.1:2379

# Verify APISIX can reach etcd (from APISIX server)
curl http://127.0.0.1:2379/health

# Check APISIX logs for etcd errors
tail -f /usr/local/apisix/logs/error.log | grep -i etcd

# If using Docker, ensure containers are on the same network
docker network inspect apisix-network
```

### Route Not Working

Debug routes that are not matching or forwarding correctly.

```bash
# List all routes to verify configuration
curl -s http://127.0.0.1:9180/apisix/admin/routes \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq .

# Check specific route details
curl -s http://127.0.0.1:9180/apisix/admin/routes/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq .

# Test route with verbose output
curl -v http://127.0.0.1:9080/your-route-path

# Check if upstream is healthy
curl -s http://127.0.0.1:9180/apisix/admin/upstreams/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq '.node.value.checks'

# View APISIX error logs
tail -100 /usr/local/apisix/logs/error.log
```

### Plugin Errors

Troubleshoot plugin configuration issues.

```bash
# Check if plugin is enabled in config.yaml
grep -A 50 "plugins:" /usr/local/apisix/conf/config.yaml

# Validate plugin configuration on a route
curl -s http://127.0.0.1:9180/apisix/admin/routes/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq '.node.value.plugins'

# Check plugin schema for correct configuration
curl -s http://127.0.0.1:9180/apisix/admin/schema/plugins/limit-req \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq .

# Look for plugin errors in logs
grep -i "plugin" /usr/local/apisix/logs/error.log | tail -50
```

### Performance Issues

Diagnose and resolve performance problems.

```bash
# Check APISIX worker processes
ps aux | grep nginx

# Monitor real-time connections and requests
curl -s http://127.0.0.1:9091/apisix/prometheus/metrics | grep apisix_http

# Check for upstream latency issues
curl -s http://127.0.0.1:9091/apisix/prometheus/metrics | grep apisix_upstream_latency

# Verify worker connections configuration
grep -A 10 "nginx_config:" /usr/local/apisix/conf/config.yaml

# Check system resources
top -bn1 | head -20
free -h
```

### Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `failed to fetch data from etcd` | etcd not reachable | Check etcd status and network connectivity |
| `no route matched` | URI doesn't match any route | Verify route URI pattern and request path |
| `upstream unavailable` | All upstream nodes unhealthy | Check backend health and health check configuration |
| `plugin not found` | Plugin not enabled | Add plugin to config.yaml plugins list |
| `invalid configuration` | Malformed route/upstream config | Validate JSON and check schema |
| `connection refused on port 9180` | Admin API not enabled | Set `enable_admin: true` in config |

### Resetting APISIX Configuration

If configuration becomes corrupted, reset to a clean state.

```bash
# WARNING: This deletes all routes, upstreams, and configurations

# Stop APISIX
sudo apisix stop

# Clear etcd data for APISIX (preserves etcd itself)
etcdctl del /apisix --prefix

# Reinitialize and start APISIX
sudo apisix init
sudo apisix start

# Verify clean state
curl -s http://127.0.0.1:9180/apisix/admin/routes \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' | jq .
```

---

Apache APISIX provides a robust, high-performance API gateway suitable for microservices architectures, serverless deployments, and traditional applications. Its dynamic configuration via etcd, extensive plugin ecosystem, and active Apache community make it an excellent choice for organizations seeking an open-source alternative to commercial API management solutions.

For production deployments, consider implementing comprehensive monitoring to track gateway health, upstream performance, and traffic patterns. **OneUptime** provides full-stack observability for APISIX deployments, including real-time metrics visualization, alerting on error rates and latency spikes, distributed tracing correlation, and status page integration to keep your users informed during incidents. With OpenTelemetry support, OneUptime can ingest APISIX metrics alongside your application telemetry for unified observability across your entire stack.
