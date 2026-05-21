# Validation Summary: How to Configure ServiceEntry for Google Cloud APIs

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio ServiceEntry
- Istio VirtualService
- Istio DestinationRule
- Istio telemetry metrics
- Google Cloud APIs
- Google Kubernetes Engine metadata server
- Google Cloud Storage
- Pub/Sub
- BigQuery and BigQuery Storage API
- Firestore / Datastore
- Cloud SQL
- Secret Manager
- Artifact Registry / Container Registry

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Google Cloud Storage request endpoints: https://cloud.google.com/storage/docs/request-endpoints
- Pub/Sub service APIs overview: https://cloud.google.com/pubsub/docs/reference/service_apis_overview
- BigQuery REST API reference: https://cloud.google.com/bigquery/docs/reference/rest/
- BigQuery Storage API RPC reference: https://cloud.google.com/bigquery/docs/reference/storage/rpc/
- GKE Workload Identity Federation and metadata server documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google OAuth 2.0 for web server applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Artifact Registry Docker image names: https://cloud.google.com/artifact-registry/docs/docker/names

## Issues Found
- The opening claim said all Google Cloud APIs go through `*.googleapis.com`. This was too broad because authentication, metadata server, registry, and direct database traffic can use other hosts or IPs. Changed the wording to "Most Google Cloud APIs" and scoped the wildcard example to `googleapis.com` endpoints.
- The wildcard ServiceEntry text said it covers every Google Cloud API endpoint. Changed it to say it covers `googleapis.com` API endpoints and that auth endpoints should be added when used.
- The Cloud SQL TCP ServiceEntry used an instance connection name (`my-project:us-central1:my-instance`) as a ServiceEntry host. Istio ServiceEntry hosts are DNS names, optionally with a wildcard prefix, so this was replaced with a valid placeholder DNS name.
- The metadata server warning said authentication fails silently. Changed it to "authentication requests can fail" to avoid overstating failure behavior.
- The timeout examples implied HTTP `VirtualService` request timeouts work for normal HTTPS calls to Google APIs. Istio treats sidecar HTTPS as TLS passthrough, so HTTP request timeouts only apply when Istio observes HTTP traffic, such as a TLS origination pattern. Rewrote this section and adjusted the example destination port to the HTTP service port used in TLS origination.
- The DestinationRule used `maxPendingRequests`, which is not the current Istio `HTTPSettings` field. Replaced it with `http1MaxPendingRequests`.
- The monitoring examples used `istio_requests_total` and `istio_request_duration_milliseconds_bucket` for HTTPS passthrough traffic. Istio only emits those request metrics for HTTP, HTTP/2, and gRPC traffic it can observe. Replaced them with TCP metrics and added a caveat about when HTTP metrics are available.

## Review Notes
The ServiceEntry API version `networking.istio.io/v1` is current. The Google Cloud service endpoint examples are plausible for the services listed, but real applications may need additional service-specific, regional, or registry hosts depending on the client libraries and deployment topology.
