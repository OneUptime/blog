# Validation Summary: How to Create Linkerd Authorization Policy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linkerd AuthorizationPolicy
- Linkerd Server, HTTPRoute, and GRPCRoute policy targets
- Linkerd MeshTLSAuthentication and NetworkAuthentication
- Kubernetes ServiceAccounts and namespaces
- Linkerd Helm configuration
- Linkerd Viz and Linkerd CLI

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd Authorization Policy feature guide: https://linkerd.io/2-edge/features/server-policy/
- Linkerd per-route authorization task: https://linkerd.io/2-edge/tasks/configuring-per-route-policy/
- Linkerd GRPCRoute reference: https://linkerd.io/2-edge/reference/grpcroute/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd identity CLI reference: https://linkerd.io/2-edge/reference/cli/identity/
- Linkerd current CRD templates for AuthorizationPolicy, Server, HTTPRoute, MeshTLSAuthentication, and NetworkAuthentication: https://github.com/linkerd/linkerd2/tree/main/charts/linkerd-crds/templates/policy
- Linkerd control-plane Helm values: https://github.com/linkerd/linkerd2/blob/main/charts/linkerd-control-plane/values.yaml

## Issues Found
- The post used `policy.linkerd.io/v1beta3` for `AuthorizationPolicy`, but the current CRD serves `AuthorizationPolicy` as `policy.linkerd.io/v1alpha1`. Updated all `AuthorizationPolicy` examples to `v1alpha1`.
- The post used `group: core` for `Server` targetRefs. `Server` is in the `policy.linkerd.io` API group, so all Server target references were updated.
- The Server examples used `policy.linkerd.io/v1beta2`. The current storage version is `policy.linkerd.io/v1beta3`, so the examples were updated to `v1beta3`.
- The `MeshTLSAuthentication` example combined `identities` and `identityRefs`, but the CRD requires exactly one of those fields. Split it into two alternative examples.
- The policy evaluation diagram said traffic with no `Server` is allowed. Linkerd applies the default inbound policy when no Server selects the port, so the diagram was corrected to route that case through the default action.
- The route-level example labeled `/health` as unauthenticated while including it in a route targeted by an AuthorizationPolicy. Changed the comment and added a separate `admin-routes` example for the later admin policy target.
- The combined mesh and network authentication example described OR behavior within one `requiredAuthenticationRefs` list. Linkerd requires all refs in one list to match, so the example now uses separate `AuthorizationPolicy` resources and explains the semantics.
- The Helm values snippet used non-current `policy.defaultPolicy`, `policy.defaultInboundPolicy`, and `policy.defaultOutboundPolicy` fields. Replaced it with the current `proxy.defaultInboundPolicy` value.
- The audit-mode best-practice example used a namespace annotation. Linkerd audit mode for fine-grained Server policy is configured with `spec.accessPolicy: audit`, so the example now shows that form.
- The debug command decoded a Kubernetes ServiceAccount token and described it as checking client identity. Replaced it with `linkerd identity`, which checks the Linkerd proxy certificate identity.
- The text described AuthorizationPolicy as purely Layer 7 and mesh-identity based. Updated the wording to cover Server-level policies and network authentication accurately.
- The GRPCRoute target reference used the Linkerd policy API group. GRPCRoute is a Gateway API resource, so the example now uses `gateway.networking.k8s.io`.

## Review Notes
The YAML snippets were syntax-checked after editing. The examples now align with current Linkerd edge documentation and CRD templates. Some examples remain intentionally minimal and assume the referenced ServiceAccounts, labels, ports, and Gateway API CRDs already exist in the cluster.
