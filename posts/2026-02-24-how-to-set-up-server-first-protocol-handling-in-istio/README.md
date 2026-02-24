# How to Set Up Server First Protocol Handling in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Server First Protocol, Service Mesh, Kubernetes, TCP

Description: How to configure Istio for server-first protocols like MySQL, SMTP, and FTP where the server sends the initial data after connection establishment.

---

Most protocols you deal with daily are client-first. The client connects, sends a request, and the server responds. HTTP, gRPC, Redis - they all follow this pattern. But some protocols flip this around. The server sends the initial data after the TCP connection is established, and only then does the client respond. These are called server-first protocols, and they need special handling in Istio.

MySQL, PostgreSQL, SMTP, FTP, and SSH are all examples of server-first protocols. Getting them to work properly through Istio's sidecar proxy requires understanding why the default behavior breaks and what configuration fixes it.

## Why Server-First Protocols Break

Istio's Envoy sidecar uses protocol detection (sniffing) to determine what kind of traffic is flowing through a connection. The sniffer works by reading the first few bytes from the client. Based on those bytes, it decides whether the traffic is HTTP or something else.

For server-first protocols, here's the problem:

1. Client opens a TCP connection to the server
2. Envoy intercepts the connection and waits for the client to send data so it can sniff the protocol
3. The server also waits to send its greeting until the connection is established
4. Envoy buffers the connection, waiting for client data that won't come until the server speaks first
5. After the protocol detection timeout (default 100ms), Envoy gives up sniffing and falls back to TCP

In the best case, you get a 100ms delay on every new connection. In the worst case, if the timeout isn't generous enough or there are other factors, the connection can fail entirely.

## Explicit Protocol Configuration

The fix is to tell Istio the protocol explicitly so it never tries to sniff. For well-known server-first protocols, use the appropriate port naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-service
  namespace: default
spec:
  selector:
    app: mysql
  ports:
    - name: mysql
      port: 3306
      targetPort: 3306
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: default
spec:
  selector:
    app: postgres
  ports:
    - name: tcp-postgres
      port: 5432
      targetPort: 5432
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: smtp-service
  namespace: default
spec:
  selector:
    app: smtp
  ports:
    - name: tcp-smtp
      port: 25
      targetPort: 25
```

For MySQL and MongoDB, Istio recognizes their specific protocol prefixes (`mysql`, `mongo`). For all other server-first protocols, use the `tcp` prefix. This tells Istio to handle the traffic as raw TCP without any protocol sniffing.

## Adjusting Protocol Detection Timeout

If you can't change port names (maybe the service is managed by someone else, or a Helm chart hardcodes the names), you can adjust the protocol detection timeout globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    protocolDetectionTimeout: 0s
```

Setting it to `0s` disables protocol sniffing entirely. All ports without explicit protocol configuration will be treated as TCP. This eliminates the delay for server-first protocols but also means Istio won't auto-detect HTTP for ports that aren't explicitly labeled.

A middle ground is to increase the timeout to give the server time to send its greeting:

```yaml
meshConfig:
  protocolDetectionTimeout: 5s
```

But this is not recommended because it means every non-labeled port has a 5-second delay on the first connection while Envoy waits for data.

## Per-Workload Configuration

You can configure protocol detection behavior per workload using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: default
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: ""
        traffic.sidecar.istio.io/includeInboundPorts: "5432"
```

Or to exclude specific ports from sidecar interception entirely:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "5432"
```

Excluding a port from sidecar interception means traffic on that port bypasses Envoy completely. You lose all Istio features (mTLS, observability, authorization) for that port, but the server-first protocol works without any issues.

This is a trade-off. If you absolutely need mTLS and authorization for your database port, don't exclude it. Instead, configure the protocol explicitly.

## Handling Multiple Server-First Services

If you have several server-first services in your cluster, a systematic approach helps:

```yaml
# PostgreSQL
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: databases
spec:
  ports:
    - name: tcp-pg
      port: 5432
      targetPort: 5432
---
# SMTP relay
apiVersion: v1
kind: Service
metadata:
  name: smtp-relay
  namespace: mail
spec:
  ports:
    - name: tcp-smtp
      port: 25
      targetPort: 25
    - name: tcp-smtps
      port: 465
      targetPort: 465
    - name: tcp-submission
      port: 587
      targetPort: 587
---
# FTP server
apiVersion: v1
kind: Service
metadata:
  name: ftp-server
  namespace: storage
spec:
  ports:
    - name: tcp-ftp
      port: 21
      targetPort: 21
    - name: tcp-ftpdata
      port: 20
      targetPort: 20
```

Each port gets the `tcp` prefix. This is simple, reliable, and works across all server-first protocols.

## External Server-First Services

For external server-first services, create ServiceEntries with explicit protocol:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
  namespace: default
spec:
  hosts:
    - postgres.external.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-smtp
  namespace: default
spec:
  hosts:
    - smtp.sendgrid.net
  location: MESH_EXTERNAL
  ports:
    - number: 587
      name: tcp-submission
      protocol: TCP
  resolution: DNS
```

The `protocol: TCP` in the ServiceEntry ports section ensures the sidecar treats this as TCP without sniffing.

## Connection Timeouts and Keepalives

Server-first protocol connections are often long-lived. Database connections are pooled, SMTP sessions can be kept open for multiple messages. Configure appropriate timeouts:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-dr
  namespace: default
spec:
  host: postgresql.databases.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        tcpKeepalive:
          time: 600s
          interval: 75s
          probes: 9
```

The connect timeout is how long Envoy waits for the TCP handshake to complete. The keepalive settings detect dead connections. For database connections that might sit idle in a pool, keepalives prevent silent disconnects.

## Verifying Protocol Handling

After configuring your services, verify that Istio is handling the protocol correctly:

```bash
# Check the listener config for the port
istioctl proxy-config listener <pod-name> -n default --port 5432 -o json
```

In the JSON output, look for the filter chain. You should see:

- `envoy.filters.network.tcp_proxy` for TCP handling (correct for server-first)
- NOT `envoy.filters.network.http_connection_manager` (this would mean HTTP sniffing is active)

```bash
# Check that the service description shows the right protocol
istioctl x describe service postgresql -n databases
```

## Testing Connection Behavior

Test that connections work without delays:

```bash
# Time a connection to the server-first service
time kubectl exec -it <client-pod> -n default -- \
  bash -c "echo | nc postgresql.databases.svc.cluster.local 5432"
```

If the connection establishes quickly (under 100ms), the protocol is configured correctly. If it takes around 100ms or more, protocol sniffing might be kicking in.

You can also check the sidecar logs for connection events:

```bash
kubectl logs <client-pod> -c istio-proxy -n default --tail=50 | grep 5432
```

Server-first protocols in Istio come down to one thing: don't let the sidecar try to sniff them. Name your ports with the `tcp` prefix (or the specific protocol prefix for MySQL and MongoDB), and you're good. Every server-first protocol issue I've seen in production came back to missing or incorrect port naming.
