# Validation Summary: How to Build a Self-Service Developer Platform with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 (Kustomization, GitRepository CRDs)
- Kubernetes (Namespaces, RBAC, ResourceQuota)
- Kustomize (overlays, patches, JSON 6902 patches)
- Kyverno (ClusterPolicy)
- Bash scripting / GitOps workflow

## Sources Consulted
- Flux Kustomize Controller v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source Controller v1 API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization GA announcement (March 2023): https://github.com/fluxcd/kustomize-controller/issues/755
- Kustomize official docs (apiVersion `kustomize.config.k8s.io/v1beta1`)
- Kustomize multiple-`kustomization.yaml` conflict: https://github.com/kubernetes-sigs/kustomize/issues/2256
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Variables documentation: https://kyverno.io/docs/policy-types/cluster-policy/variables/
- Kubernetes ResourceQuota and RBAC reference (rbac.authorization.k8s.io/v1, v1 core)

## Issues Found

1. **Naming conflict: two `kustomization.yaml` files in the same overlay directory.** Step 3 defined the Kustomize config as `tenants/overlays/team-alpha/kustomization.yaml`, while Step 4 also named the Flux `Kustomization` CRD manifest `tenants/overlays/team-alpha/kustomization.yaml`. Kustomize only recognizes one `kustomization.yaml` per directory; including a second file with that exact name as a resource is invalid. Renamed the Flux Kustomization manifest to `apps.yaml`, and updated the `resources:` list in Step 3 to reference `apps.yaml` instead of `kustomization.yaml`.

2. **ResourceQuota namespace never patched in the overlay.** The base `tenants/base/resource-quota.yaml` has `namespace: placeholder`, but Step 3's overlay only contained patches targeting `Namespace` and `RoleBinding`. After applying the overlay, the rendered ResourceQuota would still target the non-existent `placeholder` namespace and would fail to apply. Added a third patch entry in the overlay's `patches:` block targeting `kind: ResourceQuota` that replaces `/metadata/namespace` with `team-alpha`.

3. **Onboarding script in Step 6 didn't copy the renamed file.** After the rename in fix (1), the bash script only copied `kustomization.yaml` and `gitrepository.yaml`, missing the new `apps.yaml`. Added a third `sed` invocation to copy and substitute `apps.yaml` for new tenants.

Minor cleanup: removed `namePrefix: ""` from Step 3 — empty namePrefix is the Kustomize default and added no value (this was bundled with the patches block edit).

## Review Notes

- Flux API versions used (`kustomize.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io/v1`) are correct and GA since Flux v2 stabilization in March 2023.
- Kyverno syntax (`validationFailureAction: Enforce` capitalized, `kyverno.io/v1` ClusterPolicy, `{{ request.object.metadata.namespace }}` variable substitution in `validate.pattern`) is correct. Note: newer Kyverno versions (≥1.10) introduced a per-rule `failureAction` field that supersedes `validationFailureAction`, but the original spec-level field continues to be supported.
- JSON Pointer escaping in patches (`platform.io~1tenant` for the label key containing `/`) is correctly applied per RFC 6901.
- The Kyverno match clause `kinds: ["Kustomization"]` will only match the Flux CRD on the cluster (Kustomize's `kustomize.config.k8s.io/v1beta1` Kustomization is a tooling config, not a Kubernetes resource), so there is no ambiguity at admission time. Authors using both flux- and Argo-style CRDs may still want to fully qualify the kind in future revisions.
- The post assumes a `flux-reconciler` ServiceAccount exists in each tenant namespace but does not create it. This is a reasonable omission given scope, but a follow-up could include a minimal SA + RoleBinding template for least-privilege tenants.
