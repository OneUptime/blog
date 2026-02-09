# How to Debug Service Mesh Data Plane Issues Using Envoy Admin Interface in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, Envoy, Debugging, Troubleshooting, Kubernetes

Description: Master the Envoy admin interface to debug service mesh data plane issues including configuration problems, connection failures, and traffic routing anomalies in production Kubernetes environments.

---

When service mesh traffic doesn't flow as expected, the Envoy admin interface is your most powerful debugging tool. It exposes the actual runtime configuration, active connections, and detailed statistics that explain exactly what's happening in the data plane.

This guide shows you how to access and interpret Envoy's admin endpoints to diagnose and resolve mesh issues quickly.

## Accessing the Envoy Admin Interface

The admin interface runs on port 15000 in Istio sidecars and port 4191 in Linkerd proxies. Access it using port forwarding:

```bash
# For Istio
kubectl port-forward -n production deploy/api-gateway 15000:15000

# For Linkerd
kubectl port-forward -n production deploy/api-gateway 4191:4191
```

Open your browser to `http://localhost:15000` (Istio) or `http://localhost:4191` (Linkerd).

Alternatively, exec into the pod:

```bash
kubectl exec -it -n production api-gateway-xxxxx -c istio-proxy -- curl localhost:15000/help
```

## Understanding Key Admin Endpoints

The admin interface provides dozens of endpoints. These are the most useful for debugging:

- `/config_dump` - Complete Envoy configuration
- `/clusters` - Upstream cluster status and health
- `/listeners` - Configured listeners and filter chains
- `/stats` - All metrics and counters
- `/server_info` - Envoy version and uptime
- `/logging` - Change log levels dynamically

## Debugging Configuration Issues

View the complete configuration:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump > config.json
```

Extract specific configuration sections:

```bash
# View listeners
jq '.configs[] | select(."@type" | contains("Listeners"))' config.json

# View clusters
jq '.configs[] | select(."@type" | contains("Clusters"))' config.json

# View routes
jq '.configs[] | select(."@type" | contains("Routes"))' config.json
```

Find why traffic to a service is failing:

```bash
# Check if cluster exists
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep "backend-service"

# View cluster configuration
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump | \
  jq '.configs[].dynamic_active_clusters[] | select(.cluster.name | contains("backend-service"))'
```

## Checking Upstream Health Status

View all cluster health:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/clusters

# Output format:
# outbound|8080||backend-service.production.svc.cluster.local::10.1.2.3:8080::health_flags::healthy
# outbound|8080||backend-service.production.svc.cluster.local::10.1.2.4:8080::health_flags::/failed_active_hc
```

Health flags indicate problems:

- `/failed_active_hc` - Active health check failed
- `/failed_outlier_check` - Outlier detection ejected the endpoint
- `/failed_eds_health` - Marked unhealthy by endpoint discovery
- `/degraded` - Endpoint is degraded

Filter unhealthy endpoints:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep -v "::healthy"
```

## Analyzing Traffic Statistics

View all statistics:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats
```

Find connection pool overflow (circuit breaking):

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"

# Non-zero values indicate circuit breaker activated
```

Check for TLS errors:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "ssl.fail"
```

Find retry statistics:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_rq_retry"
```

## Debugging Listener Configuration

View all listeners:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/listeners
```

Check if a specific port is configured:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump | \
  jq '.configs[].dynamic_listeners[] | select(.active_state.listener.address.socket_address.port_value == 8080)'
```

Examine filter chains:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump | \
  jq '.configs[].dynamic_listeners[].active_state.listener.filter_chains[].filters[]'
```

## Enabling Debug Logging

Change log level dynamically:

```bash
# Enable debug logging
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -X POST localhost:15000/logging?level=debug

# Set specific component to trace
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -X POST "localhost:15000/logging?router=trace&connection=debug"

# Reset to info
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -X POST localhost:15000/logging?level=info
```

View current log levels:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/logging
```

## Tracing Individual Requests

Enable request tracing with headers:

```bash
# Send request with trace header
kubectl exec -n production test-client -- \
  curl -H "x-envoy-force-trace: true" \
  http://api-gateway:8080/api/users
```

View active connections:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s "localhost:15000/stats?filter=downstream_cx_active"
```

## Debugging Route Matching

Check route configuration:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump | \
  jq '.configs[].dynamic_route_configs[].route_config.virtual_hosts[]'
```

Test route matching without sending real traffic:

```bash
# Simulate route lookup
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s "localhost:15000/config_dump?resource=routes" | \
  jq '.configs[].dynamic_route_configs[].route_config.virtual_hosts[] | select(.domains[] == "*")'
```

## Checking Certificate Status

View TLS certificate information:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/certs
```

Extract certificate expiration:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/certs | jq '.[].cert_chain[].days_until_expiration'
```

Verify mTLS is active:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "ssl.handshake"
```

## Resetting Statistics

Reset stats for clean testing:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -X POST localhost:15000/reset_counters
```

## Creating Debug Scripts

Automate common debugging tasks:

```bash
#!/bin/bash
# debug-envoy.sh

POD=$1
NAMESPACE=${2:-production}
CONTAINER=${3:-istio-proxy}

echo "=== Envoy Version ==="
kubectl exec -n $NAMESPACE $POD -c $CONTAINER -- \
  curl -s localhost:15000/server_info | jq .version

echo "=== Unhealthy Endpoints ==="
kubectl exec -n $NAMESPACE $POD -c $CONTAINER -- \
  curl -s localhost:15000/clusters | grep -v "::healthy" | head -10

echo "=== Circuit Breaker Stats ==="
kubectl exec -n $NAMESPACE $POD -c $CONTAINER -- \
  curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"

echo "=== TLS Errors ==="
kubectl exec -n $NAMESPACE $POD -c $CONTAINER -- \
  curl -s localhost:15000/stats | grep "ssl\." | grep -v ":0$"

echo "=== Recent 5xx Errors ==="
kubectl exec -n $NAMESPACE $POD -c $CONTAINER -- \
  curl -s localhost:15000/stats | grep "upstream_rq_5xx"
```

Run the script:

```bash
chmod +x debug-envoy.sh
./debug-envoy.sh api-gateway-xxxxx production
```

## Comparing Configurations

Compare expected vs actual configuration:

```bash
# Dump current config
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump > actual-config.json

# Generate expected config from Istio
istioctl proxy-config all api-gateway-xxxxx.production -o json > expected-config.json

# Compare
diff <(jq -S . expected-config.json) <(jq -S . actual-config.json)
```

## Debugging Sidecar Injection

Verify sidecar is running correct version:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/server_info | jq '.version'
```

Check resource limits:

```bash
kubectl get pod -n production api-gateway-xxxxx -o json | \
  jq '.spec.containers[] | select(.name=="istio-proxy") | .resources'
```

## Production Debugging Best Practices

Use port-forward instead of exposing admin interfaces externally. The admin interface has no authentication and exposes sensitive configuration.

Enable debug logging temporarily and reset to info level after investigation. Debug logging generates significant volume.

Save config dumps locally for offline analysis. The JSON is large and complex, better analyzed with jq on your workstation.

Document your findings. Create runbooks that capture common failure patterns and their admin endpoint signatures.

The Envoy admin interface provides comprehensive visibility into the data plane, making it indispensable for debugging mesh issues in production.
