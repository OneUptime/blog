# Validation Summary: How to Use Flux CD with Kubernetes Admission Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD kustomize-controller and helm-controller
- Kubernetes admission webhooks and admission controllers
- Kubernetes server-side dry-run with kubectl
- Kyverno ClusterPolicy validation rules
- OPA Gatekeeper Helm installation, ConstraintTemplates, and constraints
- HelmRepository and HelmRelease resources

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes dynamic admission webhook documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The Flux HelmRelease examples placed the HelmRelease objects in `kyverno` and `gatekeeper-system` namespaces while relying on `install.createNamespace`. Flux cannot create a namespaced HelmRelease object in a namespace that does not already exist. I moved the HelmRelease objects to `flux-system` and set `spec.targetNamespace` so Helm creates the target namespace.
- The Kyverno Helm values used the older `replicaCount` pattern. Current Kyverno installation guidance configures replicas per controller, so I updated the example to use `admissionController.replicas`, `backgroundController.replicas`, `cleanupController.replicas`, and `reportsController.replicas`.
- The Kyverno policies used deprecated top-level `spec.validationFailureAction`. Current Kyverno docs recommend per-rule `validate.failureAction`, so I updated the examples accordingly.
- The Gatekeeper `ConstraintTemplate` used `templates.gatekeeper.sh/v1` without a structural validation schema. I added a minimal `openAPIV3Schema` with `type: object`, matching Gatekeeper v1 ConstraintTemplate requirements.
- The mutating webhook drift section recommended `spec.force: true` as a server-side apply conflict/drift solution. Flux documents `force` as a temporary resource replacement mechanism for immutable-field patch failures, not as a drift-management mechanism. I replaced it with the `kustomize.toolkit.fluxcd.io/ssa: Merge` resource annotation and clarified HelmRelease drift detection/ignore behavior.

## Review Notes
The remaining examples are intentionally minimal. The Gatekeeper privileged-container policy checks regular workload containers but does not check init containers or ephemeral containers; that is acceptable for the stated example but could be expanded in a future hardening-focused post.
