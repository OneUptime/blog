# How to Handle Protocol Detection for Database Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Protocol Detection, Database, Kubernetes, Service Mesh

Description: Understanding how Istio detects protocols for database traffic and how to configure port naming, explicit protocol selection, and handle server-first protocols.

---

Protocol detection is one of the most common sources of confusion when running databases behind Istio. When Istio cannot correctly identify the protocol of your traffic, connections fail with mysterious timeout errors or get routed through the wrong filter chain. For database traffic, getting this right is essential because most databases use binary protocols that look nothing like HTTP.

This post explains how Istio's protocol detection works, why it fails for certain database protocols, and exactly how to fix it.

## How Istio Detects Protocols

When traffic arrives at an Envoy sidecar, Istio needs to figure out what protocol it is. This determines which filters and processing to apply. Istio can determine the protocol in these ways:

1. **Explicit port naming**: If the Service port name follows the `name: <protocol>[-<suffix>]` convention (like `http-web`, `grpc-api`, `tcp-mysql`, `mysql`, `redis`, or `mongo`), Istio uses that as the protocol.

2. **Protocol field**: The `appProtocol` field on a Service port can specify the protocol. If both `appProtocol` and the port name are set, `appProtocol` takes precedence.

3. **Automatic detection (sniffing)**: If neither of the above is set, Istio inspects the first few bytes of the connection to detect HTTP or HTTP/2 traffic. If the protocol cannot be determined, Istio treats the connection as plain TCP.

For database traffic, method 3 (sniffing) is where things go wrong.

## Why Sniffing Fails for Databases

Protocol sniffing works by reading the first bytes a client sends. If those bytes match an HTTP pattern, Istio classifies the connection accordingly. If they do not match anything, Istio treats the connection as TCP.

The problem with databases is twofold:

1. **Server-first protocols**: Some protocols, such as MySQL, send data to the client before the client sends anything. The server initiates the handshake. Istio's sniffing sits on the client side waiting for client bytes, but the client is also waiting for server bytes. This causes a deadlock that eventually times out.

2. **Binary protocols**: Even for client-first database protocols, the binary bytes do not match any HTTP pattern. Istio eventually falls back to TCP, but the detection timeout (usually 10 seconds) adds latency to the first connection.

## Server-First Protocol List

These protocols and ports are commonly relevant to server-first handling:
- MySQL (sends greeting packet)
- MongoDB (commonly treated as a server-first port by Istio)
- SMTP (sends greeting)
- DNS over TCP (commonly treated as a server-first port by Istio)

Istio maintains a list of ports that commonly carry server-first protocols (25 for SMTP, 53 for DNS, 3306 for MySQL, and 27017 for MongoDB) and automatically assumes those ports are TCP. But relying on this implicit behavior is fragile. Always use explicit port naming.

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
| MySQL | `tcp-mysql` | TCP |
| MongoDB | `tcp-mongo` | TCP |
| Redis | `tcp-redis` | TCP |
| Cassandra | `tcp-cql` | TCP |
| Elasticsearch (API) | `http` | HTTP |
| Elasticsearch (transport) | `tcp-transport` | TCP |

The `tcp-` prefix tells Istio to use pure TCP routing with no protocol inspection. This is what you want for database traffic. Istio also recognizes `mysql`, `mongo`, and `redis` as experimental application protocol names, but unless you have explicitly enabled that protocol support, prefer `tcp-` for opaque database traffic.

## Using appProtocol

Kubernetes 1.20+ has the `appProtocol` field as stable, and Istio can use it on Kubernetes 1.18+ to select the protocol:

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

For Istio protocol selection, this is equivalent to naming the port `tcp-mysql`. The `appProtocol` field takes precedence over port name-based detection.

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

Without the `tcp-` prefix, Istio may try to sniff this port before treating it as TCP. Explicit naming avoids that ambiguity and any detection delay.

## Declaring TCP with Sidecar

If you want to constrain outbound sidecar listeners in a namespace and declare database ports as TCP, you can use a Sidecar resource:

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

This explicitly declares the protocol for those outbound listener ports. It does not replace correct Service port naming for inbound traffic.

## EnvoyFilter for Detection Timeout

If you cannot rename ports (maybe a third-party Helm chart hardcodes the port name), you can adjust the listener filter timeout:

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
          listener_filters_timeout: 100ms
          continue_on_listener_filters_timeout: true
```

Do not set `listener_filters_timeout` to `0s` when your goal is a faster fallback. In Envoy, `0s` disables the timeout. Use a small non-zero timeout if you must tune this, and test it carefully because HTTP services without explicit protocol selection may be treated as TCP.

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
