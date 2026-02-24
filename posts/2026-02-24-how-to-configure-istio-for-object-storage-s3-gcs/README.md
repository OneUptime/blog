# How to Configure Istio for Object Storage (S3, GCS)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Object Storage, S3, GCS, Kubernetes, Cloud

Description: Configure Istio to work with cloud object storage services like AWS S3 and Google Cloud Storage, including ServiceEntry setup, TLS, and traffic management.

---

Cloud object storage services like AWS S3 and Google Cloud Storage are external to your Kubernetes cluster. When your application pods access these services through the Istio sidecar proxy, the traffic needs to be properly configured. By default, Istio might block the traffic, apply mTLS to it (which breaks things), or route it incorrectly.

Here is how to configure Istio for reliable object storage access.

## The Default Behavior

Istio's `outboundTrafficPolicy` controls how traffic to external services is handled. There are two modes:

1. **ALLOW_ANY** (the default) - all outbound traffic is allowed, even to addresses not in the mesh registry. S3 and GCS calls just work without any configuration.

2. **REGISTRY_ONLY** - only traffic to explicitly registered services is allowed. S3 and GCS calls are blocked unless you create ServiceEntry resources.

Check your current setting:

```bash
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep outboundTrafficPolicy
```

If you are using `REGISTRY_ONLY` (which many production setups do for security), you need ServiceEntry resources for object storage.

## Configuring ServiceEntry for AWS S3

AWS S3 uses several endpoints depending on the style of access (path-style vs virtual-hosted-style) and the region:

```yaml
apiVersion: networking.istio.io/v1beta1
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
      protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

The wildcard hosts (`*.s3.amazonaws.com`) handle virtual-hosted-style requests where the bucket name is in the hostname (like `my-bucket.s3.amazonaws.com`).

Add a DestinationRule to ensure TLS is handled correctly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: aws-s3
  namespace: default
spec:
  host: "*.s3.amazonaws.com"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

`tls.mode: SIMPLE` means Envoy originates TLS to the external endpoint. This is usually handled by the S3 SDK anyway, so this DestinationRule is mainly to make sure Istio does not try to apply mTLS (which S3 does not support).

## Configuring ServiceEntry for Google Cloud Storage

GCS uses a different set of endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
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
      protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: gcs
  namespace: default
spec:
  host: "storage.googleapis.com"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

Note that GCS also needs `oauth2.googleapis.com` for authentication. If you are using workload identity or service account keys, the SDK makes OAuth token requests to this endpoint.

## Configuring ServiceEntry for Azure Blob Storage

For Azure Blob Storage:

```yaml
apiVersion: networking.istio.io/v1beta1
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
      protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: azure-blob
  namespace: default
spec:
  host: "*.blob.core.windows.net"
  trafficPolicy:
    tls:
      mode: SIMPLE
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
            port:
              number: 9000
      timeout: 600s
```

A 10-minute timeout accommodates large file uploads. Adjust based on your use case.

## Handling Large File Uploads

Object storage uploads can be multi-gigabyte. The Envoy proxy buffers some data, which can cause issues with very large uploads. For multipart uploads (which S3 SDKs use for large files), each part is typically 5-100MB, which is fine for Envoy.

If you experience issues with large uploads, check the Envoy buffer limits:

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
      http:
        maxRequestsPerConnection: 0
        h2UpgradePolicy: DO_NOT_UPGRADE
      tcp:
        maxConnections: 100
```

For S3 API traffic, keep HTTP/1.1 (`h2UpgradePolicy: DO_NOT_UPGRADE`) because S3 and most S3-compatible stores use HTTP/1.1.

## Timeout Configuration for Object Storage

Object storage operations vary widely in duration. A small GET might take 50ms while a large PUT takes minutes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: s3-timeout
  namespace: default
spec:
  hosts:
    - "*.s3.amazonaws.com"
  http:
    - route:
        - destination:
            host: "*.s3.amazonaws.com"
      timeout: 300s
```

Or bypass the proxy entirely for object storage if you do not need mesh features:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "52.216.0.0/15,54.231.0.0/16"
```

These are AWS S3 IP ranges. Check the current ranges from AWS's published IP ranges.

## Monitoring Object Storage Traffic

With Istio, you get visibility into your object storage traffic:

```promql
# Request rate to S3
sum(rate(istio_requests_total{destination_service_name=~".*s3.*"}[5m]))

# Bytes sent to S3 (upload volume)
sum(rate(istio_request_bytes_sum{destination_service_name=~".*s3.*"}[5m]))

# Bytes received from S3 (download volume)
sum(rate(istio_response_bytes_sum{destination_service_name=~".*s3.*"}[5m]))

# Error rate to S3
sum(rate(istio_requests_total{destination_service_name=~".*s3.*", response_code!="200"}[5m]))
/
sum(rate(istio_requests_total{destination_service_name=~".*s3.*"}[5m]))

# Latency to GCS
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=~".*storage.googleapis.*"}[5m])) by (le))
```

## Signed URLs and Presigned URLs

If your application generates presigned URLs for direct client access to S3/GCS, the presigned URL requests come from outside the cluster and do not go through Istio. Only the URL generation call (which is to the AWS SDK, not S3 itself) goes through the mesh.

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
apiVersion: networking.istio.io/v1beta1
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
      protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
---
# DestinationRule for S3
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: aws-s3
  namespace: default
spec:
  host: "*.s3.us-east-1.amazonaws.com"
  trafficPolicy:
    tls:
      mode: SIMPLE
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
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

If the cluster is not listed in `proxy-config clusters`, the ServiceEntry is not taking effect. Check the namespace and selector. If you see TLS errors, verify the DestinationRule has `tls.mode: SIMPLE`.

Configuring Istio for object storage comes down to two things: making sure external endpoints are reachable (via ServiceEntry or ALLOW_ANY) and setting appropriate timeouts for large transfers. Once those are in place, you get the bonus of traffic visibility and connection management through the mesh.
