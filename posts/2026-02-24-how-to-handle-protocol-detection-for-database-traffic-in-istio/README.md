# How to Handle Protocol Detection for Database Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Protocol Detection, Database, Kubernetes, Service Mesh

Description: Understanding how Istio detects protocols for database traffic and how to configure port naming, explicit protocol selection, and handle server-first protocols.

---

Protocol detection is one of the most common sources of confusion when running databases behind Istio. When Istio cannot correctly identify the protocol of your traffic, connections fail with mysterious timeout errors or get routed through the wrong filter chain. For database traffic, getting this right is essential because most databases use binary protocols that look nothing like HTTP.

This post explains how Istio's protocol detection works, why it fails for certain database protocols, and exactly how to fix it.

## How Istio Detects Protocols

When traffic arrives at an Envoy sidecar, Istio needs to figure out what protocol it is. This determines which filters and processing to apply. Istio uses three methods in this order:

1. **Explicit port naming**: If the Service port name starts with a recognized prefix (like `http-`, `grpc-`, `tcp-`, `mysql`, `redis`, `mongo`), Istio uses that as the protocol.

2. **Protocol field**: The `appProtocol` field on a Service port can specify the protocol.

3. **Automatic detection (sniffing)**: If neither of the above is set, Istio inspects the first few bytes of the connection to guess the protocol. It looks for HTTP/1.1 magic bytes, HTTP/2 preface, or TLS Client Hello.

For database traffic, method 3 (sniffing) is where things go wrong.

## Why Sniffing Fails for Databases

Protocol sniffing works by reading the first bytes a client sends. If those bytes match an HTTP or TLS pattern, Istio classifies the connection accordingly. If they do not match anything, Istio falls back to TCP after a timeout.

The problem with databases is twofold:

1. **Server-first protocols**: Some databases (MySQL, PostgreSQL, MongoDB) send data to the client before the client sends anything. The server initiates the handshake. Istio's sniffing sits on the client side waiting for client bytes, but the client is also waiting for server bytes. This causes a deadlock that eventually times out.

2. **Binary protocols**: Even for client-first database protocols, the binary bytes do not match any HTTP pattern. Istio eventually falls back to TCP, but the detection timeout (usually 10 seconds) adds latency to the first connection.

## Server-First Protocol List

These databases use server-first protocols:
- MySQL (sends greeting packet)
- PostgreSQL (not strictly server-first, but the startup sequence can be ambiguous)
- MongoDB (server responds first after client connects)
- SMTP (sends greeting)
- FTP (sends greeting)

Istio maintains a list of known server-first ports (3306 for MySQL, 5432 for PostgreSQL) and skips sniffing for those. But relying on this implicit behavior is fragile. Always use explicit port naming.

## The Fix: Explicit Port Naming

The simplest and most reliable solution is to always name your Service ports with the correct prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  ports:
    - name: tcp-mysql
      port: 3306
      targetPort: 3306
```

Here are the recognized prefixes for common databases:

| Database | Port Name | Protocol |
|----------|-----------|----------|
| PostgreSQL | `tcp-postgres` | TCP |
| MySQL | `tcp-mysql` or `mysql` | TCP |
| MongoDB | `tcp-mongo` or `mongo` | TCP |
| Redis | `tcp-redis` or `redis` | TCP |
| Cassandra | `tcp-cql` | TCP |
| Elasticsearch (API) | `http` | HTTP |
| Elasticsearch (transport) | `tcp-transport` | TCP |

The `tcp-` prefix tells Istio to use pure TCP routing with no protocol inspection. This is what you want for database traffic.

## Using appProtocol

Kubernetes 1.20+ supports the `appProtocol` field, which is another way to tell Istio the protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  ports:
    - name: mysql-port
      port: 3306
      targetPort: 3306
      appProtocol: tcp
```

This is equivalent to naming the port `tcp-mysql`. The `appProtocol` field takes precedence over port name-based detection.

## Verifying Protocol Detection

After configuring your services, verify what Istio thinks the protocol is. Use `istioctl` to inspect the proxy configuration:

```bash
istioctl proxy-config listener <app-pod> -n app --port 3306 -o json
```

Look at the filter chain. For TCP traffic, you should see:

```json
{
  "filters": [
    {
      "name": "envoy.filters.network.tcp_proxy",
      "typedConfig": {
        "@type": "type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy"
      }
    }
  ]
}
```

If you see `envoy.filters.network.http_connection_manager` instead, Istio is treating the port as HTTP, which will break database connections.

You can also check the cluster configuration:

```bash
istioctl proxy-config cluster <app-pod> -n app --fqdn mysql.database.svc.cluster.local -o json
```

## What Happens When Detection Is Wrong

When Istio misidentifies a database protocol as HTTP, you will see these symptoms:

1. Connection timeouts on the first connection attempt (the detection timeout)
2. Connection resets after the initial handshake
3. Intermittent failures where some connections work and others do not
4. Error messages in the proxy logs about malformed HTTP requests

Check the proxy logs:

```bash
kubectl logs <pod> -c istio-proxy --tail=100
```

Look for messages about "codec error" or "invalid frame" - these indicate Istio is trying to parse binary database traffic as HTTP.

## Handling Non-Standard Ports

If your database runs on a non-standard port (say PostgreSQL on port 15432), Istio will not automatically recognize it as a server-first protocol. Port naming becomes even more important:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-custom
  namespace: database
spec:
  ports:
    - name: tcp-postgres
      port: 15432
      targetPort: 15432
```

Without the `tcp-` prefix, Istio would try to sniff this port and likely fail because PostgreSQL on a non-standard port is not in the server-first port list.

## Disabling Protocol Sniffing

If you want to disable protocol sniffing entirely for a namespace, you can set all ports to TCP by default using a Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: database
spec:
  egress:
    - port:
        number: 5432
        protocol: TCP
        name: tcp-postgres
      hosts:
        - "./*"
    - port:
        number: 3306
        protocol: TCP
        name: tcp-mysql
      hosts:
        - "./*"
    - hosts:
        - "istio-system/*"
```

This explicitly declares the protocol for each port, bypassing the detection entirely.

## EnvoyFilter for Detection Timeout

If you cannot rename ports (maybe a third-party Helm chart hardcodes the port name), you can adjust the protocol detection timeout:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: protocol-detection-timeout
  namespace: istio-system
spec:
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          listener_filters_timeout: 0s
          continue_on_listener_filters_timeout: true
```

Setting `listener_filters_timeout: 0s` with `continue_on_listener_filters_timeout: true` means Istio will immediately fall back to TCP if it cannot detect the protocol. This eliminates the detection delay but means HTTP services without explicit port names will also be treated as TCP.

## Mixed Protocol Services

Some systems use both HTTP and TCP ports. Elasticsearch is a good example with HTTP on 9200 and a binary protocol on 9300:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: search
spec:
  ports:
    - name: http
      port: 9200
      targetPort: 9200
    - name: tcp-transport
      port: 9300
      targetPort: 9300
```

By naming each port correctly, Istio applies HTTP processing to port 9200 (giving you request-level metrics and routing) and TCP processing to port 9300 (just connection-level handling).

## Best Practices

1. Always use explicit port names with the correct prefix. Never rely on automatic detection for database traffic.
2. Use `tcp-` prefix for any binary protocol.
3. Verify the detected protocol with `istioctl proxy-config listener`.
4. If using Helm charts that set their own port names, use the `appProtocol` field or an EnvoyFilter override.
5. For new services, add the port name from the start. Changing it later can cause brief connection disruptions during the rollout.

Protocol detection issues are the number one cause of "Istio broke my database" complaints. The fix is almost always adding the right port name prefix. It takes ten seconds to add and saves hours of debugging.
