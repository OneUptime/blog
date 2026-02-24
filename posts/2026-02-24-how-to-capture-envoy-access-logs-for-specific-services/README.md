# How to Capture Envoy Access Logs for Specific Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Access Logs, Kubernetes, Observability

Description: Learn how to selectively enable and configure Envoy access logs for specific services in your Istio mesh instead of enabling them globally for all workloads.

---

Envoy access logs are incredibly useful for understanding what's happening with traffic in your mesh. They give you a per-request record showing response codes, latency, upstream info, and more. But enabling access logs globally across your entire mesh can produce a massive amount of data. If you only need to troubleshoot one or two services, it makes way more sense to enable access logs selectively.

Istio gives you a few different ways to do this, and the right approach depends on your specific situation.

## The Telemetry API Approach

Starting with Istio 1.12+, the Telemetry API is the recommended way to configure access logging. It lets you target specific workloads using label selectors.

To enable access logs for a single service:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-log-my-service
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
```

This enables access logs only for pods with the label `app: my-service` in the `my-namespace` namespace.

To apply it:

```bash
kubectl apply -f telemetry.yaml
```

No pod restart required. The configuration gets pushed to the relevant Envoy proxies automatically.

## Configuring the Log Format

The default access log format is a text-based format that can be hard to parse. You can customize it in your mesh config and then selectively enable it via the Telemetry API:

First, make sure you have a log provider configured in your mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogEncoding: JSON
    extensionProviders:
      - name: json-access-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              start_time: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              bytes_received: "%BYTES_RECEIVED%"
              bytes_sent: "%BYTES_SENT%"
              duration: "%DURATION%"
              upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
              upstream_host: "%UPSTREAM_HOST%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
              request_id: "%REQ(X-REQUEST-ID)%"
              source_ip: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
```

Then reference that provider in your Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: json-access-log
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: json-access-log
```

## Filtering Access Logs

You might not want to log every single request. Maybe you only care about errors, or requests to a specific path. The Telemetry API supports filtering:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This only logs requests that resulted in a 4xx or 5xx response code. You can use CEL (Common Expression Language) expressions in the filter.

Some other useful filter expressions:

```yaml
# Only log slow requests (over 1 second)
filter:
  expression: "duration > duration('1s')"

# Only log specific paths
filter:
  expression: "request.url_path.startsWith('/api/v2')"

# Combine conditions
filter:
  expression: "response.code >= 500 || duration > duration('5s')"
```

## Using Annotations for Per-Pod Control

If you want quick per-pod access log control without creating Telemetry resources, you can use the proxy config annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyStatsMatcher:
            inclusionPrefixes:
              - "cluster.outbound"
    spec:
      containers:
        - name: my-service
          image: my-service:v1
```

But for access logging specifically, the Telemetry API is the preferred way.

## Namespace-Level Access Logging

If you want access logs for all services in a namespace but not the entire mesh:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-access-log
  namespace: my-namespace
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Notice there's no `selector` field here. When applied to a namespace without a selector, it affects all workloads in that namespace.

## Capturing Client and Server Side Logs

By default, access logs are captured at both the client (outbound) and server (inbound) side of the proxy. You can control this with the `mode` field:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-only-logging
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
      match:
        mode: SERVER
```

Options are:
- `CLIENT_AND_SERVER` (default) - Log on both sides
- `CLIENT` - Only log outbound requests
- `SERVER` - Only log inbound requests

If you're troubleshooting from the server's perspective, `SERVER` mode cuts your log volume in half.

## Reading the Access Logs

Once access logging is enabled, you can read the logs from the istio-proxy container:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy -f
```

A default text-format access log line looks like this:

```
[2026-02-24T10:30:00.000Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 45 43 "-" "curl/7.68.0" "abc-123-def" "my-service.my-namespace.svc.cluster.local:8080" "10.0.1.5:8080" inbound|8080|| 10.0.1.3:0 10.0.1.5:8080 10.0.1.3:45678 outbound_.8080_._.my-service.my-namespace.svc.cluster.local default
```

If you enabled JSON format, it'll be much easier to parse:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy | python3 -m json.tool
```

## Disabling Access Logs for a Service

If access logs are enabled globally but you want to disable them for a noisy service:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: noisy-service
  accessLogging:
    - disabled: true
```

## Practical Tips

When you're capturing access logs for troubleshooting, a few things to keep in mind:

The response flags field is one of the most valuable pieces of information in the log. Flags like `UF` (upstream connection failure), `UH` (no healthy upstream), `NR` (no route configured), and `RL` (rate limited) tell you exactly what went wrong without having to dig through Envoy debug logs.

If you're dealing with intermittent issues, set up the Telemetry resource with a filter for error responses and leave it running. That way you're only capturing the interesting requests without the overhead of logging everything.

Always check both sides. If service A calls service B and gets an error, check the access logs on service A's outbound proxy AND service B's inbound proxy. Sometimes the story looks different from each side, and seeing both perspectives is what cracks the case.
