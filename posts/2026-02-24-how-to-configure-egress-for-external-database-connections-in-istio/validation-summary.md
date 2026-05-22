# Validation Summary: How to Configure Egress for External Database Connections in Istio

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio Gateway and VirtualService
- Istio egress gateway
- Envoy and Istio TCP metrics
- PostgreSQL / Amazon RDS
- MySQL / Cloud SQL
- MongoDB Atlas / Amazon DocumentDB
- Redis / Amazon ElastiCache
- Amazon OpenSearch Service
- Kubernetes kubectl

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio TCP metrics task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Amazon RDS PostgreSQL SSL documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Amazon ElastiCache in-transit encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- MongoDB Atlas security FAQ: https://www.mongodb.com/docs/atlas/reference/faq/security/
- Amazon OpenSearch Service VPC documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html

## Issues Found
- The database traffic overview said some databases use STARTTLS. This was too imprecise for the examples because PostgreSQL and MySQL use protocol-specific TLS negotiation rather than standard STARTTLS. Changed the wording to "negotiate TLS after the connection starts."
- The MongoDB Atlas ServiceEntry used `name: tcp-mongo` with `protocol: TLS`. Istio supports port naming as `<protocol>[-<suffix>]`, so the example now uses `name: tls-mongo`.
- The Redis cluster example used a wildcard host with `resolution: NONE` and raw `protocol: TCP`. Istio warns that `NONE` for a TCP port without addresses can allow traffic to any IP on that port, and raw TCP cannot be constrained by wildcard hostnames the way TLS/SNI can. Changed the example to list explicit Redis endpoints with `resolution: DNS`.
- The troubleshooting section suggested trying `protocol: TLS` when a database requires TLS. That is incorrect for protocols such as PostgreSQL and MySQL where TLS negotiation does not begin with a standard TLS ClientHello. Updated the guidance to keep those as `protocol: TCP` and use `protocol: TLS` only for connections that start with a TLS ClientHello and can be matched by SNI.
- The summary overgeneralized "TCP for unencrypted" and "TLS for encrypted." Updated it to distinguish opaque database protocols from standard TLS/SNI traffic.

## Review Notes
- The Istio API snippets use the current `networking.istio.io/v1` API for ServiceEntry, DestinationRule, Gateway, and VirtualService.
- The egress gateway example is valid as a simplified TCP routing pattern, but production meshes with strict mTLS may also need a DestinationRule for traffic from workloads to the egress gateway, following Istio's egress gateway examples.
- OpenSearch Service commonly accepts domain traffic on ports 80 and 443; using TLS on 443 is appropriate for HTTPS access.
