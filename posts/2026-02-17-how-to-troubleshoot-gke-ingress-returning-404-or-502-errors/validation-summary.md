# Validation Summary: How to Troubleshoot GKE Ingress Returning 404 or 502 Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Ingress, Service, Deployment, Endpoints, and EndpointSlices
- Google Cloud Application Load Balancing
- Google Cloud BackendConfig
- Google Cloud Network Endpoint Groups (NEGs)
- kubectl
- gcloud CLI

## Sources Consulted
- GKE Ingress for Application Load Balancers: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE Ingress configuration and BackendConfig health checks: https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- GKE Ingress health check troubleshooting: https://cloud.google.com/kubernetes-engine/docs/troubleshooting/ingress-health-checks
- GKE load balancing overview: https://cloud.google.com/kubernetes-engine/docs/concepts/about-load-balancing
- Configure Ingress for external Application Load Balancers: https://cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
- Kubernetes Ingress path types: https://kubernetes.io/docs/concepts/services-networking/ingress/
- gcloud compute backend-services get-health reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- gcloud compute network-endpoint-groups list-network-endpoints reference: https://cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/list-network-endpoints
- Cloud Load Balancing health check behavior: https://cloud.google.com/load-balancing/docs/health-check-concepts

## Issues Found
- The architecture overview implied that both 404 and 502 errors typically mean the load balancer cannot find a healthy backend. This was inaccurate for 404s, which commonly come from no matching host or path rule and the default backend. Updated the sentence to distinguish 404 routing/default-backend behavior from 502 backend connectivity or health behavior.
- The 502 section stated that a load balancer returns 502 whenever no backend passes the health check. Google Cloud documents different status codes for different Application Load Balancer types, so the sentence now scopes the 502 behavior to the classic external Application Load Balancer used by GKE external Ingress.
- The health check section stated that GKE Ingress health checks default to `/` on the serving port. GKE can derive health checks from BackendConfig, compatible readiness probes, or defaults, and BackendConfig defaults use `/` and port 80 when omitted. Updated the text to reflect the documented precedence and avoid overstating the default behavior.
- The port mismatch guidance did not distinguish NEG/container-native backends from instance group backends for BackendConfig health check ports. Added the documented distinction: use a serving Pod `containerPort` for container-native load balancing and the Service `nodePort` for instance group backends.
- The Deployment YAML example used `apps/v1` but omitted the required `spec.selector` and matching Pod template labels. Added a selector and `template.metadata.labels` so the example is syntactically valid.

## Review Notes
The post is technically relevant and current. The commands and major configuration fields are valid. The `kubectl get endpoints` command still works, but EndpointSlices are the modern Kubernetes API and could be added in a future enhancement for more detailed endpoint debugging.
