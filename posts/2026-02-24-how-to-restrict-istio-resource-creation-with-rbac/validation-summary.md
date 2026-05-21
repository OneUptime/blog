# Validation Summary: How to Restrict Istio Resource Creation with RBAC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes RBAC
- Kubernetes admission webhooks
- OPA Gatekeeper
- Kubernetes audit logging
- kubectl

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio dynamic admission webhook overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/

## Issues Found
- The post said a PeerAuthentication resource in the wrong namespace can break mTLS for the entire mesh. Istio applies selector-less mesh-level PeerAuthentication from the root configuration namespace, so I changed this to specify the Istio root configuration namespace.
- The post described `Sidecar` in `istio-system` as mesh-wide. Istio uses the configured root namespace for global default Sidecar configuration, which is often but not always `istio-system`, so I clarified that wording.
- The post said developers bound to the sample role can read all Istio resources. The sample role only grants read access to the listed networking and security resources, so I narrowed the claim.
- The post said a Telemetry resource in `istio-system` applies to every sidecar. Istio applies mesh-wide Telemetry when it is selector-less and placed in the root configuration namespace, so I updated the sentence to include both conditions.
- The post described EnvoyFilter as able to modify any Envoy configuration. Istio documents EnvoyFilter as customizing generated Envoy configuration, so I tightened the wording.

## Review Notes
The RBAC examples use valid Kubernetes RBAC APIs and the RoleBinding-to-ClusterRole pattern correctly scopes namespaced Istio resources to a namespace. The Gatekeeper example is valid as an illustrative HTTP-route policy, but it is intentionally narrow: it does not cover TCP/TLS routes, mirrors, delegates, or every possible service-host format.
