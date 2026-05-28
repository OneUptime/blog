# Validation Summary: How to Configure GKE Gateway Controller for Advanced HTTP Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Gateway API
- GKE Gateway Controller
- Gateway, GatewayClass, HTTPRoute, and ReferenceGrant resources
- Google Cloud Application Load Balancers
- kubectl and gcloud CLI

## Sources Consulted
- GKE Gateway deployment guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- GKE GatewayClass capabilities: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/gatewayclass-capabilities
- GKE Gateway security and certificate management: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/gateway-security
- GKE secure Gateway guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-gateway
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API query parameter matching guide: https://gateway-api.sigs.k8s.io/guides/http-query-param-matching/
- Google Cloud Load Balancing custom headers documentation: https://docs.cloud.google.com/load-balancing/docs/https/custom-headers-global

## Issues Found
- The prerequisites said Gateway API was enabled by default on most clusters. GKE documentation says Gateway API must be enabled before using Gateway resources, with Autopilot listed as enabled by default in the GatewayClass capabilities table. I changed the text to instruct readers to enable Gateway API and added the documented `gcloud container clusters update --gateway-api=standard` command.
- The prerequisites gave a broad GKE 1.24-or-later statement without noting feature-specific version requirements. GKE documentation states custom request and response headers, path redirects, and URL rewrites require GKE 1.27 or later. I added that caveat.
- The Gateway example referenced `kind: ManagedCertificate`, but the GKE Gateway controller does not support the `ManagedCertificate` resource. I changed the example to use a Kubernetes TLS `Secret` in `certificateRefs`.
- The request header modification example used `%START_TIME%`, which is not a Google Cloud Load Balancing custom header variable. I changed it to the supported `{client_region}` variable.

## Review Notes
The remaining Gateway API examples use supported `HTTPRoute` fields for GKE, including exact header matching, method matching, query parameter matching support, backend weights, URL rewrites, redirects, and cross-namespace `ReferenceGrant` access control. GKE Gateway support varies by GatewayClass, so production readers should still check the current GatewayClass capabilities table for their chosen class.
