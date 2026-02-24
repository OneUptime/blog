# How to Configure Component Logging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Logging, Envoy, Istiod, Debugging, Kubernetes

Description: A comprehensive guide to configuring logging for Istio components including Istiod, Envoy sidecars, and gateways to troubleshoot mesh issues.

---

When something goes wrong in Istio, logs are your first line of defense. But Istio has several components, each with its own logging system. Istiod has Go-based structured logging with scopes. Envoy has its own logging system with different categories. And they're configured differently. Knowing how to turn up the right logging at the right time saves hours of guessing.

## Istiod Logging

Istiod uses a scope-based logging system. Each scope covers a specific area of functionality, and you can set log levels independently.

### Setting Log Levels at Install Time

You can configure Istiod log levels through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: PILOT_LOG_LEVEL
          value: "default:info,ads:debug,networking:debug"
```

The format is `scope:level,scope:level`. Available levels are `debug`, `info`, `warn`, `error`, and `none`.

Or with istioctl:

```bash
istioctl install --set values.pilot.env.PILOT_LOG_LEVEL="default:info,ads:debug"
```

### Changing Log Levels at Runtime

You don't need to restart Istiod to change log levels. Use the ControlZ API on port 9876:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s -X PUT "localhost:9876/scopej/ads" \
  -d '{"name":"ads","outputLevel":"debug"}'
```

Or use istioctl:

```bash
istioctl admin log --level ads:debug,networking:debug
```

To see all available scopes and their current levels:

```bash
istioctl admin log
```

Output:

```
active scopes:
  ads                 info
  authorization       info
  default             info
  grpcAdapter         info
  model               info
  networking          info
  security            info
  serviceentry        info
  validation          info
```

### Key Istiod Scopes

Here's when to use each scope:

**ads** - Turn this up when proxies aren't getting config updates. It shows xDS push details, what config is being sent to which proxy, and connection management.

**networking** - Use this for VirtualService, DestinationRule, and Gateway issues. It shows how Istio translates high-level config into Envoy config.

**security** - For mTLS and certificate issues. Shows certificate signing, distribution, and authentication decisions.

**model** - For service discovery problems. Shows how Istio builds its internal model of services and endpoints from Kubernetes.

**authorization** - For RBAC and AuthorizationPolicy issues. Shows policy evaluation decisions.

## Envoy Sidecar Logging

The Envoy proxy in each sidecar has its own logging independent of Istiod.

### Setting Envoy Log Level

Set the log level for a specific proxy:

```bash
istioctl proxy-config log <pod-name>.<namespace> --level debug
```

For example:

```bash
istioctl proxy-config log httpbin-abc123.default --level debug
```

This sets all Envoy loggers to debug level. Be careful with this in production as it generates a massive amount of logs.

You can target specific Envoy loggers:

```bash
istioctl proxy-config log httpbin-abc123.default --level http:debug,router:debug,connection:debug
```

Common Envoy loggers:

- **http** - HTTP connection manager, request/response processing
- **router** - Routing decisions, upstream selection
- **connection** - TCP connection lifecycle
- **upstream** - Upstream cluster connections
- **filter** - Filter chain processing
- **config** - Configuration updates from Istiod
- **lua** - Lua filter execution
- **wasm** - WebAssembly filter execution
- **jwt** - JWT authentication
- **rbac** - Role-based access control

### Setting Log Level at Pod Creation

You can set the default Envoy log level through pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyStatsMatcher:
            inclusionRegexps:
            - ".*"
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin
```

Or set it globally through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_LOG_LEVEL: "debug"
```

### Viewing Envoy Logs

Envoy sidecar logs go to stdout/stderr of the istio-proxy container:

```bash
kubectl logs httpbin-abc123 -c istio-proxy -n default --tail=100
```

Follow the logs in real time:

```bash
kubectl logs httpbin-abc123 -c istio-proxy -n default -f
```

### Enabling Access Logs

Access logs show every request passing through the proxy. Enable them mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
```

Or with istioctl:

```bash
istioctl install --set meshConfig.accessLogFile=/dev/stdout
```

You can also use the Telemetry API for more control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

To enable access logging for just one namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: production
spec:
  accessLogging:
  - providers:
    - name: envoy
```

### Customizing Access Log Format

The default access log format includes basic request info. You can customize it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
      "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
      "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%"
      "%UPSTREAM_HOST%" %UPSTREAM_CLUSTER%
      %UPSTREAM_LOCAL_ADDRESS% %DOWNSTREAM_LOCAL_ADDRESS%
      %DOWNSTREAM_REMOTE_ADDRESS% %REQUESTED_SERVER_NAME%
      %ROUTE_NAME%
```

Or use JSON format for easier parsing by log aggregators:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

## Gateway Logging

Istio ingress and egress gateways use the same Envoy proxy, so logging works the same way:

```bash
# Set gateway log level
istioctl proxy-config log istio-ingressgateway-abc123.istio-system --level debug

# View gateway logs
kubectl logs -n istio-system deployment/istio-ingressgateway --tail=100
```

For gateway access logs, the mesh-wide `accessLogFile` setting applies to gateways too. But you can also use the Telemetry API with a workload selector:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: gateway-logging
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  accessLogging:
  - providers:
    - name: envoy
```

## Practical Tips

**Don't leave debug logging on.** Debug-level logs in both Istiod and Envoy generate enormous volume. Turn it on to diagnose an issue, then turn it back to info:

```bash
# Reset Istiod
istioctl admin log --level default:info

# Reset a proxy
istioctl proxy-config log httpbin-abc123.default --level warning
```

**Use targeted logging.** Instead of setting everything to debug, enable debug only on the specific scope or logger that covers your issue. If you're debugging routing, use `networking` in Istiod and `router` in Envoy.

**Check response flags.** In Envoy access logs, the response flags field tells you why a request failed:

- `UH` - No healthy upstream hosts
- `UF` - Upstream connection failure
- `UO` - Upstream overflow (circuit breaker)
- `NR` - No route configured
- `URX` - Upstream retry limit exceeded
- `DC` - Downstream connection termination

These flags are often enough to diagnose the issue without even enabling debug logging.

**Correlate with request IDs.** Istio adds `x-request-id` headers to all requests. Use this to trace a single request across multiple services in the logs:

```bash
kubectl logs httpbin-abc123 -c istio-proxy | grep "request-id-value"
```

## Summary

Istio gives you fine-grained control over logging at every level. The key is knowing which component and scope to target. Start with Istiod logging scopes for control plane issues, Envoy loggers for data plane issues, and access logs for request-level visibility. Always remember to dial logging back down after you've found the problem.
