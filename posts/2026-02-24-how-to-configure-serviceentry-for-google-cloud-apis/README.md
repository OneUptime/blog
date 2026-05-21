# How to Configure ServiceEntry for Google Cloud APIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Google Cloud, GCP, Kubernetes, Service Mesh

Description: Set up Istio ServiceEntry for Google Cloud APIs including storage, Pub/Sub, BigQuery, and other GCP services for mesh observability and control.

---

Most Google Cloud APIs use `*.googleapis.com` service endpoints. When your Kubernetes workloads call GCP services - Cloud Storage, Pub/Sub, BigQuery, Firestore, or other Google Cloud products - those calls need to be registered in Istio's service registry if you want visibility and traffic management in `REGISTRY_ONLY` mode.

Whether you run on GKE or another Kubernetes platform, setting up ServiceEntries for Google Cloud APIs follows the same patterns. The main consideration is that Google Cloud has dozens of API endpoints and you need to decide between a wildcard approach and specific per-service entries.

## The Wildcard Approach

The quickest way to allow Google Cloud API calls that use `googleapis.com` endpoints is a single wildcard ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-apis
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
    - number: 80
      name: http
      protocol: HTTP
  resolution: NONE
```

This covers the `googleapis.com` API endpoints in one shot. You also need to include the `accounts.google.com` and `oauth2.googleapis.com` endpoints for authentication flows that use them:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-auth
spec:
  hosts:
    - "accounts.google.com"
    - "oauth2.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## Per-Service Google Cloud ServiceEntries

For more granular control and better metrics, create separate ServiceEntries for each GCP service:

### Cloud Storage

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-storage
spec:
  hosts:
    - "storage.googleapis.com"
    - "www.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Note: Cloud Storage uses both `storage.googleapis.com` (JSON API) and `www.googleapis.com` (some legacy paths).

### Pub/Sub

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-pubsub
spec:
  hosts:
    - "pubsub.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Pub/Sub client libraries use gRPC by default, but the calls go to port 443 over TLS, so the HTTPS protocol setting works for passthrough.

### BigQuery

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-bigquery
spec:
  hosts:
    - "bigquery.googleapis.com"
    - "bigquerystorage.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

BigQuery uses two endpoints: one for the management API and one for the Storage Read API (used for fast data reads).

### Firestore / Datastore

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-firestore
spec:
  hosts:
    - "firestore.googleapis.com"
    - "datastore.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

### Cloud SQL (Direct Connection)

If you connect to Cloud SQL directly (not through the Auth Proxy):

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-cloudsql
spec:
  hosts:
    - "sqladmin.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

For the actual database connection (if using public IP), create a TCP ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloudsql-instance
spec:
  hosts:
    - cloudsql-instance.example.com
  addresses:
    - 34.123.45.67/32
  location: MESH_EXTERNAL
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 34.123.45.67
```

### Secret Manager

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-secretmanager
spec:
  hosts:
    - "secretmanager.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## GKE Metadata Server

On GKE, pods often call the metadata server for service account tokens:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gke-metadata
spec:
  hosts:
    - "metadata.google.internal"
  addresses:
    - 169.254.169.254/32
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: STATIC
  endpoints:
    - address: 169.254.169.254
```

This is important because GCP client libraries call the metadata server to get access tokens. Without this ServiceEntry in `REGISTRY_ONLY` mode, authentication requests can fail.

## Google Container Registry / Artifact Registry

If your application pulls data from GCR or Artifact Registry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-container-registry
spec:
  hosts:
    - "gcr.io"
    - "us-docker.pkg.dev"
    - "us.gcr.io"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## Adding Timeouts for GCP APIs

Some GCP operations can be slow (BigQuery queries, large GCS uploads). For normal HTTPS calls from your application to Google APIs, Istio treats the connection as TLS passthrough, so HTTP `VirtualService` request timeouts do not apply. Set timeouts in the Google Cloud client library or application HTTP client.

If you use Istio TLS origination, where the application sends plain HTTP to the sidecar and the sidecar originates TLS to the external service, then an HTTP `VirtualService` timeout can apply. In that pattern, the matching ServiceEntry and DestinationRule use an HTTP service port that targets port 443:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: gcp-storage-timeout
spec:
  hosts:
    - "storage.googleapis.com"
  http:
    - timeout: 300s
      route:
        - destination:
            host: storage.googleapis.com
            port:
              number: 80
```

## Connection Pool Configuration

GCP APIs can handle many concurrent connections, but you might want to limit them from your side:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: gcp-connection-pool
spec:
  host: pubsub.googleapis.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        maxRequestsPerConnection: 50
        http1MaxPendingRequests: 100
```

## Verifying GCP ServiceEntries

Test connectivity from a pod:

```bash
# Check if GCP APIs are reachable

kubectl exec deploy/my-app -c my-app -- \
  curl -s -o /dev/null -w "%{http_code}" https://storage.googleapis.com

# Verify Envoy knows about the endpoint
istioctl proxy-config cluster deploy/my-app | grep googleapis

# Check endpoints
istioctl proxy-config endpoints deploy/my-app | grep googleapis
```

## Monitoring GCP API Usage

Once registered, GCP API calls show up in Istio metrics. For normal HTTPS passthrough traffic, use TCP metrics because the sidecar cannot see encrypted HTTP request details:

```bash
# Connections per GCP service
istio_tcp_connections_opened_total{destination_service=~".*googleapis.com"}

# Bytes sent to a specific GCP API
istio_tcp_sent_bytes_total{
  destination_service="bigquery.googleapis.com"
}
```

This is useful for understanding your GCP API usage patterns. You can see which services make the most GCP connections and move the most traffic. HTTP request counts, latency histograms, and response-code error rates require Istio to observe HTTP or gRPC traffic, such as with TLS origination or an egress gateway pattern.

## Complete Setup for a Typical GCP Application

Here is a practical all-in-one configuration for an application that uses several GCP services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-apis
spec:
  hosts:
    - "storage.googleapis.com"
    - "pubsub.googleapis.com"
    - "bigquery.googleapis.com"
    - "secretmanager.googleapis.com"
    - "firestore.googleapis.com"
    - "logging.googleapis.com"
    - "monitoring.googleapis.com"
    - "oauth2.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-auth
spec:
  hosts:
    - "accounts.google.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Start with this and add more endpoints as needed. Every GCP service your application uses should be represented here for complete visibility and control.
