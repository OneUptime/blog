# Validation Summary: How to Deploy GKE Ingress Controller with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Ingress
- Google Cloud HTTP(S) Load Balancing
- GKE ManagedCertificate
- GKE FrontendConfig
- GKE BackendConfig
- Network Endpoint Groups (NEGs)
- Flux Kustomization
- Kustomize
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud GKE Ingress concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Google Cloud GKE Ingress configuration: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Google Cloud GKE managed certificates: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-traffic-management
- Google Cloud SDK `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post stated that either `kubernetes.io/ingress.class: gce` or `ingressClassName: gce` would cause GKE to provision an external HTTP(S) Load Balancer. GKE documentation says GKE continues to rely exclusively on the `kubernetes.io/ingress.class` annotation and ignores `ingressClassName`, so this wording was corrected.
- The sample Service used `NodePort`, while the BackendConfig health check specified port `80`. For instance group backends, a custom BackendConfig health check port must match a Service `nodePort`; port `80` is appropriate for container-native load balancing. The Service was changed to `ClusterIP` with `cloud.google.com/neg: '{"ingress": true}'` so the custom health check port matches the Pod container port.
- The BackendConfig health check used `/healthz`, but the sample `nginx:1.27` application does not expose that path by default. The health check path was changed to `/`, matching the sample readiness probe and nginx default response.
- The troubleshooting note said to ensure the Service is `NodePort`. It was updated to also include `ClusterIP` Services with NEGs enabled, which GKE supports for Ingress.

## Review Notes
- The FrontendConfig and BackendConfig API versions and annotations match current GKE documentation.
- The managed certificate manifest and annotation are valid, but certificate provisioning can take significantly longer than initial load balancer provisioning.
- The Flux Kustomization example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `sourceRef`, `path`, `prune`, and `healthChecks` fields.
