# How to Use istioctl proxy-config log for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Istioctl, Envoy, Logging, Kubernetes

Description: How to dynamically adjust Envoy proxy log levels with istioctl proxy-config log to debug traffic issues in Istio without restarting pods.

---

When you need to understand what is happening inside the Envoy proxy at a low level, adjusting the log level is often the most direct path to an answer. By default, Istio configures Envoy with `warning` level logging, which hides most of the detailed processing information. The `istioctl proxy-config log` command lets you increase the log verbosity on a running proxy without restarting it, so you can get detailed debug output exactly when you need it and turn it off when you are done.

## Viewing Current Log Levels

Check what log levels are currently set:

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo
```

Output:

```text
active loggers:
  admin: warning
  alternate_protocols_cache: warning
  aws: warning
  cache_filter: warning
  client: warning
  config: warning
  connection: warning
  conn_handler: warning
  decompression: warning
  dns: warning
  dubbo: warning
  envoy_bug: warning
  ext_authz: warning
  ext_proc: warning
  file: warning
  filter: warning
  forward_proxy: warning
  grpc: warning
  hc: warning
  health_checker: warning
  http: warning
  http2: warning
  init: warning
  io: warning
  jwt: warning
  kafka: warning
  lua: warning
  main: warning
  misc: warning
  mongo: warning
  pool: warning
  quic: warning
  quic_stream: warning
  rbac: warning
  redis: warning
  router: warning
  runtime: warning
  secret: warning
  tap: warning
  testing: warning
  thrift: warning
  tracing: warning
  upstream: warning
  udp: warning
  wasm: warning
```

Each logger corresponds to a different subsystem of Envoy.

## Setting Log Levels

### Set All Loggers to Debug

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo --level debug
```

This is the nuclear option. It will produce a massive amount of output. Only use this when you have no idea where the problem is and need to see everything.

### Set Specific Loggers

For targeted debugging, set only the relevant loggers to debug:

```bash
# Debug HTTP routing
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level http:debug,router:debug,connection:debug

# Debug mTLS/TLS
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level secret:debug,connection:debug,conn_handler:debug

# Debug authorization (RBAC)
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level rbac:debug,http:debug

# Debug upstream connectivity
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level upstream:debug,pool:debug,connection:debug

# Debug gRPC
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level grpc:debug,http2:debug,connection:debug

# Debug config updates from istiod
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level config:debug,init:debug
```

### Available Log Levels

From least to most verbose:
- `off`: No logging
- `critical`: Only critical errors
- `error`: Errors
- `warning`: Warnings (default)
- `info`: Informational messages
- `debug`: Detailed debug output
- `trace`: Maximum verbosity (very noisy)

## Debugging Scenarios

### Scenario 1: Request Routing Issues

When requests are going to the wrong backend:

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level router:debug,http:debug
```

Now watch the logs:

```bash
kubectl logs productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -f --tail=100
```

With router debug enabled, you will see detailed output for every request showing:
- Which route matched
- What cluster the request was routed to
- Whether retries were attempted
- What response code the upstream returned

Example log lines:

```text
[debug][router] router_rq_route_config_update: 9080
[debug][router] route match for request path '/productpage' method 'GET'
[debug][router] cluster 'outbound|9080||reviews.bookinfo.svc.cluster.local' match
[debug][router] upstream request headers: ...
```

### Scenario 2: Connection Failures

When connections to upstream services are failing:

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level connection:debug,upstream:debug,pool:debug
```

```bash
kubectl logs productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -f --tail=100
```

You will see connection establishment, pooling, and failure details:

```text
[debug][connection] connecting to 10.244.0.17:9080
[debug][connection] connection established
[debug][pool] creating new connection to cluster
[debug][upstream] health check response received
```

### Scenario 3: mTLS Handshake Problems

When TLS handshakes are failing between services:

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --level secret:debug,connection:debug
```

```bash
kubectl logs productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -f --tail=100
```

You will see certificate loading and TLS negotiation details:

```text
[debug][secret] loaded certificate chain from SDS
[debug][connection] TLS handshake: cipher=TLS_AES_256_GCM_SHA384
[debug][secret] certificate is valid: serial=abc123, expires=2026-02-25
```

### Scenario 4: Authorization Policy Issues

When requests are being denied unexpectedly:

```bash
istioctl proxy-config log reviews-v1-5984b4b776-7kqvz.bookinfo \
  --level rbac:debug,http:debug
```

Note: authorization is enforced on the server side, so set the log level on the destination pod, not the source.

```bash
kubectl logs reviews-v1-5984b4b776-7kqvz -c istio-proxy -n bookinfo -f --tail=100
```

You will see RBAC evaluation details:

```text
[debug][rbac] checking request: path=/reviews/0, method=GET
[debug][rbac] policy ns[bookinfo]-policy[allow-productpage]-rule[0]: matched
[debug][rbac] decision: ALLOW
```

## Reset Log Levels When Done

After debugging, always reset log levels back to warning to avoid performance degradation and log volume issues:

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo --level warning
```

Confirm they are reset:

```bash
istioctl proxy-config log productpage-v1-6b746f74dc-9rlmh.bookinfo | head -5
```

## Performance Impact of Debug Logging

Debug logging has a real performance impact. Each log statement requires CPU time and I/O. In high-traffic services, setting all loggers to debug can:

- Increase CPU usage by 10-30%
- Generate gigabytes of log data per hour
- Increase latency due to synchronous log writes

That is why you should:
1. Only enable debug on specific loggers you need
2. Keep debug enabled for the minimum time necessary
3. Reset to warning when done
4. Avoid enabling debug on production pods handling real traffic unless absolutely necessary

## Batch Log Level Changes

Set log levels on multiple pods at once using a loop:

```bash
for pod in $(kubectl get pods -n bookinfo -l app=reviews -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'); do
  istioctl proxy-config log ${pod}.bookinfo --level router:debug,http:debug
done
```

And reset them all:

```bash
for pod in $(kubectl get pods -n bookinfo -l app=reviews -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'); do
  istioctl proxy-config log ${pod}.bookinfo --level warning
done
```

The `proxy-config log` command is one of the most powerful debugging tools in the Istio toolkit because it gives you real-time visibility into what the proxy is doing at any level of detail. The ability to change log levels without restarting means you can debug production issues without disrupting the running service.
