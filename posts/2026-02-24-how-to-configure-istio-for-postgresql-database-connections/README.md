# How to Configure Istio for PostgreSQL Database Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PostgreSQL, Service Mesh, Kubernetes, Database, TCP Traffic

Description: A practical guide to configuring Istio service mesh to handle PostgreSQL database connections in Kubernetes clusters with proper TCP routing and mTLS.

---

Running PostgreSQL inside Kubernetes is pretty common these days. But once you throw Istio into the mix, things can get tricky. PostgreSQL uses a binary protocol over TCP, not HTTP, so the default Istio configurations that work great for REST APIs and gRPC services won't cut it here.

The good news is that Istio handles TCP traffic just fine - you just need to configure it correctly. This post walks through everything you need to get PostgreSQL working smoothly behind an Istio sidecar.

## Why Istio Matters for Database Connections

Even if your database traffic is internal, Istio provides mutual TLS (mTLS) encryption between your application pods and your PostgreSQL pods. That means your database credentials and query data are encrypted in transit without any application code changes. You also get connection telemetry, access policies, and traffic management features.

## Deploying PostgreSQL with Istio Sidecar

First, make sure your PostgreSQL deployment has Istio sidecar injection enabled. If you have namespace-level injection, your pods will automatically get a sidecar. Here is a basic PostgreSQL deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
  namespace: database
  labels:
    app: postgresql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
        - name: postgresql
          image: postgres:16
          ports:
            - containerPort: 5432
              name: tcp-postgres
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
```

Notice the port name: `tcp-postgres`. This is critical. Istio uses the port name prefix to determine the protocol. For PostgreSQL, you must use the `tcp-` prefix so Istio treats it as raw TCP traffic instead of trying to parse it as HTTP.

Create the corresponding Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: database
spec:
  selector:
    app: postgresql
  ports:
    - name: tcp-postgres
      port: 5432
      targetPort: 5432
      protocol: TCP
```

## Configuring a DestinationRule for PostgreSQL

A DestinationRule lets you control how Istio manages connections to your PostgreSQL service. You can configure connection pool settings and TLS mode:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgresql
  namespace: database
spec:
  host: postgresql.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
    tls:
      mode: ISTIO_MUTUAL
```

The `maxConnections` setting caps the number of TCP connections to the destination service. The `connectTimeout` sets how long to wait when establishing new connections. The `ISTIO_MUTUAL` TLS mode means Istio handles mTLS automatically using its own certificates.

## Setting Up a VirtualService for TCP Routing

If you need fine-grained routing control, you can use a VirtualService with TCP route matching:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: postgresql
  namespace: database
spec:
  hosts:
    - postgresql.database.svc.cluster.local
  tcp:
    - match:
        - port: 5432
      route:
        - destination:
            host: postgresql.database.svc.cluster.local
            port:
              number: 5432
```

This is a straightforward pass-through route. It becomes more useful when you have different PostgreSQL endpoints or subsets and want to route TCP connections between them. Istio cannot inspect PostgreSQL queries, so read/write splitting still needs to happen in your application or in a PostgreSQL-aware proxy.

## Handling External PostgreSQL (Outside the Mesh)

If your PostgreSQL instance lives outside the Kubernetes cluster - say, on Amazon RDS or a bare metal server - you need a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgresql
  namespace: database
spec:
  hosts:
    - my-postgres.example.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

If your external PostgreSQL database requires SSL, configure it in the PostgreSQL client, for example with `sslmode=require`, `sslmode=verify-ca`, or `sslmode=verify-full`. A normal PostgreSQL SSL connection starts with PostgreSQL's own SSL negotiation before TLS begins, so do not add a `DestinationRule` with `tls.mode: SIMPLE` unless the upstream endpoint expects TLS from the first byte, such as a TLS proxy or a direct-TLS setup.

## Dealing with Connection Timeouts

PostgreSQL connections can be long-lived, especially with connection pooling. Istio's default TCP idle timeout is one hour, and the sidecar may close idle connections after that. You can configure idle timeouts to match your PostgreSQL and connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgresql
  namespace: database
spec:
  host: postgresql.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        idleTimeout: 3600s
```

Setting `idleTimeout` to 3600 seconds keeps the documented one-hour default explicit. If your application keeps idle pooled connections longer than that, set a higher value or disable the timeout with `0s`, and make sure your PostgreSQL server timeouts and connection pool idle timeout settings are aligned.

## PeerAuthentication for Database Namespace

If you want to enforce strict mTLS for all database traffic, apply a PeerAuthentication policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: database-mtls
  namespace: database
spec:
  mtls:
    mode: STRICT
```

With STRICT mode, only services with valid Istio certificates can talk to your PostgreSQL pods. This effectively creates a zero-trust security boundary around your database.

## Authorization Policy

You can also restrict which services can connect to PostgreSQL:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: postgresql-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgresql
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/backend/sa/api-server
              - cluster.local/ns/backend/sa/worker
      to:
        - operation:
            ports: ["5432"]
```

This policy only allows the `api-server` and `worker` service accounts from the `backend` namespace to reach PostgreSQL on port 5432. Every other service in the mesh gets denied.

## Troubleshooting Common Issues

If your application can't connect to PostgreSQL after enabling Istio, check these things:

1. Verify the port naming. Run `kubectl get svc postgresql -n database -o yaml` and confirm the port name starts with `tcp-`.

2. Check if the sidecar is injected in both the client and server pods:

```bash
kubectl get pods -n database -o jsonpath='{.items[*].spec.containers[*].name}'
```

You should see `istio-proxy` alongside the postgresql container.

3. Look at the Istio proxy logs for connection errors:

```bash
kubectl logs -n database deployment/postgresql -c istio-proxy --tail=50
```

4. Verify mTLS is working between services:

```bash
istioctl x describe pod <your-app-pod> -n backend
```

5. If connections keep dropping, check that your idle timeout settings in the DestinationRule match or exceed your application's connection pool settings.

## Quick Recap

Getting PostgreSQL to work with Istio boils down to a few key things: name your ports with the `tcp-` prefix, configure DestinationRules with appropriate connection pool and timeout settings, use ServiceEntries for external databases, and set up AuthorizationPolicies to control access. Once configured, you get encrypted database traffic, fine-grained access control, and connection telemetry without changing a single line of application code.
