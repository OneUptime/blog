# Validation Summary: How to Enforce Resource Limits with Flux CD and Gatekeeper

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Flux CD
- HelmRelease and HelmRepository custom resources
- OPA Gatekeeper
- Rego
- kubectl

## Sources Consulted
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper runtime flags documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper constraint violation and enforcementAction documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper Helm chart values and templates: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization dependency documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Gatekeeper Helm values placed `auditInterval` and `constraintViolationsLimit` under `audit`, but the Gatekeeper chart exposes them as top-level values. Moved them to the correct level.
- The Gatekeeper Helm values used a top-level `exemptNamespaces` key, but the chart uses `controllerManager.exemptNamespaces`. Updated the key and added `postInstall.labelNamespace.extraNamespaces` and `postUpgrade.labelNamespace.extraNamespaces` so `kube-system` and `flux-system` are actually labeled for webhook exemption.
- The resource values were under a top-level `resources` key, but the chart configures controller manager and audit resources through `controllerManager.resources` and `audit.resources`. Updated the example accordingly.
- The maximum resource policy wording said it prevented excessive requests, but the Rego checks limits. Updated the wording and comments to refer to limits.
- The verification command used removed/unsupported `kubectl run --requests` and `--limits` flags. Replaced it with `kubectl run --overrides`, which is supported by current kubectl.
- The Flux `dependsOn` comment implied it could depend directly on Gatekeeper being installed. Clarified that this depends on a Flux Kustomization named `gatekeeper`, matching Flux Kustomization dependency semantics.

## Review Notes
The Rego examples use Gatekeeper's default Rego v0-style ConstraintTemplate syntax, which remains valid. The quantity conversion helpers cover the units used in the examples (`m`, whole CPU cores, `Mi`, and `Gi`), but they are not a full Kubernetes quantity parser.
