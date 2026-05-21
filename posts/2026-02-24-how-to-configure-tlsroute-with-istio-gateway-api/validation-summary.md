# Validation Summary: How to Configure TLSRoute with Istio Gateway API

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Kubernetes Gateway API
- Gateway
- TLSRoute
- ReferenceGrant
- Kubernetes Services and Deployments
- TLS passthrough and SNI routing
- istioctl, kubectl, openssl

## Sources Consulted
- Istio documentation: Ingress Gateway without TLS Termination, https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio documentation: Kubernetes Gateway API, https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio command reference: pilot-discovery environment variables, https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes Gateway API documentation: TLSRoute, https://gateway-api.sigs.k8s.io/api-types/tlsroute/
- Kubernetes Gateway API documentation: ReferenceGrant, https://gateway-api.sigs.k8s.io/api-types/referencegrant/
- Kubernetes Gateway API documentation: Hostnames, https://gateway-api.sigs.k8s.io/concepts/hostnames/
- Kubernetes Gateway API specification, https://gateway-api.sigs.k8s.io/reference/spec/

## Issues Found
- The prerequisites used an outdated Gateway API experimental CRD release URL for v1.2.0. Updated the command to the current Istio-documented experimental CRD install command using Gateway API v1.5.1.
- The prerequisites omitted the Istio setting required for alpha Gateway API resources. Added the `istioctl install --set values.pilot.env.PILOT_ENABLE_ALPHA_GATEWAY_API=true --set profile=minimal -y` command because Istio's current TLSRoute examples use `gateway.networking.k8s.io/v1alpha2` TLSRoute resources.
- The wildcard hostname explanation said `*.example.com` catches any subdomain, which could imply multi-label names. Clarified that Gateway API wildcard hostnames match single-label subdomains.
- The cross-namespace backend example discussed ReferenceGrant but the TLSRoute backendRef did not specify a different namespace. Added `namespace: shared-services` to the backendRef and adjusted the surrounding text so the ReferenceGrant example matches the route.

## Review Notes
Gateway API TLSRoute is GA in the Standard channel as of Gateway API v1.5.0, but Istio's current SNI passthrough task still documents alpha Gateway API resources for this workflow. The post remains aligned with Istio's documented `v1alpha2` TLSRoute examples after the prerequisite updates.
