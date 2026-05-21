# Validation Summary: How to Handle Non-HTTP Services in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio traffic management
- Kubernetes Services and Deployments
- Istio VirtualService and DestinationRule resources
- Istio AuthorizationPolicy and PeerAuthentication resources
- Istio ServiceEntry for external services
- TCP telemetry with Prometheus
- PostgreSQL, RabbitMQ, Kafka, MySQL, MongoDB, and Redis protocols

## Sources Consulted
- Istio Protocol Selection: https://preliminary.istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The post said the MySQL, MongoDB, and Redis port prefixes automatically provide protocol-specific filters with better metrics and handling. Istio documents these as experimental application protocol support that must be enabled explicitly; otherwise traffic is treated as opaque TCP. Updated the text to recommend `tcp-` as the safer default for most database deployments.
- The read-replica example could imply Istio can split PostgreSQL reads and writes by SQL content. Istio TCP routing cannot inspect SQL statements, so the section now states that clients must use separate service names or ports for primary and read-only traffic.
- The mTLS section described database client TLS plus Istio mTLS as a double-encryption conflict. Application-level TLS can work inside Istio mTLS; it is only redundant or operationally undesirable in some deployments. Updated the explanation to make disabling database TLS an option, not a requirement.
- The external PostgreSQL example used `tls.mode: SIMPLE` as if it handled PostgreSQL TLS negotiation. Istio `SIMPLE` originates standard TLS to upstreams that expect TLS from the first byte, while PostgreSQL has its own SSL negotiation. Removed `tls.mode: SIMPLE` from the PostgreSQL example and clarified when to use client-side PostgreSQL TLS instead.

## Review Notes
The remaining Istio API versions and field names are current for the documented resources. Short host names such as `postgres` work when the Istio resources are in the same namespace as the service, but fully qualified service names reduce namespace-related misconfiguration risk.
