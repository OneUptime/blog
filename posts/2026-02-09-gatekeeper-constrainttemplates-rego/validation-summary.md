# Validation Summary: How to Write Gatekeeper ConstraintTemplates Using Rego Language

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent
- Rego
- Gatekeeper ConstraintTemplates
- Kubernetes admission validation
- OPA CLI policy testing

## Sources Consulted
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper "How to use Gatekeeper" documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.11.x/howto/
- OPA Policy Testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- OPA CLI Reference: https://www.openpolicyagent.org/docs/latest/cli/
- OPA Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OPA regular expression built-ins documentation: https://www.openpolicyagent.org/docs/policy-reference/builtins/regex

## Issues Found
- The "Accessing Resource Fields" snippet described `spec.containers[_]` as applying to Pods and Deployments. That path is correct for Pods, but Deployments keep containers under `spec.template.spec.containers`. I changed the comment to say "For Pods" only.
- The naming-convention snippet imported `future.keywords.contains` but did not use `contains`. I removed the unused import and kept `future.keywords.if`, which is the keyword actually used by the snippet.
- The test example used a separate `package test`, referenced an unqualified `violation` rule, and tested labels even though the earlier template was for required annotations. I changed the test package to `k8srequiredannotations`, made the input use annotations, and asserted on `count(violations)` so the tests correctly exercise Gatekeeper-style partial-set `violation` rules.

## Review Notes
- Current Gatekeeper documentation still shows legacy `spec.targets[].rego` examples, but also documents an opt-in Rego v1 form under `spec.targets[].code[].source.version: "v1"` and recommends using the `code` array exclusively for newer templates. The post's legacy-style examples are still valid when parsed with OPA v0-compatible syntax.
- Local checks: downloaded the current official OPA Linux binary to `/tmp`, confirmed OPA version 1.17.0, parsed all standalone Rego snippets with `opa parse --v0-compatible`, verified the corrected annotation test with `opa test --v0-compatible`, parsed all YAML snippets with PyYAML, and validated `validation.json` with `jq`.
