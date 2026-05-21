# Validation Summary: How to Set Up Mutual Authentication for Microservices with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Mutual TLS
- Kubernetes
- Envoy sidecars
- PeerAuthentication
- DestinationRule
- AuthorizationPolicy
- Prometheus metrics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio SPIRE integration identity format reference: https://istio.io/latest/docs/ops/integrations/spire/

## Issues Found
- The post said Istio has three mTLS modes. PeerAuthentication also defines `UNSET`, so the wording was changed to say these are the modes users most often set.
- The mesh-wide PeerAuthentication example said applying the policy in `istio-system` makes it mesh-wide. This is correct for the default root namespace, but Istio documents this as the configured root namespace, so a clarifying sentence was added.
- The port-level PeerAuthentication section did not specify that `portLevelMtls` keys refer to workload/container ports rather than Kubernetes Service ports. The text was updated to make that explicit.
- The migration section used `istioctl experimental authz check` as a way to monitor mTLS traffic. That command checks AuthorizationPolicy propagation, not mTLS traffic usage. The step was changed to point at traffic metrics, which the post already covers immediately afterward.
- The PromQL example did not filter `istio_requests_total` to destination-reported metrics. Istio documents `connection_security_policy` as populated with `mutual_tls` for destination reports, while source reports can be `unknown`, so the query was updated with `reporter="destination"`.

## Review Notes
The examples use current Istio `security.istio.io/v1` and `networking.istio.io/v1` APIs. `istioctl x describe` is part of Istio's experimental describe command group, but it is acceptable here as a diagnostic example.
