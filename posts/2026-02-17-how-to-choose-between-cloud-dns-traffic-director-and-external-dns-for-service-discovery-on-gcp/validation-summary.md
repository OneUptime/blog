# Validation Summary: How to Choose Between Cloud DNS Traffic Director and External DNS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud DNS
- Cloud DNS private zones, DNS peering, response policies, and routing policies
- Cloud Service Mesh / Traffic Director
- GKE Gateway API HTTPRoute
- GKE multi-cluster Services
- ExternalDNS
- Kubernetes Services and Ingress

## Sources Consulted
- Google Cloud DNS managed zones CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud DNS record sets CLI reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud DNS private zone documentation: https://cloud.google.com/dns/docs/zones
- Google Cloud DNS routing policies and health checks: https://cloud.google.com/dns/docs/routing-policies-overview
- Google Cloud DNS response policy rules reference: https://docs.cloud.google.com/dns/docs/reference/rest/v1/responsePolicyRules
- Cloud Service Mesh overview: https://docs.cloud.google.com/service-mesh/docs/overview
- Cloud Service Mesh supported features with Google Cloud APIs: https://docs.cloud.google.com/service-mesh/docs/service-routing/features
- Cloud Service Mesh Envoy sidecar setup on GKE: https://docs.cloud.google.com/service-mesh/docs/gateway/set-up-envoy-mesh
- GKE multi-cluster Services configuration: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-services
- ExternalDNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS Service source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Traffic Director positioning was outdated. Updated the wording to explain that Traffic Director is now documented as the Traffic Director control plane implementation within Cloud Service Mesh.
- The GKE Traffic Director example used `cloud.google.com/neg: '{"ingress": true}'` and a `networking.gke.io/v1` `ServiceExport`, which did not accurately demonstrate Cloud Service Mesh sidecar injection or routing. Replaced it with a namespace label for Cloud Service Mesh sidecar injection and a `gateway.networking.k8s.io/v1beta1` `HTTPRoute`.
- The canary routing example used the wrong `HTTPRoute` API group and omitted the Service parent reference fields used in GKE Cloud Service Mesh examples. Updated it to `gateway.networking.k8s.io/v1beta1`, added `kind: Service`, `group: ""`, and made the header match type explicit.
- Cloud DNS limitations overstated the lack of health-aware routing and load balancing. Updated the text and decision matrix to reflect Cloud DNS routing policies, including weighted round robin, geolocation, failover, and health checks for supported targets.
- The ExternalDNS deployment pinned `v0.14.0`, which is outdated compared with the current ExternalDNS documentation. Updated the image to `registry.k8s.io/external-dns/external-dns:v0.20.0`.
- The decision matrix understated Traffic Director / Cloud Service Mesh support for VM and non-GKE workloads. Updated the matrix to show VM-to-VM support and note non-GKE constraints.
- The protocol support row listed only HTTP/gRPC for Traffic Director. Updated it to include TCP, matching Cloud Service Mesh supported feature documentation.

## Review Notes
The ExternalDNS deployment remains a concise example and does not include the full RBAC or Google IAM setup required for production use; the post already calls out RBAC and IAM as required configuration. Cloud DNS routing policies can provide DNS-level traffic steering, but they do not replace application-aware service mesh features because DNS resolver caching still applies.
