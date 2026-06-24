# How to Configure Istio for Amazon RDS Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Amazon RDS, AWS, Service Mesh, Kubernetes, Database

Description: How to configure Istio to connect to Amazon RDS instances from Kubernetes pods using ServiceEntries, TLS origination, and proper timeout management.

---

When your application runs in Kubernetes with Istio but your database is on Amazon RDS, you need to tell Istio about this external service. Istio allows unknown external services by default, but many production meshes switch to `REGISTRY_ONLY` mode, where unknown outbound destinations are blocked. ServiceEntries, DestinationRules, and proper database TLS configuration bridge this gap.

This post covers the practical setup for connecting to RDS instances - whether it is PostgreSQL, MySQL, or Aurora - through the Istio service mesh.

## Why You Need ServiceEntries for RDS

When Istio is running in REGISTRY_ONLY mode (a common production setting), the sidecar proxy only knows about services registered in the mesh. An RDS endpoint like `mydb.abc123.us-east-1.rds.amazonaws.com` is not in the mesh, so the proxy drops the traffic.

Even in ALLOW_ANY mode (where unknown destinations are passed through), you lose visibility and control. ServiceEntries let you register RDS endpoints with the mesh so you get metrics and traffic policy for the destination.

Check your current outbound policy:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

## Basic ServiceEntry for RDS

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres
  namespace: app
spec:
  hosts:
    - mydb.abc123.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

Key fields:
- `hosts`: The full RDS endpoint hostname
- `ports`: Use `tcp-postgres` naming for protocol detection
- `location: MESH_EXTERNAL`: Tells Istio this is outside the mesh
- `resolution: DNS`: Istio should resolve the hostname using DNS

## DestinationRule and Database TLS

RDS supports SSL/TLS connections, and you should always use them, especially when traffic leaves your VPC or crosses availability zones. For PostgreSQL and MySQL, configure TLS in the database client or driver. Do not use Istio TLS origination for the normal RDS database port, because the proxy would start a TLS handshake at the TCP layer while PostgreSQL and MySQL negotiate TLS inside their database protocols.

Use a DestinationRule for connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: rds-postgres-tls
  namespace: app
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        idleTimeout: 1800s
```

The application remains the TLS client for the database connection. RDS presents its server certificate, and the database driver validates it against the CA bundle or trust store configured in the application container.

If you need to pin the RDS CA certificate specifically (recommended for production):

Mount the RDS CA bundle into the application container using a ConfigMap or Secret, then configure the PostgreSQL or MySQL client to use that CA bundle and require server certificate verification.

## Aurora Cluster Endpoints

Amazon Aurora has multiple endpoints - a writer endpoint and a reader endpoint. You need ServiceEntries for each:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aurora-writer
  namespace: app
spec:
  hosts:
    - mydb-cluster.cluster-abc123.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aurora-reader
  namespace: app
spec:
  hosts:
    - mydb-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

And separate DestinationRules with different connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: aurora-writer
  namespace: app
spec:
  host: mydb-cluster.cluster-abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
        idleTimeout: 1800s
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: aurora-reader
  namespace: app
spec:
  host: mydb-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        idleTimeout: 1800s
```

The reader endpoint gets more connections because read traffic is typically higher volume.

## RDS MySQL Configuration

For MySQL on RDS, the setup is almost identical - just change the port:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-mysql
  namespace: app
spec:
  hosts:
    - mydb.abc123.us-east-1.rds.amazonaws.com
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

## RDS Proxy

If you are using Amazon RDS Proxy (which handles connection pooling at the AWS level), the configuration is the same as regular RDS - just use the RDS Proxy endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-proxy
  namespace: app
spec:
  hosts:
    - mydb-proxy.proxy-abc123.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

When using RDS Proxy with Istio, you have two layers of connection pooling. Keep Istio's `maxConnections` high enough to not interfere with RDS Proxy's pooling behavior.

## Multi-AZ and Failover

RDS Multi-AZ setups have automatic failover. During a failover event, the DNS endpoint resolves to a different IP address. Istio's DNS resolution handles this, but there is a caching consideration.

Envoy caches DNS results based on the TTL. Aurora endpoints use a short TTL, and AWS recommends keeping application DNS caches for RDS endpoints to no more than 60 seconds. Existing connections to the old primary will still be broken during failover, so make sure your application handles connection errors gracefully and retries.

To verify DNS resolution is working:

```bash
istioctl proxy-config endpoint <app-pod> -n app --cluster "outbound|5432||mydb.abc123.us-east-1.rds.amazonaws.com"
```

## Access Control

Even though RDS is outside the mesh, you can limit which workloads get sidecar configuration for the RDS endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: backend-rds-egress
  namespace: app
spec:
  workloadSelector:
    labels:
      rds-egress: "enabled"
  egress:
    - hosts:
        - "./mydb.abc123.us-east-1.rds.amazonaws.com"
```

Apply the `rds-egress: "enabled"` label only to workloads that should connect to RDS. For hard egress enforcement, also use Kubernetes NetworkPolicy, security groups, or route database traffic through an Istio egress gateway and apply policy there. A namespace-level AuthorizationPolicy on application workloads is not an outbound firewall, and `operation.hosts` only applies to HTTP traffic.

## Network Considerations

Your EKS cluster needs network connectivity to RDS. This means:

1. The EKS nodes and RDS instance must be in the same VPC or connected VPCs
2. Security groups must allow traffic from EKS node IPs to the RDS port
3. If using VPC peering or Transit Gateway, routing tables must be configured

Istio does not change any of this. The sidecar proxy runs on the same node as your pod, so it uses the same network path. If your pod could reach RDS without Istio, it can reach it with Istio (assuming the ServiceEntry is configured).

## Monitoring RDS Connections

Track connections to RDS through Istio:

```text
istio_tcp_connections_opened_total{destination_service="mydb.abc123.us-east-1.rds.amazonaws.com"}
istio_tcp_sent_bytes_total{destination_service="mydb.abc123.us-east-1.rds.amazonaws.com"}
istio_tcp_received_bytes_total{destination_service="mydb.abc123.us-east-1.rds.amazonaws.com"}
```

Combine these with RDS CloudWatch metrics (DatabaseConnections, ReadLatency, WriteLatency) for a complete picture of your database connectivity.

## Troubleshooting

If connections to RDS fail through Istio:

1. Verify the ServiceEntry is applied: `kubectl get serviceentry -n app`
2. Check that DNS resolves from the sidecar: `istioctl proxy-config endpoint <pod> -n app | grep rds`
3. Look at proxy logs for connection errors: `kubectl logs <pod> -c istio-proxy --tail=50`
4. Test connectivity without the sidecar by running a pod without injection and trying to connect
5. Ensure the RDS security group allows inbound traffic from your EKS nodes

Connecting to RDS through Istio is straightforward once the ServiceEntry and DestinationRule are in place. You get connection metrics and mesh traffic policy while keeping database TLS configured in the application.
