# How to Configure Istio for Amazon RDS Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Amazon RDS, AWS, Service Mesh, Kubernetes, Database

Description: How to configure Istio to connect to Amazon RDS instances from Kubernetes pods using ServiceEntries, TLS origination, and proper timeout management.

---

When your application runs in Kubernetes with Istio but your database is on Amazon RDS, you need to tell Istio about this external service. By default, Istio blocks or does not know how to route traffic to services outside the mesh. ServiceEntries, DestinationRules, and proper TLS configuration bridge this gap.

This post covers the practical setup for connecting to RDS instances - whether it is PostgreSQL, MySQL, or Aurora - through the Istio service mesh.

## Why You Need ServiceEntries for RDS

When Istio is running in REGISTRY_ONLY mode (the recommended production setting), the sidecar proxy only knows about services registered in the mesh. An RDS endpoint like `mydb.abc123.us-east-1.rds.amazonaws.com` is not in the mesh, so the proxy drops the traffic.

Even in ALLOW_ANY mode (where unknown destinations are passed through), you lose visibility and control. ServiceEntries let you register RDS endpoints with the mesh so you get metrics, access control, and TLS management.

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

## DestinationRule for TLS

RDS supports SSL/TLS connections, and you should always use them, especially when traffic leaves your VPC or crosses availability zones. Configure TLS origination:

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
    tls:
      mode: SIMPLE
```

The `SIMPLE` TLS mode means the sidecar initiates a TLS handshake with RDS. The sidecar acts as the TLS client. RDS presents its server certificate, and the sidecar validates it against the system CA store.

If you need to pin the RDS CA certificate specifically (recommended for production):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: rds-postgres-tls
  namespace: app
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      caCertificates: /etc/ssl/certs/rds-ca-bundle.pem
```

You would mount the RDS CA bundle into the sidecar using a ConfigMap or Secret.

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
    tls:
      mode: SIMPLE
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
    tls:
      mode: SIMPLE
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

Envoy caches DNS results based on the TTL. RDS endpoints have a 5-second TTL, so Envoy will re-resolve quickly after a failover. But existing connections to the old primary will be broken. Make sure your application handles connection errors gracefully and retries.

To verify DNS resolution is working:

```bash
istioctl proxy-config endpoint <app-pod> -n app --cluster "outbound|5432||mydb.abc123.us-east-1.rds.amazonaws.com"
```

## Access Control

Even though RDS is outside the mesh, you can control which in-mesh services are allowed to connect:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: rds-egress-policy
  namespace: app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/backend-api
              - cluster.local/ns/app/sa/migration-runner
      to:
        - operation:
            hosts:
              - mydb.abc123.us-east-1.rds.amazonaws.com
            ports: ["5432"]
```

This is an egress-side policy that only allows specific service accounts to connect to RDS.

## Network Considerations

Your EKS cluster needs network connectivity to RDS. This means:

1. The EKS nodes and RDS instance must be in the same VPC or connected VPCs
2. Security groups must allow traffic from EKS node IPs to the RDS port
3. If using VPC peering or Transit Gateway, routing tables must be configured

Istio does not change any of this. The sidecar proxy runs on the same node as your pod, so it uses the same network path. If your pod could reach RDS without Istio, it can reach it with Istio (assuming the ServiceEntry is configured).

## Monitoring RDS Connections

Track connections to RDS through Istio:

```
istio_tcp_connections_opened_total{destination_service="mydb.abc123.us-east-1.rds.amazonaws.com"}
istio_tcp_sent_bytes_total{destination_service="mydb.abc123.us-east-1.rds.amazonaws.com"}
istio_tcp_received_bytes_total{destination_service="mydb.abc123.us-east-1.rds.amazonaws.com"}
```

Combine these with RDS CloudWatch metrics (DatabaseConnections, ReadLatency, WriteLatency) for a complete picture of your database connectivity.

## Troubleshooting

If connections to RDS fail through Istio:

1. Verify the ServiceEntry is applied: `kubectl get serviceentry -n app`
2. Check that DNS resolves from the sidecar: `istioctl proxy-config endpoint <pod> -n app | grep rds`
3. Look at proxy logs for TLS errors: `kubectl logs <pod> -c istio-proxy --tail=50`
4. Test connectivity without the sidecar by running a pod without injection and trying to connect
5. Ensure the RDS security group allows inbound traffic from your EKS nodes

Connecting to RDS through Istio is straightforward once the ServiceEntry and DestinationRule are in place. You get connection metrics, egress access control, and TLS management without any application changes.
