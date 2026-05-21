# Validation Summary: How to Quickly Check Authorization Policy Evaluation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio `istioctl`
- Envoy RBAC filter
- Kubernetes and `kubectl`
- SPIFFE workload identities

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization policy dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP RBAC filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter
- Kubernetes `kubectl` reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The CUSTOM action evaluation step was oversimplified. Updated it to state that a matching CUSTOM policy denies only if the external authorizer denies it, after which native DENY and ALLOW evaluation still applies.
- The post stated that a policy in `istio-system` with no selector applies mesh-wide. Updated this to refer to the Istio root namespace, which is usually `istio-system`.
- `istioctl` examples used the shorthand `deploy/` resource form. Updated them to the documented `deployment/` form.
- The SPIFFE identity section said to use the full `spiffe://...` URI in `principals`. Updated it to use Istio's required principal format without the `spiffe://` prefix.
- The RBAC stats examples omitted the HTTP stat prefix. Updated them to show full Envoy stat names ending in `.rbac.allowed`, `.rbac.denied`, `.rbac.shadow_allowed`, and `.rbac.shadow_denied`.
- The dry-run section incorrectly described the `AUDIT` action as dry-run mode. Replaced it with the official `istio.io/dry-run` annotation on an ALLOW or DENY policy and clarified that dry-run results are checked in logs, metrics, or traces.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. `istio.io/dry-run` is documented as an alpha feature, so future updates should re-check this section against the Istio release in use.
