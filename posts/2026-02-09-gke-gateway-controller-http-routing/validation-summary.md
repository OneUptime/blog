# Validation Summary: How to Use GKE Gateway Controller for Advanced HTTP Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Google Kubernetes Engine (GKE)
- GKE Gateway Controller
- GKE multi-cluster Gateway
- HTTPRoute routing, filters, and weighted backendRefs
- Google Cloud Load Balancing
- Certificate Manager and Kubernetes TLS Secrets
- GKE HealthCheckPolicy
- gcloud and kubectl

## Sources Consulted
- GKE Gateway API overview: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/gateway-api
- Deploying GKE Gateways: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- GKE multi-cluster Gateways overview: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/multi-cluster-gateways
- GKE Gateway security: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-gateway
- GKE Gateway resource policies and HealthCheckPolicy: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/configure-gateway-resources
- Kubernetes Gateway API HTTPRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Kubernetes Gateway API traffic splitting guide: https://gateway-api.sigs.k8s.io/guides/user-guides/traffic-splitting/
- Kubernetes Gateway API redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/

## Issues Found
- Updated Gateway and HTTPRoute manifests from `gateway.networking.k8s.io/v1beta1` to `gateway.networking.k8s.io/v1`, matching the current Gateway API Standard channel examples used by GKE.
- Corrected the Gateway API verification command to read `networkConfig.gatewayApiConfig.channel` instead of the old/incorrect add-on path.
- Clarified that `--gateway-api=standard` installs the Gateway API CRDs, and that internal load balancers are selected by using an internal GatewayClass such as `gke-l7-rilb`.
- Fixed the canary HTTPRoute example so a route in the `production` namespace explicitly references the Gateway in `default`, and updated the `kubectl patch` commands to patch the route in `production`.
- Changed header-routing test commands from HTTPS to HTTP because the referenced `external-http` Gateway listener is configured on port 80 only.
- Fixed the multi-cluster Gateway example by using the multi-cluster GatewayClass `gke-l7-global-external-managed-mc` and removing an unsupported multi-cluster annotation.
- Replaced the Ingress-only `ManagedCertificate` Gateway example with Certificate Manager Gateway configuration, noting that GKE Gateway does not support the Ingress `ManagedCertificate` resource.
- Replaced the Ingress-oriented `BackendConfig` and Service annotation health check example with a Gateway-supported `HealthCheckPolicy`.

## Review Notes
The examples are now aligned with current GKE Gateway API documentation. The post still assumes prerequisite GKE setup such as VPC-native clusters, enabled HTTP load balancing, valid Services, DNS records, and required fleet setup for multi-cluster Gateways.
