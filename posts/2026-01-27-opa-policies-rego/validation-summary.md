# Validation Summary: How to Write OPA Policies with Rego

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego policy language
- OPA CLI (`opa eval`, `opa test`, `opa run`)
- Kubernetes admission control policies
- Authorization patterns (RBAC and ABAC)

## Sources Consulted
- Open Policy Agent Policy Language documentation: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent CLI reference: https://www.openpolicyagent.org/docs/cli
- Open Policy Agent Policy Testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- Open Policy Agent Time built-ins reference: https://www.openpolicyagent.org/docs/policy-reference/builtins/time
- Open Policy Agent Kubernetes policy primer: https://www.openpolicyagent.org/docs/kubernetes/primer
- Open Policy Agent Regal `import rego.v1` guidance: https://www.openpolicyagent.org/projects/regal/rules/imports/use-rego-v1
- OPA CLI 1.17.1 local validation with `/tmp/opa check`, `/tmp/opa eval`, and `/tmp/opa test`

## Issues Found
- The first `opa eval` examples showed bare `true` output, but OPA's default output format is JSON. Added `--format raw` to match the documented output.
- The variables section incorrectly described `:=` as unification. Updated the explanation to distinguish assignment (`:=`), equality (`==`), and unification (`=`), and corrected the destructuring example wording.
- The ABAC time example did not clarify that `time.clock` expects nanoseconds since epoch or a tuple containing nanoseconds and timezone. Added a note that `input.environment.timestamp` must be nanoseconds since epoch.
- The REPL debugging example used `trace(data.authz.allow)`, but `trace` expects a string note. Replaced it with a valid `trace("checking authz.allow")` example.
- The performance optimization example referenced undefined helper rules, which made the fenced Rego invalid under `opa check`. Added minimal helper rule definitions.
- The policy organization example used literal ellipses inside a `rego` code block, making it invalid syntax. Replaced the placeholders with minimal valid rule bodies.
- The error handling example referenced an undefined `has_permission` rule, which made the fenced Rego invalid under `opa check`. Added a minimal helper rule definition.
- The REPL transcript was fenced as `rego` even though it contained prompt markers. Changed the fence to `text`.

## Review Notes
All fenced Rego policy examples now pass `opa check` with OPA 1.17.1. The testing example was also verified with `opa test -v` and `opa test --coverage`.
