# Validation Summary: How to Build OPA Gatekeeper Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent (OPA)
- OPA Gatekeeper
- Kubernetes admission control
- Kubernetes CustomResourceDefinitions
- Rego
- Helm
- kubectl
- Conftest
- Gatekeeper gator CLI
- GitHub Actions

## Sources Consulted
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper how-to documentation for ConstraintTemplates, Constraints, match fields, parameters, and enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Gatekeeper OPA version matrix: https://open-policy-agent.github.io/gatekeeper/website/docs/opa-versions/
- OPA string built-ins reference: https://www.openpolicyagent.org/docs/policy-reference/builtins/strings
- Conftest documentation: https://www.conftest.dev/
- Gatekeeper release page: https://github.com/open-policy-agent/gatekeeper/releases

## Issues Found
- The manifest install URL used Gatekeeper `v3.14.0`, which is outdated for a 2026 post. Updated it to the current documented release URL for `v3.22.2`.
- The Conftest example wrote to `policy/k8s-required-labels.rego` before creating the `policy/` directory. Added `mkdir -p policy`.
- The Conftest command used a non-default Rego package but did not set the namespace. Added `--namespace k8srequiredlabels` so Conftest evaluates the example rule.
- The "Gatekeeper's Built-in Testing" ConfigMap example did not match Gatekeeper's documented test suite format. Replaced it with a `test.gatekeeper.sh/v1alpha1` gator `Suite` example using `assertions`.
- The CI example installed `gator` from the old `v3.14.0` release. Updated the download URL to `v3.22.2`.
- The CI example used `gator test --filename=policies/` for policy test suites. Changed it to `gator verify policies/...`, which matches the documented suite runner.
- The CI example used `gator verify --filename=...`, but `--filename` is a `gator test` input flag. Changed manifest validation to `gator test --filename=manifests/ --filename=policies/`.

## Review Notes
The Gatekeeper Rego examples use the traditional Gatekeeper `spec.targets[].rego` style shown in current Gatekeeper documentation. Gatekeeper also supports newer policy-code fields and CEL integration in recent versions, but those are outside the scope of this post.
