# Validation Summary: How to Configure OPA Gatekeeper for Policy Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission control
- Kubernetes CustomResourceDefinitions
- ConstraintTemplate and Constraint resources
- Rego policy language
- Helm
- kubectl

## Sources Consulted
- Gatekeeper Installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper How-to documentation for ConstraintTemplates, Constraints, match fields, enforcementAction, and listing constraints: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper ConstraintTemplate documentation for v1 structural schemas, Rego v0/v1 support, and built-in input variables: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper Handling Constraint Violations documentation for deny, dryrun, and warn enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper OPA version matrix: https://open-policy-agent.github.io/gatekeeper/website/docs/opa-versions/
- Gatekeeper Helm chart values for v3.22.2: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.22.2/charts/gatekeeper/values.yaml
- Gatekeeper Library privileged-containers policy documentation: https://open-policy-agent.github.io/gatekeeper-library/website/validation/privileged-containers/
- Gatekeeper Library repository usage documentation: https://github.com/open-policy-agent/gatekeeper-library

## Issues Found
- The direct manifest install command used Gatekeeper v3.14.0, while the current official installation docs point to v3.22.2. Updated the manifest URL to v3.22.2.
- The Helm command set `audit.replicas=1`, which is not a current Gatekeeper Helm chart value and would be ignored. Removed that setting and kept the valid `replicas=3` value.
- The post stated Gatekeeper policies are impossible to bypass. Gatekeeper admission enforcement depends on webhook availability, scope, and Kubernetes API admission paths, so the wording was softened to avoid an absolute claim.
- The privileged-container example checked only regular containers. Added checks for init containers and ephemeral containers so the policy aligns with the stated container coverage and current Gatekeeper webhook behavior.
- The approved-image-registries example checked only regular containers. Added checks for init containers and ephemeral containers.
- The Gatekeeper Library example applied only the `privileged-containers` directory, which installs the template but not a sample constraint. Added a second command to apply the sample constraint.

## Review Notes
- The examples use legacy Rego v0 syntax through `spec.targets[].rego`, which is still documented by Gatekeeper. Gatekeeper 3.19+ also supports opt-in Rego v1 syntax under `spec.targets[].code[].source.version: "v1"`.
- The Rego snippets were syntax-checked with OPA 0.57.1, the OPA version used by Gatekeeper v3.14.0. The current Gatekeeper docs confirm legacy `spec.targets[].rego` remains supported for v0-style Rego.
