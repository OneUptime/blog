# How to Configure mTLS for Database Connections in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Database, PostgreSQL, MySQL, Kubernetes

Description: How to configure mutual TLS for database connections in Istio including PostgreSQL, MySQL, MongoDB, and Redis running in the mesh.

---

Encrypting database connections is a common compliance requirement, but configuring TLS for every database client and server is tedious work. If your database runs inside the Kubernetes cluster with an Istio sidecar, you can use Istio's mTLS to encrypt database traffic automatically without changing your application code or database configuration.

This guide covers how to set up mTLS for common databases running in Istio.

## How Database Traffic Works with Istio

When your application connects to a database running in the mesh, the traffic path looks like this:

```mermaid
sequenceDiagram
    participant App as Application
    participant AS as App Sidecar
    participant DS as DB Sidecar
    participant DB as Database

    App->>AS: Plain TCP (localhost)
    AS->>DS: mTLS encrypted TCP
    DS->>DB: Plain TCP (localhost)
```

The application connects to the database using a normal, unencrypted connection (since it is going to localhost through the sidecar). The sidecars handle the encryption between them. The database does not need any TLS configuration.

## PostgreSQL with Istio mTLS

### Deploy PostgreSQL with Sidecar Injection

Make sure your PostgreSQL deployment is in a namespace with sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
          name: tcp-postgres
        env:
        - name: POSTGRES_DB
          value: mydb
        - name: POSTGRES_USER
          value: myuser
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  selector:
    app: postgres
  ports:
  - name: tcp-postgres
    port: 5432
    targetPort: 5432
```

Important: The port name must start with `tcp-` for Istio to recognize it as a TCP protocol. Without this prefix, Istio might try to parse the traffic as HTTP and break things.

### Apply mTLS Policy

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: postgres-strict
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  mtls:
    mode: STRICT
```

### Configure the Application

Your application connects to PostgreSQL normally, without any TLS settings:

```yaml
# Application deployment
env:
- name: DATABASE_URL
  value: "postgres://myuser:password@postgres.database.svc.cluster.local:5432/mydb?sslmode=disable"
```

Yes, `sslmode=disable` is correct here. The application is not doing TLS - the sidecar is handling it. This is one of the key benefits: you do not need to distribute database TLS certificates to every application.

## MySQL with Istio mTLS

### Deploy MySQL

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
          name: tcp-mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: root-password
        - name: MYSQL_DATABASE
          value: mydb
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  selector:
    app: mysql
  ports:
  - name: tcp-mysql
    port: 3306
    targetPort: 3306
```

### MySQL-Specific Considerations

MySQL uses a server-initiated protocol where the server sends a greeting packet before the client sends anything. Istio handles this correctly for TCP protocol, but you need to make sure the port is declared as TCP (not HTTP).

If you are using MySQL's native TLS on top of Istio mTLS, you will get double encryption. This is wasteful. Disable MySQL's built-in TLS when using Istio:

```yaml
# MySQL configuration
env:
- name: MYSQL_SSL
  value: "0"
```

And in your application connection string:

```text
mysql://myuser:password@mysql.database.svc.cluster.local:3306/mydb?tls=skip-verify
```

## MongoDB with Istio mTLS

### Deploy MongoDB

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7
        ports:
        - containerPort: 27017
          name: tcp-mongodb
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: admin
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: database
spec:
  selector:
    app: mongodb
  ports:
  - name: tcp-mongodb
    port: 27017
    targetPort: 27017
```

### MongoDB Connection String

```text
mongodb://admin:password@mongodb.database.svc.cluster.local:27017/mydb?ssl=false
```

Again, disable the application-level TLS since Istio handles it.

## Redis with Istio mTLS

Redis connections are straightforward since Redis uses a simple TCP protocol:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
          name: tcp-redis
        command: ["redis-server", "--requirepass", "$(REDIS_PASSWORD)"]
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: database
spec:
  selector:
    app: redis
  ports:
  - name: tcp-redis
    port: 6379
    targetPort: 6379
```

## DestinationRule for Database Connections

For TCP connections, you might want to configure connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-dr
  namespace: database
spec:
  host: postgres.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
    tls:
      mode: ISTIO_MUTUAL
```

The `ISTIO_MUTUAL` mode explicitly tells the sidecar to use Istio-managed mTLS certificates for connections to this service.

## Handling External Databases

If your database is outside the cluster (RDS, Cloud SQL, Azure SQL), Istio mTLS does not apply because there is no sidecar on the database side. In this case:

1. Use a ServiceEntry to register the external database
2. Use a DestinationRule with `mode: SIMPLE` for standard TLS (not mTLS)

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
  namespace: database
spec:
  hosts:
  - mydb.abc123.us-east-1.rds.amazonaws.com
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-postgres-dr
  namespace: database
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

The `SIMPLE` mode initiates a standard TLS connection (server authentication only, no client certificate).

## Verifying Database mTLS

Check that the database connection is using mTLS:

```bash
# Check the proxy config for the app pod
istioctl proxy-config cluster <app-pod> -n <app-namespace> \
  --fqdn postgres.database.svc.cluster.local -o json | \
  jq '.[].transportSocket'
```

If mTLS is configured, you will see a TLS transport socket configuration.

Check connection stats:

```bash
kubectl exec <app-pod> -c istio-proxy -- pilot-agent request GET /stats | \
  grep "cluster.outbound|5432||postgres.database.svc.cluster.local"
```

Look for `ssl.handshake` counters increasing with each new database connection.

## Common Issues

**Connection timeout after sidecar injection**: Database connections are long-lived. When you inject a sidecar, existing connections are not affected, but new connections go through the sidecar. If the sidecar is not ready yet, connections fail. Use `holdApplicationUntilProxyStarts: true` in the pod annotation to prevent this.

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

**Connection pool exhaustion**: Database connections through the sidecar use the Envoy connection pool. If your application creates many database connections, you might hit Envoy's default limits. Increase them with a DestinationRule.

**Protocol detection issues**: If Istio cannot detect the protocol, it might treat database traffic as HTTP and break it. Always name your database ports with the `tcp-` prefix.

Using Istio mTLS for database connections is one of the quickest wins for encrypting data in transit. No certificate distribution, no application code changes, no database TLS configuration. The sidecars handle everything.
