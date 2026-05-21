# Validation Summary: How to Handle mTLS with Non-Istio Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Istio mutual TLS
- PeerAuthentication
- DestinationRule
- Gateway and VirtualService
- ServiceEntry
- AuthorizationPolicy
- Kubernetes Services and Deployments
- Prometheus metrics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference and external service guidance: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The port-level mTLS example implied that `portLevelMtls` could distinguish two Kubernetes Service ports that both target the same container port. Istio applies `portLevelMtls` by workload port, not Service port, so the Service example was changed to route port 8081 to targetPort 8081 and the explanation now states that separate workload ports are required.
- The sidecar injection example used `sidecar.istio.io/inject` as a pod annotation. Istio documents the annotation form as deprecated in favor of the label, so the example now places `sidecar.istio.io/inject: "true"` under pod template labels.
- The sidecar resource annotation comment described `sidecar.istio.io/proxyCPU` and `sidecar.istio.io/proxyMemory` as limits. Istio documents these annotations as resource requests, so the comment was corrected.
- The AuthorizationPolicy explanation said the rule allowed mesh principals and the IP range. Because separate `from` entries are ORed in an AuthorizationPolicy rule, the wording was corrected to say "or".
- The metrics explanation implied the source workload is always known. Istio standard metrics can report `unknown` when source information is missing, so the text now qualifies that source information is shown when Istio has it.

## Review Notes
- The local environment did not have `istioctl` installed, so CLI syntax was checked against the official Istio command reference rather than local `--help` output.
- The Prometheus query uses the `connection_security_policy` label on `istio_requests_total`, which is still documented in Istio standard metrics. Label availability can vary if telemetry dimensions are overridden.
