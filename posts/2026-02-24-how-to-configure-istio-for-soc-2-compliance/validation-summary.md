# Validation Summary: How to Configure Istio for SOC 2 Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes custom resources
- Istio PeerAuthentication, AuthorizationPolicy, RequestAuthentication, VirtualService, and IstioOperator configuration
- Envoy access logging and metrics
- Fluent Bit log forwarding
- Prometheus alerting
- SOC 2 Trust Services Criteria

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy access log command operator documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy listener TLS statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Fluent Bit Forward output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/forward
- AICPA Trust Services Criteria overview: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
- AICPA Trust Services Criteria PDF excerpts indexed at: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf

## Issues Found
- The PeerAuthentication verification script only checked top-level `spec.mtls.mode` and would miss `portLevelMtls` overrides that disable or relax mTLS on individual workload ports. Added a port-level check so exceptions are reported.
- The custom access log field named `connection_security_policy` was populated with Envoy's `%DOWNSTREAM_TLS_VERSION%`, which reports the negotiated TLS version rather than Istio's connection security policy label. Renamed the field to `tls_version` and adjusted the explanation.
- The Fluent Bit example used `Parser json` directly on Kubernetes container log files. Kubernetes container logs are usually CRI or Docker-formatted wrapper records, with the application JSON inside the log field. Updated the snippet to use Docker/CRI multiline parsing plus the Kubernetes filter with `Merge_Log` and `Merge_Parser json`.
- The statement that SOC 2 typically requires at least 1 year of log retention was too prescriptive. Reworded it to say SOC 2 does not prescribe one retention period, while many audits expect security logs retained for the audit period, commonly up to 1 year.
- The availability monitoring section was mapped to A1.2, but the metrics shown are a closer fit for A1.1 capacity and current usage monitoring. Updated the section heading and description.
- The metric `envoy_server_ssl_handshake_error` was not supported by the consulted Envoy statistics documentation as a standard metric name. Replaced it with Envoy listener `ssl.connection_error` stats and noted that exported Prometheus metric names vary by listener stat prefix.

## Review Notes
The Istio API versions used in the examples are current. The VirtualService canary example assumes corresponding `DestinationRule` subsets named `stable` and `canary`; that assumption is technically valid but could be made explicit in a future expansion.
