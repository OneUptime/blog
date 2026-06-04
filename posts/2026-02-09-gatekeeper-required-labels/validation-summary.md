# Validation Summary: How to Implement Gatekeeper Constraints for Required Labels and Annotations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OPA Gatekeeper
- Gatekeeper ConstraintTemplates and Constraints
- Kubernetes labels and annotations
- Kubernetes namespaces, deployments, services, and StatefulSets
- kubectl
- Rego

## Sources Consulted
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper "How to use Gatekeeper" documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper Library Required Labels: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/
- Gatekeeper Library Required Annotations: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredannotations/
- Gatekeeper Audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper Handling Constraint Violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The `K8sRequiredLabels` constraints used `parameters.labels` as an array of strings. The current Gatekeeper Library `K8sRequiredLabels` template expects label entries as objects with a `key` field. Updated all `K8sRequiredLabels` examples to use `- key: ...` and added the official Gatekeeper Library template install command.
- The namespace creation example used `kubectl create namespace test --labels=...`, but `kubectl create namespace` does not provide a `--labels` flag. Replaced it with a dry-run manifest piped through `kubectl label --local` and `kubectl apply`.
- The label value validation section described "allowed patterns" while the custom template checks exact allowed values. Updated the wording to "allowed values."
- The custom `K8sAllowedLabelValues` Rego policy did not reject resources where the configured label was missing. Added a missing-label violation so the example actually enforces the specified label value requirement.

## Review Notes
- The custom annotation ConstraintTemplate uses a simple string array shape, which is valid for the template shown in the post. The official Gatekeeper Library required-annotations template uses a richer object shape with `key` and optional `allowedRegex`, but the post's custom template is internally consistent.
- `kubectl`, `opa`, and `ruby` were not installed in the review environment, so CLI and Rego execution tests could not be run locally. YAML snippets were statically parsed with PyYAML and all YAML code fences parsed successfully.
