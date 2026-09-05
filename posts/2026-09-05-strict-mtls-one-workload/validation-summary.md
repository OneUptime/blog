# Validation Summary: Strict mTLS Breaks One Workload: Find Sidecar Gaps and PeerAuthentication Scope

## Status

validated

## Post Type

Technical troubleshooting guide with Kubernetes commands, jq filters, and Istio policy YAML.

## Technologies Covered

- Istio sidecar mode, Envoy, Istiod, and xDS/SDS
- Mutual TLS, workload certificates, and trust domains
- PeerAuthentication, DestinationRule, and AuthorizationPolicy
- Kubernetes Pods, Services, EndpointSlices, sidecar injection, and NetworkPolicy
- Bash, kubectl, istioctl, curl, and jq
- Prometheus scraping and Kubernetes health probes

## Sources Consulted

- Istio PeerAuthentication: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio authentication policy: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio sidecar injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio injection troubleshooting: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio security model: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio security concepts, policy precedence, and certificate lifecycle: https://istio.io/latest/docs/concepts/security/
- Istio DestinationRule: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio CLI reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio canary upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio security troubleshooting and RBAC logging: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio health probes: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes native sidecars: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Envoy access logging: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- curl manual: https://curl.se/docs/manpage.html
- jq manual: https://jqlang.org/manual/

## Issues Found

1. **Failure reproduction used an inconsistent port and could select another replica.** The curl command addressed Service port 8080, while the Service example exposes port 80 and forwards to workload port 8080. Changed the URL to port 80 and selected the exact failing Pod instead of a Deployment, which can choose a different replica. Added the necessary placeholder explanation.
2. **Proxy readiness was conflated with configuration synchronization.** Pod-specific `proxy-status` compares Envoy and Istiod configuration; it does not establish Kubernetes container readiness. Added a jq readiness field covering both container status arrays and corrected the command explanation.
3. **The endpoint inventory could miss native sidecars.** Kubernetes native sidecars live under `initContainers`. Added that column to the replica inventory and clarified where to find `istio-proxy` when native injection is enabled.
4. **Effective policy resolution omitted important cases.** Replaced vague root-namespace wording with the current reference's explicit warning that selector-bearing PeerAuthentication policies there are ignored. Clarified inheritance for omitted/UNSET modes and oldest-policy selection when policies overlap at the same scope.
5. **Mixed replicas were described as necessarily causing intermittent strict-mTLS failures.** Auto mTLS can use mTLS for injected endpoints and plaintext for unproxied endpoints. Revised the explanation to distinguish non-mesh callers, auto-mTLS callers, and callers with explicit ISTIO_MUTUAL. Clarified that a sidecar-mode policy cannot enforce protection on a Pod lacking a proxy.
6. **Authorization inspection omitted broader policy scope and logging prerequisites.** Changed the policy listing to all namespaces so root-namespace policies are visible. Clarified that relevant request details require access logging or RBAC debug logging, and that an authenticated peer principal is the relevant transport evidence.
7. **Certificate-summary capabilities were overstated.** The short secret summary is useful for validity and serial/date checks, but it does not provide the full identity SAN and trust-root inspection implied by the text. Clarified the distinction and retained the prohibition on exposing private keys.
8. **NetworkPolicy protection against node traffic was overstated.** Standard Kubernetes policy allows traffic from the Pod's hosting node. Revised the mitigation to describe Pod/namespace restrictions and explicitly state the local-node exception and possible CNI-specific host policies.

## Review Notes

- Reviewed the post as a sidecar-mode guide. The DISABLE example is not applicable to ambient mode, as the PeerAuthentication reference explains.
- Confirmed the `security.istio.io/v1` policy shape, workload-port versus Service-port distinction, TLS mode names, revision annotation semantics, and documented CLI argument forms. The Service YAML is a fragment under a Service's `spec`, not a complete deployable manifest.
- The seven official documentation links in the original post resolved to the intended resources. Documentation under `/latest/` is mutable; operators should use documentation and istioctl compatible with their deployed release.
- The PeerAuthentication reference currently contains inconsistent root-selector wording between its introductory warning and generated selector field description. The correction follows its explicit warning and retains a deployed-release caveat.
- `istioctl x describe` remains experimental. Its output is supporting evidence, not a substitute for inspecting policies and effective proxy configuration.
- A transport socket in a cluster establishes that mTLS is configured as an option; endpoint selection and successful traffic/telemetry checks remain necessary to establish its use. The post retains those checks.
- All eight Bash blocks passed `bash -n`. The edited jq inspection was executed against synthetic regular-sidecar and native-sidecar Pod objects; both returned the expected readiness result. The validation JSON parsed successfully, and `git diff --check` passed.
- No live Kubernetes or Istio environment was used, and istioctl was not installed locally. CLI behavior and YAML fields were checked against official references; end-to-end connectivity, certificate rotation, and enforcement were not runtime-tested. No production configuration was changed.
