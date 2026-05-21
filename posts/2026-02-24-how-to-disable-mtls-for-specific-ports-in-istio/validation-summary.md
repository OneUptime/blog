# Validation Summary: How to Disable mTLS for Specific Ports in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS
- Istio AuthorizationPolicy
- Kubernetes Services and pod probes
- Prometheus metrics scraping
- kubectl
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post showed a namespace-wide PeerAuthentication using `portLevelMtls` without a selector. Istio documents that `portLevelMtls` only applies when a workload selector is specified, so the example was changed to a workload-selected policy and the explanatory text was corrected.
- The post said Istio automatically handles HTTP probes but listed TCP probes as a case where that does not work. Istio rewrites Kubernetes HTTP, TCP, and gRPC probes by default, so the health-check text was corrected to focus on disabled probe rewrite and external/custom health checkers.
- The monitoring-agent example used port 8126 as an inbound application exception, but that port is commonly associated with APM agent trace intake rather than an application port that node agents scrape. The example was changed to a generic custom monitoring endpoint and clarified that users should use their actual inbound workload ports.
- The AuthorizationPolicy section described authorization as HTTP-layer only and suggested principals could restrict plaintext clients after mTLS was disabled. Istio AuthorizationPolicy can apply to HTTP and TCP traffic, but principal, namespace, and service account identity fields require mTLS-derived peer identity. The wording was corrected.
- The post did not mention that `DISABLE` mode is unsupported in Istio ambient mode. A short caveat was added so the `DISABLE` examples are clearly scoped to sidecar mode workloads.

## Review Notes
The YAML snippets use the current `security.istio.io/v1` Istio security APIs, and the `kubectl run` and `istioctl x describe pod` commands match current official command references. Local `kubectl` and `istioctl` binaries were not installed in the review environment, so CLI verification used official documentation instead of local `--help` output.
