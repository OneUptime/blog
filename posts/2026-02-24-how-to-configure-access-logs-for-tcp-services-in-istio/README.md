# How to Configure Access Logs for TCP Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TCP, Access Logs, Envoy, Observability, Service Mesh

Description: Learn how to configure and interpret access logs for TCP services in Istio, including databases, message queues, and other non-HTTP workloads.

---

Most Istio documentation focuses on HTTP services, which makes sense since that's the majority of traffic in most meshes. But plenty of real workloads communicate over raw TCP - databases, message brokers, gRPC streams, custom binary protocols. These services need logging too, and the approach is a bit different from HTTP access logs.

## How TCP Logging Differs from HTTP

When Envoy handles HTTP traffic, it understands the full request/response cycle. It can log the HTTP method, path, status code, headers, and response timing. With TCP traffic, Envoy operates at the connection level. It sees bytes flowing in and out, connection durations, and upstream/downstream addresses, but it has no concept of individual requests within the TCP stream.

This means TCP access logs capture connection-level events rather than request-level events:

- When a TCP connection opens
- How long the connection lasts
- How many bytes were transferred
- Whether the connection was terminated cleanly
- Which upstream host handled the connection

## Enabling TCP Access Logs

TCP access logging follows the same configuration path as HTTP logging. If you've already enabled access logging at the mesh level, TCP connections are logged automatically.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

The key difference is in the log format. Envoy uses different format variables for TCP connections compared to HTTP requests.

## Custom TCP Log Format

Here's a structured JSON format tailored for TCP services:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "log_type": "tcp",
        "start_time": "%START_TIME%",
        "duration_ms": "%DURATION%",
        "bytes_received": "%BYTES_RECEIVED%",
        "bytes_sent": "%BYTES_SENT%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "upstream_local_address": "%UPSTREAM_LOCAL_ADDRESS%",
        "downstream_local_address": "%DOWNSTREAM_LOCAL_ADDRESS%",
        "downstream_remote_address": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "requested_server_name": "%REQUESTED_SERVER_NAME%",
        "response_flags": "%RESPONSE_FLAGS%",
        "connection_termination_details": "%CONNECTION_TERMINATION_DETAILS%",
        "upstream_transport_failure_reason": "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
      }
```

Note that HTTP-specific variables like `%REQ(:METHOD)%` or `%RESPONSE_CODE%` will output `-` for TCP connections. That's not an error - those fields simply don't apply to TCP traffic.

## Understanding TCP Log Entries

A typical TCP access log entry looks like this:

```json
{
  "log_type": "tcp",
  "start_time": "2026-02-24T10:30:00.000Z",
  "duration_ms": 15234,
  "bytes_received": 4096,
  "bytes_sent": 32768,
  "upstream_host": "10.244.1.25:5432",
  "upstream_cluster": "outbound|5432||postgres.database.svc.cluster.local",
  "downstream_remote_address": "10.244.0.18:48920",
  "requested_server_name": "outbound_.5432_._.postgres.database.svc.cluster.local",
  "response_flags": "-",
  "connection_termination_details": "-"
}
```

This tells you that a connection lasted about 15 seconds, transferred about 36 KB total, and connected to a PostgreSQL service. The `requested_server_name` field shows the SNI value, which Istio uses for routing in mTLS scenarios.

## Response Flags for TCP

Response flags are critical for understanding TCP connection issues. Here are the flags most relevant to TCP:

| Flag | Meaning |
|------|---------|
| `UF` | Upstream connection failure |
| `UO` | Upstream overflow (circuit breaking) |
| `NR` | No route configured |
| `URX` | Upstream retry limit exceeded |
| `UC` | Upstream connection termination |
| `DC` | Downstream connection termination |
| `LR` | Connection local reset |
| `UR` | Connection upstream reset |

When you see `UF` in a TCP log, it means Envoy couldn't establish a connection to the upstream service. This usually points to the target pod being down, a misconfigured service entry, or a network policy blocking the connection.

## Configuring TCP Logging with the Telemetry API

The Telemetry API works for TCP services too. You can set up logging specifically for TCP workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tcp-logging
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  accessLogging:
    - providers:
        - name: envoy
```

For filtering TCP logs, the CEL expression attributes available differ from HTTP. You can filter on connection-level attributes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tcp-error-logging
  namespace: database
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "connection.mtls == true"
```

## Logging for Specific TCP Services

Here are configuration examples for common TCP workloads.

### PostgreSQL/MySQL Databases

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: database-logging
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  accessLogging:
    - providers:
        - name: envoy
```

Make sure your Service resource defines the port correctly. Istio uses port naming to determine the protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  ports:
    - name: tcp-postgres
      port: 5432
      targetPort: 5432
  selector:
    app: postgres
```

The port name prefix `tcp-` tells Istio to treat this as TCP traffic. Without this naming convention, Istio might try to parse the traffic as HTTP and generate confusing logs.

### Redis

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
    - name: tcp-redis
      port: 6379
      targetPort: 6379
  selector:
    app: redis
```

### Kafka

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
spec:
  ports:
    - name: tcp-kafka
      port: 9092
      targetPort: 9092
  selector:
    app: kafka
```

## Monitoring Long-Lived TCP Connections

TCP connections for databases and message queues often stay open for minutes or hours. By default, Envoy only logs when a connection closes. This can be a problem if you want to know about active connections or detect stale connections.

You can configure periodic access log flushing with an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tcp-log-flush
  namespace: istio-system
spec:
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
            access_log_flush_interval: 30s
```

With this configuration, Envoy emits a log entry every 30 seconds for each active TCP connection, plus a final entry when the connection closes. The periodic entries show the running byte count, making it possible to monitor throughput on long-lived connections.

## Distinguishing TCP and HTTP Logs

When you have both HTTP and TCP services in the same mesh, you'll want to tell them apart in your log pipeline. There are a few approaches:

Add a static field to identify the log type:

```yaml
accessLogFormat: |
  {
    "protocol_type": "%PROTOCOL%",
    "method": "%REQ(:METHOD)%",
    "response_code": "%RESPONSE_CODE%",
    "duration_ms": "%DURATION%",
    "bytes_received": "%BYTES_RECEIVED%",
    "bytes_sent": "%BYTES_SENT%"
  }
```

For HTTP traffic, `%PROTOCOL%` outputs something like `HTTP/1.1` or `HTTP/2`. For TCP, it outputs `-`. You can use this in your log processing pipeline to route TCP and HTTP logs to different indices or apply different parsing rules.

## Troubleshooting TCP Logging Issues

If you're not seeing TCP logs at all:

```bash
# Verify the service port naming
kubectl get svc -n database -o yaml | grep -A5 ports

# Check the Envoy listener configuration
istioctl proxy-config listener <pod-name> -n database

# Verify the TCP filter chain
istioctl proxy-config listener <pod-name> -n database --port 5432 -o json
```

If logs appear but with unexpected values:

```bash
# Check if traffic is actually being treated as TCP
istioctl proxy-config cluster <pod-name> -n database | grep postgres

# Look for protocol detection issues
istioctl analyze -n database
```

A common issue is forgetting to name the port with a `tcp-` prefix. Without it, Istio defaults to opaque TCP handling, which usually works but can lead to inconsistent behavior with auto protocol detection.

## Summary

TCP access logging in Istio works at the connection level rather than the request level. Make sure your services use proper port naming conventions, configure a log format that includes TCP-relevant fields, and consider periodic log flushing for long-lived connections. The response flags in TCP logs are your best friend for diagnosing connection issues, so learn what they mean and set up alerts for the important ones like `UF` and `UO`.
