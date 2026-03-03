# How to Configure Istio for Google Cloud SQL Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Google Cloud SQL, GCP, Service Mesh, Kubernetes, Database

Description: How to configure Istio for Google Cloud SQL connections from GKE clusters, covering both Cloud SQL Proxy sidecar and direct connection approaches.

---

Connecting to Google Cloud SQL from a Kubernetes cluster running Istio involves some unique considerations. Unlike connecting to a standard database, Cloud SQL has its own connection proxy (Cloud SQL Auth Proxy) that most teams use for authentication and encryption. You need to decide whether to run this proxy alongside the Istio sidecar or connect directly, and each approach has different Istio configurations.

This post covers both approaches and the Istio configuration for each.

## Two Approaches to Cloud SQL

**Approach 1: Cloud SQL Auth Proxy as a sidecar** - Run the proxy container alongside your application. The proxy handles authentication using a service account and creates a local TCP tunnel to Cloud SQL. Your app connects to localhost.

**Approach 2: Direct connection** - Connect directly to Cloud SQL's private IP (if using Private Service Connect or VPC peering) without the proxy. Your app connects to the actual Cloud SQL IP.

Most teams use Approach 1 because it handles authentication and encryption. But Approach 2 is simpler from an Istio perspective and works well if you have already set up private networking.

## Approach 1: Cloud SQL Proxy with Istio

When using the Cloud SQL Auth Proxy as a sidecar, your pod has three containers: the application, the Cloud SQL proxy, and the Istio sidecar.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: app
spec:
  template:
    metadata:
      labels:
        app: backend-api
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
    spec:
      serviceAccountName: backend-api
      containers:
        - name: backend-api
          image: my-api:latest
          env:
            - name: DB_HOST
              value: "127.0.0.1"
            - name: DB_PORT
              value: "5432"
            - name: DB_NAME
              value: "mydb"
        - name: cloud-sql-proxy
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
          args:
            - "--port=5432"
            - "my-project:us-central1:my-instance"
          securityContext:
            runAsNonRoot: true
```

The application connects to `127.0.0.1:5432`, which is the Cloud SQL proxy. The proxy then connects to Cloud SQL over a secure tunnel.

The key Istio consideration: traffic from your application to `127.0.0.1` does not go through the Istio sidecar because localhost traffic is not intercepted by the iptables rules that redirect traffic. This means the connection from your app to the Cloud SQL proxy is unaffected by Istio.

However, the outbound connection from the Cloud SQL proxy to Google's infrastructure does go through the Istio sidecar. You need a ServiceEntry for this:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql-api
  namespace: app
spec:
  hosts:
    - sqladmin.googleapis.com
    - www.googleapis.com
    - oauth2.googleapis.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

And for the actual SQL connection tunnel:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql-instance
  namespace: app
spec:
  hosts:
    - "*.cloud-sql-proxy.googleapis.com"
  ports:
    - number: 3307
      name: tcp-cloudsql
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: NONE
```

## Approach 2: Direct Connection via Private IP

If your GKE cluster and Cloud SQL instance are connected via VPC peering or Private Service Connect, you can connect directly using the private IP:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql-direct
  namespace: app
spec:
  hosts:
    - cloud-sql-postgres.database.internal
  addresses:
    - 10.20.30.40/32
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
    - address: 10.20.30.40
```

Replace `10.20.30.40` with your Cloud SQL private IP. The `resolution: STATIC` tells Istio to use the specified IP address directly instead of DNS resolution. The `hosts` field is a logical name you choose for the service.

Your application connects to this using the hostname you defined:

```yaml
env:
  - name: DB_HOST
    value: "cloud-sql-postgres.database.internal"
  - name: DB_PORT
    value: "5432"
```

Or directly using the IP:

```yaml
env:
  - name: DB_HOST
    value: "10.20.30.40"
  - name: DB_PORT
    value: "5432"
```

## DestinationRule for Direct Connections

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cloud-sql-postgres
  namespace: app
spec:
  host: cloud-sql-postgres.database.internal
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        idleTimeout: 1800s
    tls:
      mode: SIMPLE
```

If your Cloud SQL instance requires SSL (which it should), use `SIMPLE` TLS mode. Cloud SQL supports server-side SSL certificates that the Istio proxy can validate.

To use the Cloud SQL server CA certificate:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cloud-sql-postgres
  namespace: app
spec:
  host: cloud-sql-postgres.database.internal
  trafficPolicy:
    tls:
      mode: SIMPLE
      caCertificates: /etc/cloud-sql-certs/server-ca.pem
```

Mount the Cloud SQL server CA certificate into the sidecar:

```yaml
annotations:
  sidecar.istio.io/userVolume: '[{"name":"cloud-sql-certs","secret":{"secretName":"cloud-sql-server-ca"}}]'
  sidecar.istio.io/userVolumeMount: '[{"name":"cloud-sql-certs","mountPath":"/etc/cloud-sql-certs","readOnly":true}]'
```

## Cloud SQL for MySQL

For MySQL instances, the configuration is the same structure with a different port:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql-mysql
  namespace: app
spec:
  hosts:
    - cloud-sql-mysql.database.internal
  addresses:
    - 10.20.30.41/32
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
    - address: 10.20.30.41
```

## Access Control

Control which services can connect to Cloud SQL:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: cloud-sql-egress
  namespace: app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/backend-api
              - cluster.local/ns/app/sa/worker
      to:
        - operation:
            hosts:
              - cloud-sql-postgres.database.internal
            ports: ["5432"]
```

## Handling Cloud SQL Restarts and Maintenance

Cloud SQL instances undergo maintenance and can restart. During these events, existing connections are terminated. Your application and Istio need to handle this gracefully.

On the Istio side, configure outlier detection to quickly detect and handle failed connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cloud-sql-postgres
  namespace: app
spec:
  host: cloud-sql-postgres.database.internal
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 15s
        idleTimeout: 1800s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

On the application side, use a connection pool that validates connections before use and can reconnect automatically.

## Monitoring

Track your Cloud SQL connections through Istio metrics:

```text
istio_tcp_connections_opened_total{destination_service="cloud-sql-postgres.database.internal"}
istio_tcp_connections_closed_total{destination_service="cloud-sql-postgres.database.internal"}
istio_tcp_sent_bytes_total{destination_service="cloud-sql-postgres.database.internal"}
```

Combine with Cloud SQL monitoring in the Google Cloud Console for a full picture.

## Which Approach to Choose

Use the Cloud SQL Auth Proxy (Approach 1) if:
- You need IAM-based database authentication
- You do not have VPC peering set up
- You want the proxy to handle certificate rotation

Use direct connection (Approach 2) if:
- You already have VPC peering or Private Service Connect
- You want simpler pod configurations (fewer sidecars)
- You manage database credentials through Kubernetes Secrets

Both approaches work with Istio. The proxy approach adds a container but simplifies authentication. The direct approach is cleaner from an Istio perspective because you have full control over the connection through ServiceEntries and DestinationRules.
