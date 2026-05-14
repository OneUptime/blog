# Validation Summary: How to Manage Gatekeeper Constraint Templates with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Flux Kustomization
- OPA Gatekeeper
- Gatekeeper ConstraintTemplates
- Gatekeeper Constraints
- Rego
- Kubernetes Pods and security context fields
- kubectl

## Sources Consulted
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper how-to documentation for ConstraintTemplates, Constraints, match fields, parameters, and enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper workload resource expansion documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The repository structure listed `restrict-host-ports.yaml`, but the post later defines `restrict-host-network.yaml`. Updated the structure to use the same filename as the example.
- The repository structure omitted `require-resource-limits.yaml`, even though the post includes that template. Added it to the general templates list.
- The resource limits section title and intro said it only enforced limits, but the Rego also enforces requests. Updated the section title and intro to say "requests and limits".
- The constraint examples matched `Deployment`, `StatefulSet`, and `DaemonSet` while the Rego templates read Pod-shaped fields such as `input.review.object.spec.containers`. Workload resources use pod templates under `spec.template.spec`; Gatekeeper's workload-resource validation requires either workload-aware Rego or expansion support. Updated the example constraints to match `Pod` resources only so the provided Rego evaluates the object shape it actually expects.

## Review Notes
The Gatekeeper `templates.gatekeeper.sh/v1` examples include structural `openAPIV3Schema.type: object`, which is required for v1 ConstraintTemplates. The examples use the legacy `spec.targets[].rego` form, which is still supported, though current Gatekeeper documentation also describes newer `spec.targets[].code[]` engine configuration for Rego v1 and CEL. The Flux `Kustomization` examples use current `kustomize.toolkit.fluxcd.io/v1` fields. `kubectl`, `flux`, and `opa` were not installed locally, so CLI execution and Rego parsing were checked against official documentation rather than run against a live cluster.
