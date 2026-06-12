# Validation Summary: How to Configure Gatekeeper Constraint Templates

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes admission control
- Open Policy Agent Gatekeeper
- ConstraintTemplates and Constraints
- Rego
- Gator CLI
- Gatekeeper audit, dry-run, and enforcement actions

## Sources Consulted
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage, match, parameters, and enforcementAction documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper AdmissionReview input documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/input/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper data replication documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync/
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper Gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Gatekeeper release page: https://github.com/open-policy-agent/gatekeeper/releases
- OPA Rego built-ins documentation: https://openpolicyagent.org/docs/policy-reference/builtins
- OPA string built-ins documentation: https://openpolicyagent.org/docs/policy-reference/builtins/strings
- Gatekeeper Library allowed repositories template: https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedrepos/
- Google Cloud Policy Controller custom ConstraintTemplate documentation: https://docs.cloud.google.com/kubernetes-engine/policy-controller/docs/how-to/write-custom-constraint-templates

## Issues Found
- The Gatekeeper installation command pinned `v3.14.0`, while official current installation documentation identifies `v3.22.2` as the latest released manifest. Updated the install URL to `v3.22.2`.
- The template name guidance said `metadata.name` must be lowercase with no hyphens. The accurate rule is that the template name must equal the lowercase form of `spec.crd.spec.names.kind`. Updated the comment and explanation.
- The Rego section said the package name must match the ConstraintTemplate name. Gatekeeper examples commonly do this, but it is not a strict requirement. Updated the wording to "commonly matches".
- The audit Config example described `sync.syncOnly` as controlling how often audits run. Official Gatekeeper documentation defines `syncOnly` as data replication configuration. Updated the comments to describe data syncing for audit and referential constraints.
- The `k8sdisallowedtags` `get_tag` helper treated any colon in an image reference as a tag separator, which misclassifies registries with ports such as `localhost:5000/nginx` and digest references. Updated the Rego to inspect only the final image path segment after stripping any digest.

## Review Notes
The post is now technically consistent with current Gatekeeper documentation. The Gator examples match the documented `gator test` and `gator verify` patterns, but this environment did not have `go`, `gator`, `opa`, or `kubectl` available, so commands were verified against official documentation rather than executed locally.
