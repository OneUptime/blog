# Validation Summary: How to Configure Authorization for TCP Traffic in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio ServiceEntry
- Istio Sidecar and egress gateway concepts
- Kubernetes Services and kubectl
- Envoy RBAC filter
- Prometheus metrics
- TCP services including PostgreSQL, Redis, Kafka, and MySQL

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio TCP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-tcp/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio external services and egress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/ and https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Envoy RBAC network filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/rbac_filter
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- Corrected the statement that Istio simply ignores HTTP fields for TCP authorization. Official Istio docs distinguish ALLOW and DENY behavior: HTTP-only fields make TCP ALLOW rules invalid/non-matching, while missing HTTP attributes in DENY rules are treated as matches.
- Changed the mixed-protocol example from "gRPC stream" to "custom TCP stream" because gRPC is HTTP/2 in Istio protocol handling, not raw TCP.
- Corrected the guidance for services without sidecars. AuthorizationPolicy is enforced on inbound traffic to proxied workloads, not directly on caller outbound traffic, so enforceable external TCP access control requires an egress enforcement point such as an egress gateway.
- Updated the Prometheus example. `UAEX` is an Envoy external authorization response flag, not the right generic indicator for Istio AuthorizationPolicy TCP denials. The post now uses a broader TCP connection response-flag query and keeps Envoy RBAC stats as the direct authorization signal.
- Corrected protocol detection guidance. Istio auto-detects HTTP and HTTP/2; undetected traffic is treated as plain TCP. Server-first protocols such as MySQL are not compatible with automatic protocol selection, so explicit `tcp-` port naming or `appProtocol: tcp` is safer.

## Review Notes
The YAML examples use the current `security.istio.io/v1` and `networking.istio.io/v1` APIs and valid AuthorizationPolicy fields. The examples assume sidecar-mode workloads with mTLS where identity-based source matching is used. In ambient-mode deployments, policy attachment and waypoint behavior may require additional `targetRefs` considerations.
