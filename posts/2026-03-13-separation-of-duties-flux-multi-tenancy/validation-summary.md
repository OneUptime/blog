# Validation Summary: How to Implement Separation of Duties with Flux CD Multi-Tenancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD (multi-tenancy, Kustomization, GitRepository)
- Kubernetes RBAC (Role, RoleBinding, ServiceAccount, Namespace)
- Kustomize (`kustomize.config.k8s.io/v1beta1`)
- GitHub CODEOWNERS
- `kubectl` CLI (`auth can-i`, `get events`)
- `flux` CLI (`flux events`)
- `gh` CLI

## Sources Consulted
- Flux multi-tenancy configuration: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/
- `flux bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- `flux events` CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- kustomize-controller `kustomization_types.go`: https://github.com/fluxcd/kustomize-controller/blob/main/api/v1/kustomization_types.go
- `fluxcd/pkg` `meta/reference_types.go`: https://github.com/fluxcd/pkg/blob/main/apis/meta/reference_types.go
- `fluxcd/flux2-multi-tenancy` example repo: https://github.com/fluxcd/flux2-multi-tenancy
- GitHub CODEOWNERS docs: https://docs.github.com/en/repositories/managing-your-repositories-settings-and-customization/customizing-your-repository/about-code-owners

## Issues Found

1. **Non-existent `--multi-tenant` bootstrap flag (Prerequisites).** The post listed `Flux CD bootstrapped with the --multi-tenant flag or with explicit RBAC configuration` as a prerequisite. `flux bootstrap` has no such flag — multi-tenancy lockdown is configured via Kustomize patches applied to the bootstrap manifests (exactly what the post itself shows in Step 1). Changed the prerequisite to `Flux CD bootstrapped with multi-tenancy lockdown patches applied (see Step 1) or with explicit RBAC configuration` so the prerequisite matches reality and the rest of the post.

2. **Invalid wildcard in `healthChecks` (Step 3).** The Kustomization example used:
   ```yaml
   healthChecks:
     - apiVersion: apps/v1
       kind: Deployment
       namespace: team-alpha
       name: "*"
   ```
   `spec.healthChecks` is typed `[]meta.NamespacedObjectKindReference` in the Flux API; `Name` is a required field and must be a concrete resource name — wildcards are not supported. A literal `"*"` would cause the health check to look for a Deployment literally named `*` and never pass. Replaced this block with `wait: true` and `timeout: 5m`, which is the documented way to have Flux wait for all reconciled resources to become ready and preserves the author's intent of "verify the apps come up healthy."

## Review Notes
- `--no-cross-namespace-refs=true` is a valid kustomize-controller and helm-controller flag; the Kustomize patch in Step 1 is correct. Note that for full multi-tenancy lockdown, Flux also documents `--no-remote-bases=true` and `--default-service-account=<name>` as companion flags — not required for the post's correctness but worth knowing.
- The `toolkit.fluxcd.io/tenant` label is a community/example convention from `fluxcd/flux2-multi-tenancy` and Kyverno policy patterns. It is not interpreted by Flux controllers themselves, so the label is harmless metadata; the post does not rely on any controller-side behavior triggered by it, so leaving it as-is is fine.
- `apiVersion: kustomize.toolkit.fluxcd.io/v1` is the current GA API version. `kustomize.config.k8s.io/v1beta1` is correct for the kustomization.yaml file.
- `targetNamespace` only sets the namespace for resources that do not already specify one; resources with an explicit namespace are not rewritten. The post does not make a claim to the contrary, but readers should be aware.
- All `kubectl auth can-i`, `flux events`, `kubectl get events`, and `gh pr list` commands are syntactically valid.
- CODEOWNERS rule precedence is last-match-wins; the example's `/apps/` fallback after the team-specific entries works as intended because more-specific paths declared later in the file take precedence over earlier patterns, but here team-specific paths come *before* the fallback — GitHub still resolves correctly because the fallback `/apps/` is less specific and *later*, and CODEOWNERS uses the last matching pattern. The author's intent is preserved either way for `/apps/team-alpha/` (matches both, last match `/apps/` wins for the fallback rule's owner — which is platform-team). This is a subtle point; the example still achieves SoD because platform-team review is acceptable as an additional approver. Not a correctness bug.
