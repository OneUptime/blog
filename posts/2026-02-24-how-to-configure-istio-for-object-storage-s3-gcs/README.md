# How to Configure Istio for Object Storage (S3, GCS)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Object Storage, S3, GCS, Kubernetes, Cloud

Description: Configure Istio to work with cloud object storage services like AWS S3 and Google Cloud Storage, including ServiceEntry setup, TLS, and traffic management.

---

Cloud object storage services like AWS S3 and Google Cloud Storage are external to your Kubernetes cluster. When your application pods access these services through the Istio sidecar proxy, the traffic needs to be properly configured. Depending on your mesh policy, Istio might block the traffic or route it incorrectly.

Here is how to configure Istio for reliable object storage access.

## The Default Behavior

Istio's `outboundTrafficPolicy` controls how traffic to external services is handled. There are two modes:

1. **ALLOW_ANY** (the default) - all outbound traffic is allowed, even to addresses not in the mesh registry. S3 and GCS calls just work without any configuration.

2. **REGISTRY_ONLY** - only traffic to explicitly registered services is allowed. S3 and GCS calls are blocked unless you create ServiceEntry resources.

Check your current setting:

```bash
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep outboundTrafficPolicy
```

If you are using `REGISTRY_ONLY` (which many production setups use for tighter egress control and to catch missing ServiceEntry resources), you need ServiceEntry resources for object storage. Istio does not treat this setting as a full outbound firewall.

## Configuring ServiceEntry for AWS S3

AWS S3 uses several endpoints depending on the style of access (path-style vs virtual-hosted-style) and the region:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: default
spec:
  hosts:
    - "s3.amazonaws.com"
    - "s3.us-east-1.amazonaws.com"
    - "s3.us-west-2.amazonaws.com"
    - "*.s3.amazonaws.com"
    - "*.s3.us-east-1.amazonaws.com"
    - "*.s3.us-west-2.amazonaws.com"
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: NONE
```

The wildcard hosts (`*.s3.amazonaws.com`) handle virtual-hosted-style requests where the bucket name is in the hostname (like `my-bucket.s3.amazonaws.com`).

Use `resolution: NONE` when the ServiceEntry contains wildcard hosts. With normal S3 SDK usage, the application originates HTTPS and Envoy routes the encrypted connection by SNI. Do not add `tls.mode: SIMPLE` for this case; that mode is for Istio TLS origination, where the application sends HTTP and Envoy initiates TLS to the upstream service.

## Configuring ServiceEntry for Google Cloud Storage

GCS uses a different set of endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcs
  namespace: default
spec:
  hosts:
    - "storage.googleapis.com"
    - "*.storage.googleapis.com"
    - "oauth2.googleapis.com"
    - "accounts.google.com"
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: NONE
```

Note that GCS clients may also need authentication endpoints such as `oauth2.googleapis.com`. If you are using Workload Identity Federation for GKE, token requests usually go to the GKE metadata server instead, so allow the authentication endpoint your SDK actually uses.

## Configuring ServiceEntry for Azure Blob Storage

For Azure Blob Storage:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-blob
  namespace: default
spec:
  hosts:
    - "*.blob.core.windows.net"
    - "login.microsoftonline.com"
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: NONE
```

The `login.microsoftonline.com` endpoint is needed for Azure AD authentication.

## In-Cluster Object Storage (MinIO)

If you run MinIO or another S3-compatible object storage in your cluster, it is an in-mesh service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: default
spec:
  selector:
    app: minio
  ports:
    - name: http-api
      port: 9000
      targetPort: 9000
    - name: http-console
      port: 9001
      targetPort: 9001
```

Name the ports with `http-` prefix so Istio recognizes the protocol. For MinIO, the API is HTTP-based (it speaks S3 protocol over HTTP).

Configure a VirtualService for timeout handling since object storage uploads can be large:

```yaml
apiVersion: networking.istio.io/v1
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
            port:
              number: 9000
      timeout: 600s
```

A 10-minute timeout accommodates large file uploads. Adjust based on your use case.

## Handling Large File Uploads

Object storage uploads can be multi-gigabyte. Envoy does not normally buffer the whole request body, but connection limits, idle timeouts, or protocol upgrades can still affect large transfers. For multipart uploads (which S3 SDKs use for large files), each part is typically 5MB or larger, depending on SDK configuration.

If you experience issues with large uploads to an in-cluster S3-compatible service, check the connection pool and protocol settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: minio
  namespace: default
spec:
  host: minio.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 0
        h2UpgradePolicy: DO_NOT_UPGRADE
      tcp:
        maxConnections: 100
```

For S3-compatible services that do not support HTTP/2 well, keep HTTP/1.1 (`h2UpgradePolicy: DO_NOT_UPGRADE`).

## Timeout Configuration for Object Storage

Object storage operations vary widely in duration. A small GET might take 50ms while a large PUT takes minutes. HTTP-level `VirtualService` timeouts work when Istio can see HTTP traffic, such as in-cluster MinIO over HTTP or an explicit TLS-origination setup. For normal SDK HTTPS traffic to S3, Envoy passes the encrypted connection through and cannot apply per-request HTTP routes or timeouts:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: minio-timeout
  namespace: default
spec:
  hosts:
    - minio.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: minio.default.svc.cluster.local
            port:
              number: 9000
      timeout: 300s
```

Or bypass the proxy entirely for object storage if you do not need mesh features:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "52.216.0.0/15,54.231.0.0/16"
```

Treat those CIDRs as examples only. AWS publishes current IP ranges in `ip-ranges.json`, and the ranges for S3 vary by region and can change over time.

## Monitoring Object Storage Traffic

With Istio, you get visibility into object storage traffic. For in-cluster HTTP services or TLS-origination configurations where Envoy can see HTTP, request metrics are available:

```promql
# Request rate

sum(rate(istio_requests_total{destination_service_name=~".*minio.*"}[5m]))

# Bytes sent (upload volume)
sum(rate(istio_request_bytes_sum{destination_service_name=~".*minio.*"}[5m]))

# Bytes received (download volume)
sum(rate(istio_response_bytes_sum{destination_service_name=~".*minio.*"}[5m]))

# Error rate
sum(rate(istio_requests_total{destination_service_name=~".*minio.*", response_code!~"2.."}[5m]))
/
sum(rate(istio_requests_total{destination_service_name=~".*minio.*"}[5m]))

# Latency
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=~".*minio.*"}[5m])) by (le))
```

For normal external HTTPS traffic where the application originates TLS, Envoy cannot see HTTP status codes or request paths. Use TCP byte and connection metrics such as `istio_tcp_sent_bytes_total`, `istio_tcp_received_bytes_total`, and `istio_tcp_connections_opened_total` for that traffic.

## Signed URLs and Presigned URLs

If your application generates presigned URLs for direct client access to S3/GCS, the presigned URL requests come from outside the cluster and do not go through Istio. Generating the URL is usually local signing work in the SDK; only related credential-refresh calls, such as calls to STS or OAuth endpoints, go through the mesh.

However, if your backend downloads objects using presigned URLs from other services, that traffic does go through the sidecar:

```python
import requests

# This goes through the Envoy sidecar
response = requests.get(presigned_url)
```

Make sure the presigned URL's hostname is covered by your ServiceEntry.

## Complete Example: Application with S3 Access

Here is a complete setup for an application that reads from and writes to S3:

```yaml
# ServiceEntry for S3 access
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: default
spec:
  hosts:
    - "s3.us-east-1.amazonaws.com"
    - "*.s3.us-east-1.amazonaws.com"
    - "sts.us-east-1.amazonaws.com"
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: NONE
---
# Application deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-processor
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: file-processor
  template:
    metadata:
      labels:
        app: file-processor
    spec:
      containers:
        - name: file-processor
          image: myregistry/file-processor:latest
          env:
            - name: AWS_REGION
              value: "us-east-1"
            - name: S3_BUCKET
              value: "my-bucket"
          ports:
            - containerPort: 8080
```

Note the `sts.us-east-1.amazonaws.com` endpoint. This is needed if you use IAM roles for service accounts (IRSA) in EKS, as the AWS SDK calls STS to assume the role.

## Debugging Object Storage Access

If your application cannot reach S3 or GCS through Istio:

```bash
# Check if the ServiceEntry is applied
istioctl proxy-config clusters <pod-name> | grep s3

# Check Envoy access logs for S3 traffic
kubectl logs <pod-name> -c istio-proxy | grep "s3"

# Test connectivity from the proxy
kubectl exec -it <pod-name> -c istio-proxy -- curl -v https://s3.us-east-1.amazonaws.com

# Check for TLS errors
kubectl logs <pod-name> -c istio-proxy | grep "tls\|ssl\|certificate"
```

If the cluster is not listed in `proxy-config clusters`, the ServiceEntry is not taking effect. Check the namespace and exported visibility. If you see TLS errors with normal SDK HTTPS traffic, verify that you have not configured Istio TLS origination for the same destination.

Configuring Istio for object storage comes down to two things: making sure external endpoints are reachable (via ServiceEntry or ALLOW_ANY) and setting appropriate connection, protocol, and timeout behavior for large transfers. Once those are in place, you get the bonus of traffic visibility and connection management through the mesh.
