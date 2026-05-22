# Validation Summary: How to Configure Egress Policies for Compliance Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Istio ServiceEntry, Gateway, VirtualService, DestinationRule, Telemetry, PeerAuthentication, and AuthorizationPolicy APIs
- Kubernetes NetworkPolicy and kubectl
- PrometheusRule alerting
- Fluent Bit log forwarding
- PCI DSS, SOC 2, HIPAA, and GDPR compliance concepts

## Sources Consulted
- Istio documentation: Accessing External Services - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio documentation: Egress Gateways - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio documentation: Egress Gateways with TLS Origination - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio API reference: ServiceEntry - https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio API reference: AuthorizationPolicy - https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio API reference: PeerAuthentication - https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio documentation: Envoy Access Logs and Telemetry API - https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PCI Security Standards Council: PCI DSS v4.0 SAQ D for Merchants - https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf

## Issues Found
- The post referenced older PCI DSS requirement numbers for outbound traffic and encryption in transit. Updated the text to PCI DSS v4.0.1 Requirement 1.3.2 for restricted outbound CDE traffic and Requirement 4.2.1 for strong cryptography over open, public networks.
- The logging section described PCI DSS Requirement 10 as logging all access to network resources. Updated it to match PCI DSS language around logging and monitoring for anomaly detection and forensic analysis.
- The TLS origination example showed only a DestinationRule on port 443, which is misleading for workloads that already originate HTTPS/TLS. Replaced it with a ServiceEntry using HTTP port 80 with targetPort 443 and a DestinationRule that originates TLS on port 80, matching the Istio TLS origination pattern.
- The PrometheusRule used an unquoted boolean value for an alert label. Quoted `compliance: "true"` because Kubernetes/Prometheus label values are strings.
- The AuthorizationPolicy example used `operation.hosts` for TLS egress traffic. Updated it to restrict source namespace access to port 443 and clarified that host allow-listing should remain in ServiceEntry, Gateway, and VirtualService because `operation.hosts` only applies to HTTP requests.
- The encryption summary claimed data was encrypted at every hop. Narrowed the claim to mesh-internal hops and the external connection.

## Review Notes
The Istio egress gateway examples follow the current Istio APIs, but production enforcement still depends on infrastructure controls such as NetworkPolicy, firewall, or NAT restrictions to prevent sidecar bypass. The Prometheus alert examples are valid starting points, but real deployments should tune them against actual Istio metric labels and TLS/TCP traffic patterns.
