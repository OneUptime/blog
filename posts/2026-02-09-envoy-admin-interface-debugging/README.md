# How to Implement Envoy Admin Interface for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Debugging, Observability, Admin API, Troubleshooting

Description: Master the Envoy admin interface to debug configuration issues, inspect runtime stats, modify log levels, and troubleshoot proxy behavior in production environments.

---

The Envoy admin interface is your primary debugging and operational tool for understanding what's happening inside an Envoy instance. This HTTP API exposes runtime configuration, statistics, logging controls, health status, and diagnostic endpoints that help troubleshoot issues without restarting the proxy or modifying configuration files.

Understanding how to use the admin interface effectively dramatically reduces mean time to resolution for production issues. You can inspect active connections, view cluster health, adjust log verbosity on the fly, dump configuration, and even drain connections for graceful shutdowns. The admin interface is so powerful that you must secure it properly to prevent unauthorized access to sensitive operational data.

## Basic Admin Interface Configuration

Let's configure the admin interface with proper security:

```yaml
# envoy-admin-config.yaml
admin:
  address:
    socket_address:
      address: 127.0.0.1  # Bind to localhost only
      port_value: 9901
  # Access log for admin requests
  access_log:
  - name: envoy.access_loggers.file
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
      path: "/var/log/envoy/admin_access.log"
      format: "[%START_TIME%] \"%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%\" %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)% \"%REQ(USER-AGENT)%\"\n"

static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_service
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend
                port_value: 8000
    connect_timeout: 1s
```

The admin interface is now accessible at `http://127.0.0.1:9901`.

## Essential Admin Endpoints

### Viewing Configuration

```bash
# Dump the entire configuration
curl http://localhost:9901/config_dump

# Get configuration in JSON format
curl http://localhost:9901/config_dump?format=json | jq .

# View only static configuration
curl http://localhost:9901/config_dump | jq '.configs[] | select(.["@type"] == "type.googleapis.com/envoy.admin.v3.BootstrapConfigDump")'

# View dynamic clusters
curl http://localhost:9901/config_dump | jq '.configs[] | select(.["@type"] == "type.googleapis.com/envoy.admin.v3.ClustersConfigDump")'

# View listeners
curl http://localhost:9901/config_dump | jq '.configs[] | select(.["@type"] == "type.googleapis.com/envoy.admin.v3.ListenersConfigDump")'

# View routes
curl http://localhost:9901/config_dump | jq '.configs[] | select(.["@type"] == "type.googleapis.com/envoy.admin.v3.RoutesConfigDump")'
```

### Checking Cluster Status

```bash
# View all clusters and their health
curl http://localhost:9901/clusters

# Get cluster info in JSON
curl http://localhost:9901/clusters?format=json

# Check specific cluster
curl http://localhost:9901/clusters?format=json | jq '.cluster_statuses[] | select(.name == "backend_service")'

# View only unhealthy endpoints
curl http://localhost:9901/clusters | grep -A 5 "health_flags"
```

### Statistics and Metrics

```bash
# View all statistics
curl http://localhost:9901/stats

# Get stats in Prometheus format
curl http://localhost:9901/stats/prometheus

# Filter stats by prefix
curl http://localhost:9901/stats?filter=cluster.backend

# Get only changed stats (usefull for debugging)
curl http://localhost:9901/stats?usedonly

# View histogram statistics
curl http://localhost:9901/stats?histogram_buckets=cumulative

# Reset all counters
curl -X POST http://localhost:9901/reset_counters
```

### Runtime Parameters

```bash
# View all runtime parameters
curl http://localhost:9901/runtime

# Modify runtime parameter (requires admin access)
curl -X POST http://localhost:9901/runtime_modify?key=health_check.min_interval&value=10000
```

### Logging Control

```bash
# View current log levels
curl http://localhost:9901/logging

# Set global log level to debug
curl -X POST http://localhost:9901/logging?level=debug

# Set specific logger to trace
curl -X POST "http://localhost:9901/logging?logger=connection&level=trace"

# Common loggers:
# - connection: connection events
# - router: routing decisions
# - upstream: upstream connection events
# - http: HTTP processing
# - filter: filter chain execution
```

## Advanced Debugging Techniques

### Connection Draining

Gracefully drain connections before shutdown:

```bash
# Start draining connections
curl -X POST http://localhost:9901/drain_listeners?inboundonly

# Check drain status
curl http://localhost:9901/server_info
```

### Health Check Override

Manually fail or pass health checks:

```bash
# Fail health checks (take out of load balancer)
curl -X POST http://localhost:9901/healthcheck/fail

# Pass health checks (add back to load balancer)
curl -X POST http://localhost:9901/healthcheck/ok

# Check current health check status
curl http://localhost:9901/ready
```

### Certificate Information

View TLS certificate details:

```bash
# View all certificates
curl http://localhost:9901/certs

# Get certificate info in JSON
curl http://localhost:9901/certs?format=json | jq .
```

### Memory Usage

Check memory allocation:

```bash
# View memory stats
curl http://localhost:9901/memory

# View detailed heap profile (if compiled with tcmalloc)
curl http://localhost:9901/heap_dump
```

## Building a Debug Dashboard

Create a simple HTML dashboard for common operations:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Envoy Debug Dashboard</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        .section { margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; }
        button { margin: 5px; padding: 10px; cursor: pointer; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Envoy Debug Dashboard</h1>

    <div class="section">
        <h2>Cluster Health</h2>
        <button onclick="loadClusters()">Refresh Clusters</button>
        <pre id="clusters"></pre>
    </div>

    <div class="section">
        <h2>Statistics</h2>
        <button onclick="loadStats()">Refresh Stats</button>
        <input type="text" id="statFilter" placeholder="Filter (e.g., cluster.backend)">
        <pre id="stats"></pre>
    </div>

    <div class="section">
        <h2>Logging Control</h2>
        <button onclick="setLogLevel('debug')">Set Debug</button>
        <button onclick="setLogLevel('info')">Set Info</button>
        <button onclick="setLogLevel('warning')">Set Warning</button>
        <button onclick="setLogLevel('error')">Set Error</button>
        <pre id="logLevel"></pre>
    </div>

    <div class="section">
        <h2>Health Check Control</h2>
        <button onclick="healthCheckFail()">Fail Health Check</button>
        <button onclick="healthCheckPass()">Pass Health Check</button>
        <pre id="healthStatus"></pre>
    </div>

    <script>
        const adminUrl = 'http://localhost:9901';

        async function loadClusters() {
            const response = await fetch(`${adminUrl}/clusters`);
            const text = await response.text();
            document.getElementById('clusters').textContent = text;
        }

        async function loadStats() {
            const filter = document.getElementById('statFilter').value;
            const url = filter ? `${adminUrl}/stats?filter=${filter}` : `${adminUrl}/stats`;
            const response = await fetch(url);
            const text = await response.text();
            document.getElementById('stats').textContent = text;
        }

        async function setLogLevel(level) {
            const response = await fetch(`${adminUrl}/logging?level=${level}`, {
                method: 'POST'
            });
            const text = await response.text();
            document.getElementById('logLevel').textContent = `Log level set to: ${level}`;
        }

        async function healthCheckFail() {
            await fetch(`${adminUrl}/healthcheck/fail`, { method: 'POST' });
            document.getElementById('healthStatus').textContent = 'Health check set to FAIL';
        }

        async function healthCheckPass() {
            await fetch(`${adminUrl}/healthcheck/ok`, { method: 'POST' });
            document.getElementById('healthStatus').textContent = 'Health check set to PASS';
        }
    </script>
</body>
</html>
```

## Securing the Admin Interface

The admin interface exposes sensitive operational data. Secure it properly:

```yaml
# Method 1: Bind to localhost and use SSH port forwarding
admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901

# Then access via SSH tunnel:
# ssh -L 9901:localhost:9901 user@envoy-host
# curl http://localhost:9901/stats
```

For Kubernetes deployments, use kubectl port-forward:

```bash
# Port forward to Envoy pod
kubectl port-forward pod/envoy-pod 9901:9901

# Then access locally
curl http://localhost:9901/stats
```

```yaml
# Method 2: Add authentication with external auth filter
listeners:
- name: admin_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: admin_http
        codec_type: AUTO
        route_config:
          name: admin_route
          virtual_hosts:
          - name: admin
            domains: ["*"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: admin_backend
        http_filters:
        # Add external authentication
        - name: envoy.filters.http.ext_authz
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
            http_service:
              server_uri:
                uri: "http://auth-service:8080"
                cluster: auth_service
                timeout: 0.5s
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Troubleshooting Common Issues

### Problem: Requests timing out

```bash
# Check upstream connection stats
curl http://localhost:9901/stats | grep -E 'upstream_rq_timeout|upstream_cx_connect_timeout'

# View cluster status
curl http://localhost:9901/clusters | grep -A 10 "backend_service"

# Check if circuit breakers are triggering
curl http://localhost:9901/stats | grep overflow

# Enable debug logging for router
curl -X POST "http://localhost:9901/logging?logger=router&level=debug"

# Check logs for routing decisions
tail -f /var/log/envoy/envoy.log | grep router
```

### Problem: 503 errors

```bash
# Check for upstream failures
curl http://localhost:9901/stats | grep -E '5xx|upstream_rq_error'

# View unhealthy endpoints
curl http://localhost:9901/clusters | grep -B 2 "health_flags"

# Check outlier detection
curl http://localhost:9901/stats | grep outlier_detection
```

### Problem: High memory usage

```bash
# View memory stats
curl http://localhost:9901/memory

# Check connection counts
curl http://localhost:9901/stats | grep -E 'downstream_cx_active|upstream_cx_active'

# Review buffer limits
curl http://localhost:9901/config_dump | jq '.configs[0].bootstrap.static_resources.listeners[].per_connection_buffer_limit_bytes'
```

## Best Practices

1. **Bind to localhost**: Never expose admin interface to public networks
2. **Use port forwarding**: Access admin interface via SSH or kubectl
3. **Monitor access logs**: Track who accesses admin endpoints
4. **Use filters with stats**: Avoid dumping all stats in production
5. **Adjust log levels temporarily**: Return to info/warning after debugging
6. **Automate health with scripts**: Use admin API in deployment automation
7. **Document admin workflows**: Create runbooks for common debugging scenarios

The Envoy admin interface is an indispensable tool for operating Envoy in production. Master these endpoints and techniques to quickly diagnose and resolve issues without disrupting traffic.
