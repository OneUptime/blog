# Validation Summary: How to Configure Flux with OPA Gatekeeper Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Kubernetes
- OPA Gatekeeper
- Gatekeeper ConstraintTemplates and Constraints
- Rego
- Helm

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper Helm chart values and templates: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage and constraint documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/

## Issues Found
- The `HelmRelease` was placed in `gatekeeper-system` while relying on `install.createNamespace: true`. Flux still needs the namespace that contains the `HelmRelease` object to exist before it can apply the object. Changed the `HelmRelease` namespace to `flux-system` and added `spec.targetNamespace: gatekeeper-system`.
- The Gatekeeper Helm values included `audit.replicas: 1`, but the current official chart does not expose `audit.replicas`; the audit Deployment is rendered with one replica by the chart. Removed the unsupported value.
- The comment for `controllerManager.exemptNamespaces` implied that the value alone exempts `flux-system`. Gatekeeper documentation says this Helm value permits use of the `admission.gatekeeper.sh/ignore` label; constraint-level `excludedNamespaces` is what excludes namespaces from the shown constraints. Updated the comment to avoid overstating the behavior.
- The `K8sNoPrivilegedContainers` `ConstraintTemplate` used `templates.gatekeeper.sh/v1` without a structural `openAPIV3Schema`. Added a minimal `type: object` schema.
- The allowed registry policy only checked regular containers, leaving init containers outside the stated image restriction. Added a matching init container check.
- The Flux policy `Kustomization` used `healthChecks` against a `ConstraintTemplate`, which is not a reliable Flux health check target unless the custom resource reports compatible readiness. Removed that health check and clarified that `dependsOn` refers to the Flux `Kustomization` that deploys Gatekeeper.

## Review Notes
- The Rego examples use Gatekeeper's default Rego v0-style `targets[].rego` syntax, which remains valid. Gatekeeper 3.19+ supports Rego v1 syntax as an opt-in alternative under `targets[].code`.
- `controllerManager.exemptNamespaces` only enables namespace-level webhook exemption when the namespace also has the `admission.gatekeeper.sh/ignore` label. The post also excludes `flux-system` directly in the sample constraints, which is the relevant protection for those constraints.
- YAML snippets were parsed successfully after the edits.
