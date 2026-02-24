# How to Handle Storage Traffic Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Storage, Proxy, Kubernetes, Envoy, Traffic Management

Description: Manage storage-related network traffic flowing through Istio's Envoy proxy, including cloud storage APIs, in-cluster storage services, and database connections.

---

When your application communicates with storage systems over the network, that traffic flows through the Istio sidecar proxy. This includes calls to cloud storage APIs, connections to in-cluster databases, and communication with object stores. The proxy gives you observability and security for storage traffic, but it also adds latency and potential failure points that you need to manage.

## Understanding Storage Traffic Paths

Not all storage traffic goes through the Envoy proxy. It depends on how the storage is accessed:

**Through the proxy:**
- REST API calls to S3, GCS, Azure Blob Storage
- Database connections (PostgreSQL, MySQL, MongoDB, Redis)
- gRPC calls to storage services
- HTTP calls to MinIO or other object storage APIs
- Any TCP connection to an external storage endpoint

**NOT through the proxy:**
- Local filesystem reads/writes (PersistentVolumes mounted in the container)
- NFS mounts handled by the kernel
- Block storage (EBS, GCE PD) attached at the node level

The distinction is simple: if your application makes a network call (TCP, HTTP, gRPC), it goes through Envoy. If it reads/writes to a local file path, it does not.

## Cloud Storage API Traffic

When your application calls a cloud storage API like AWS S3:

```python
import boto3

s3 = boto3.client('s3', region_name='us-east-1')
s3.put_object(Bucket='my-bucket', Key='data.json', Body=json.dumps(data))
```

This HTTP request goes through the Envoy sidecar. You need to make sure Envoy can reach the S3 endpoint. By default, Istio allows outbound traffic to any external IP (the `outboundTrafficPolicy` is set to `ALLOW_ANY`). But if you have restricted it to `REGISTRY_ONLY`, you need a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: default
spec:
  hosts:
    - "*.s3.amazonaws.com"
    - "*.s3.us-east-1.amazonaws.com"
    - "s3.amazonaws.com"
    - "s3.us-east-1.amazonaws.com"
  ports:
    - number: 443
      name: https
      protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

## Database Connection Traffic

Database connections are long-lived TCP connections. Envoy proxies them as TCP, which means:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: default
spec:
  selector:
    app: postgres
  ports:
    - name: tcp-postgres
      port: 5432
      targetPort: 5432
```

The port name `tcp-postgres` tells Istio this is TCP traffic. Envoy handles it at L4 without inspecting the content. This adds minimal latency but you still get mTLS encryption between services.

For connection pooling, configure the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: postgres
  namespace: default
spec:
  host: postgres.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
```

## Handling High-Throughput Storage Traffic

If your application transfers large amounts of data through storage APIs (like uploading multi-GB files to S3), the proxy adds CPU overhead for handling the traffic. For very high throughput, you might want to exclude storage traffic from the proxy:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "52.216.0.0/15"
```

This excludes S3 IP ranges from the proxy. Traffic goes directly from the container to S3 without Envoy in the middle. The downside is you lose observability and mTLS for that traffic.

A better approach for in-cluster storage is to keep it through the proxy but tune the buffer sizes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: minio
  namespace: default
spec:
  host: minio.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        maxRequestsPerConnection: 0
```

## External Storage Services

For storage services running outside the cluster, create ServiceEntry resources:

```yaml
# Redis on ElastiCache
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: elasticache-redis
  namespace: default
spec:
  hosts:
    - my-redis.abc123.us-east-1.cache.amazonaws.com
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: elasticache-redis
  namespace: default
spec:
  host: my-redis.abc123.us-east-1.cache.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

For managed databases:

```yaml
# RDS PostgreSQL
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: rds-postgres
  namespace: default
spec:
  hosts:
    - mydb.abc123.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: rds-postgres
  namespace: default
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
    connectionPool:
      tcp:
        maxConnections: 30
        connectTimeout: 10s
```

## Monitoring Storage Traffic

One of the benefits of routing storage traffic through Istio is observability. You can see how much traffic goes to each storage service:

```promql
# Bytes sent to S3
sum(rate(istio_tcp_sent_bytes_total{destination_service_name="*.s3.amazonaws.com"}[5m]))

# Request rate to MinIO
sum(rate(istio_requests_total{destination_service_name="minio.default.svc.cluster.local"}[5m]))

# Latency to external database
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="mydb.abc123.us-east-1.rds.amazonaws.com"}[5m])) by (le))
```

For TCP traffic (databases), the metrics are different:

```promql
# Active connections to database
envoy_cluster_upstream_cx_active{cluster_name=~".*postgres.*"}

# Connection failures
rate(envoy_cluster_upstream_cx_connect_fail{cluster_name=~".*postgres.*"}[5m])
```

## Handling Storage Timeouts

Storage operations can be slow, especially for large file uploads. Make sure your timeouts accommodate this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: minio
  namespace: default
spec:
  hosts:
    - minio.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: minio.default.svc.cluster.local
      timeout: 300s
```

A 5-minute timeout for object storage operations is reasonable. For database queries, you probably want shorter timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: postgres
  namespace: default
spec:
  host: postgres.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 5s
```

## TLS Origination for External Storage

If your application connects to external storage over plain HTTP but you want to upgrade to HTTPS at the proxy level:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-storage
  namespace: default
spec:
  hosts:
    - storage.example.com
  ports:
    - number: 443
      name: https
      protocol: TLS
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-storage
  namespace: default
spec:
  host: storage.example.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 443
        tls:
          mode: SIMPLE
```

## Bypassing the Proxy for Specific Storage

For storage traffic that should not go through the proxy (performance-critical bulk transfers):

```yaml
metadata:
  annotations:
    # Exclude specific IPs
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.5.0/24"

    # Or exclude specific ports
    traffic.sidecar.istio.io/excludeOutboundPorts: "6379,5432"
```

Use this sparingly. Every excluded path is a path without observability and security.

## Debugging Storage Traffic Issues

When storage operations fail through Istio:

```bash
# Check if the storage endpoint is reachable
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET clusters | grep storage

# Look at connection stats
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "cx_connect_fail"

# Check access logs for storage traffic
kubectl logs <pod-name> -c istio-proxy | grep "storage\|s3\|minio"

# Verify ServiceEntry is applied
istioctl proxy-config clusters <pod-name> | grep storage
```

If the cluster is not visible in `proxy-config clusters`, the ServiceEntry is not being applied to this workload. Check namespace and selector settings.

Storage traffic through Istio works well for most cases. The key decisions are whether to route storage traffic through the proxy (for observability and security) or exclude it (for performance). For in-cluster storage services, routing through the proxy is almost always the right choice. For high-throughput external storage, measure the latency impact before deciding.
