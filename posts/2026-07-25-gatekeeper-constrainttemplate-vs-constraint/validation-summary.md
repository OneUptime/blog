# Validation Summary: ConstraintTemplate vs Constraint in Gatekeeper: Why Do You Need Both?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OPA Gatekeeper
- Kubernetes
- ConstraintTemplates and Constraints
- Rego
- CEL
- OpenAPI v3 structural schemas
- Gator
- kubectl

## Sources Consulted

- [Gatekeeper: How to use Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/)
- [Gatekeeper: Constraint Templates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper: Handling Constraint Violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper: The gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper v3.23.0 release](https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.23.0)
- [OPA Constraint Framework: ConstraintTemplate API types](https://pkg.go.dev/github.com/open-policy-agent/frameworks/constraint/pkg/core/templates)
- [Kubernetes: Extend the Kubernetes API with CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#specifying-a-structural-schema)
- [Kubernetes: kubectl api-resources](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Open Policy Agent: Object built-ins](https://www.openpolicyagent.org/docs/policy-reference/builtins/object)
- [Open Policy Agent: Rego `not` keyword](https://www.openpolicyagent.org/docs/policy-reference/keywords/not)

## Issues Found

No technical issues found.

## Review Notes

- The exact ConstraintTemplate and Constraint snippets were compiled with Gator v3.23.0. A matching Deployment with the configured label passed, while a matching Deployment without the label produced the expected `warn` violation.
- The example uses the supported `spec.targets[].rego` field and Rego v0 syntax. Current Gatekeeper documentation recommends the `code` array for newly authored templates, but the shown form remains valid in Gatekeeper v3.23.
- The `warn` enforcement action requires Gatekeeper v3.4 or later and Kubernetes v1.19 or later.
- `kubectl get k8srequiredteam -A` is valid but the `-A` flag is redundant because Gatekeeper Constraints are cluster-scoped.
