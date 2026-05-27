# Validation Summary: How to Use OPA Gatekeeper for Kubernetes Policy Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Open Policy Agent (OPA)
- OPA Gatekeeper
- Rego
- Helm
- kubectl
- jq
- OneUptime

## Sources Consulted
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper "How to use Gatekeeper" documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper constraint violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper metrics and observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper Helm chart values and templates: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
- Gatekeeper Library "Disallow tags" policy: https://open-policy-agent.github.io/gatekeeper-library/website/validation/disallowedtags/
- Gatekeeper Library "Required Resources" policy: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources/

## Issues Found
- The Helm install command set `audit.replicas=1`, but the official Gatekeeper Helm chart hard-codes the audit deployment to one replica and does not expose an `audit.replicas` value. Removed the unsupported value and kept `--set replicas=3` for the controller manager replicas.
- The `K8sBlockLatestTag` and `K8sRequireResourceLimits` ConstraintTemplates used `templates.gatekeeper.sh/v1` but did not define a structural `spec.crd.spec.validation.openAPIV3Schema`. Added `openAPIV3Schema.type: object` to both templates, matching the v1 ConstraintTemplate structural schema requirement.
- The no-tag image check used `not contains(container.image, ":")`, which incorrectly treats registry ports such as `registry.example.com:5000/app` as image tags. Changed the check to inspect only the final image path segment, matching the approach used by the official Gatekeeper Library disallowed-tags policy.

## Review Notes
- The examples use Gatekeeper's legacy `spec.targets[].rego` field with Rego v0 syntax, which remains valid. Gatekeeper's Rego v1 syntax is opt-in through `spec.targets[].code[].source.version: "v1"`.
- The sample workload policies inspect `spec.template.spec.containers` for Deployment, StatefulSet, and DaemonSet resources. Future improvements could expand them to init containers or Pod resources if the post needs broader coverage.
