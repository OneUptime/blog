# Validation Summary: How to Control Outbound Traffic with Istio Egress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Egress Gateway
- Kubernetes
- Envoy
- Prometheus and Grafana
- TLS and mutual TLS

## Sources Consulted
- Istio Egress Gateways: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio Egress Gateways with TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio rate limiting with Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio supported releases and Kubernetes versions: https://istio.io/latest/docs/releases/supported-releases/

## Issues Found
- The prerequisites stated "Kubernetes cluster (1.23+)", which is not accurate for current supported Istio releases. Changed it to require a Kubernetes version supported by the chosen Istio release.
- The Istio networking examples used `networking.istio.io/v1beta1`. Updated them to the current documented `networking.istio.io/v1` API version.
- The HTTPS egress gateway passthrough example incorrectly described an HTTP request and added a `DestinationRule` that would originate TLS to the external service. Changed the flow to HTTPS/TLS passthrough and replaced the external TLS origination rule with an egress gateway subset rule matching the official Istio pattern.
- The TLS origination gateway example accepted plain HTTP at the egress gateway. Updated it to use an Istio mutual TLS gateway listener and a subset `DestinationRule` for sidecar-to-egress-gateway traffic, while keeping SIMPLE TLS origination for the external service.
- The external mTLS example mounted certificate files directly into the egress gateway and referenced file paths in `DestinationRule`. Updated it to use `credentialName` with a Kubernetes Secret containing `tls.crt`, `tls.key`, and `ca.crt`, matching Istio SDS-based guidance.
- The AuthorizationPolicy example used `operation.hosts` for TLS/TCP-style egress gateway traffic and added a separate "deny-all" policy with misleading precedence comments. Removed the HTTP-only host matches from those rules and clarified that unmatched requests are denied once an `ALLOW` policy selects the gateway workload.
- The Telemetry resource used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`.
- The HTTP local rate limiting section did not mention that the HTTP filter applies to HTTP-routing flows and tested with a local `curl` outside the mesh. Added the HTTP-flow caveat and changed the test command to execute from a mesh workload.
- The production passthrough example combined TLS passthrough with external TLS origination settings. Removed the incorrect external TLS origination mode and added gateway subset routing plus a separate external-service resilience `DestinationRule`.

## Review Notes
The YAML snippets were parsed locally for syntax. `kubectl` and `istioctl` were not installed in the review environment, so live cluster validation and `istioctl analyze` could not be run.
