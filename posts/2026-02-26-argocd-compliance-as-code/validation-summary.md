# Validation Summary: How to Implement Compliance as Code with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes admission control
- OPA Gatekeeper
- Kyverno
- Conftest
- GitHub Actions
- Kustomize

## Sources Consulted
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Gatekeeper Helm installation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/install
- Gatekeeper ConstraintTemplates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper constraint matching and enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- Kyverno installation and Helm chart guidance: https://kyverno.io/docs/installation/
- Kyverno release support information: https://kyverno.io/docs/installation/releases/
- Kyverno policy type overview and deprecation schedule: https://kyverno.io/docs/policy-types/overview/
- Kyverno ValidatingPolicy documentation: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno PolicyException documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno CLI apply reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Conftest usage and output options: https://www.conftest.dev/ and https://www.conftest.dev/output/

## Issues Found
- The Gatekeeper `ConstraintTemplate` used `input.review.object.spec.containers`, but the matching constraint targets `Deployment` and `StatefulSet` resources where containers live under `spec.template.spec.containers`. Updated both Rego rules to use the correct workload path.
- The Gatekeeper `ConstraintTemplate` used `templates.gatekeeper.sh/v1` without a structural schema. Added an explicit empty object schema under `spec.crd.spec.validation.openAPIV3Schema`.
- The Gatekeeper and Kyverno Helm chart pins were outdated. Updated Gatekeeper from `3.15.1` to `3.22.2` and Kyverno from `3.1.4` to `3.8.0`, matching current stable releases available by the review date.
- The Kyverno examples used deprecated `kyverno.io/v1` `ClusterPolicy` resources for Kyverno v1.18-era guidance. Replaced them with stable `policies.kyverno.io/v1` `ValidatingPolicy` examples.
- The Kyverno examples used deprecated `spec.validationFailureAction`. Replaced this with `validationActions: [Deny]` in the new `ValidatingPolicy` examples.
- The privileged-container example required `securityContext.privileged: false` and missed init and ephemeral containers. Replaced it with a CEL validation that allows the field to be unset or false across all container types.
- The non-root example only checked pod-level `spec.securityContext.runAsNonRoot`. Replaced it with a CEL validation that handles pod-level and per-container `runAsNonRoot` across regular, init, and ephemeral containers.
- The Kyverno CLI install step downloaded v1.11.4. Updated the download and extraction commands to v1.18.0 to align with the Kyverno version discussed.
- The Kyverno `PolicyException` example used an older exception shape for legacy policies. Updated it to `policies.kyverno.io/v1beta1` with `policyRefs` and CEL `matchConditions` for a `ValidatingPolicy`.

## Review Notes
The Conftest example remains syntactically correct for current Conftest usage. The Gatekeeper `namespaces: ["production-*"]` matcher is valid because Gatekeeper supports prefix-based globs for namespace matching.
