# Validation Summary: How to Configure Authorization for MongoDB with Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- MongoDB
- Kubernetes Deployments, Services, namespaces, and service accounts
- Envoy sidecars / service mesh TCP traffic

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio TCP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-tcp/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- MongoDB default ports documentation: https://www.mongodb.com/docs/manual/reference/default-mongodb-port/

## Issues Found
- The post said TCP authorization can match on source and destination workload labels via selector. Istio AuthorizationPolicy selectors choose the destination workloads the policy applies to; source labels are not a direct `source` match field. Changed this to "Destination workload labels (via selector)".
- The default-deny test said failures should time out or return "connection refused". Istio RBAC denials commonly surface as generic connection failures rather than specifically connection refused. Changed the wording to "connection error".
- The strict mTLS section said MongoDB itself only accepts connections from services with valid Istio mTLS certificates. PeerAuthentication is enforced by the Istio sidecar/proxy path, not by the MongoDB process directly. Reworded this to say the MongoDB workload's sidecar accepts mesh connections with valid mTLS certificates.

## Review Notes
The policy examples use current `security.istio.io/v1` APIs and valid fields for Istio 1.30-era documentation. Principal and namespace matching require mTLS because those identities are derived from peer certificates. The MongoDB example uses the default `27017` port correctly, and `tcp-mongo` follows Istio's explicit protocol naming convention for opaque TCP traffic.
