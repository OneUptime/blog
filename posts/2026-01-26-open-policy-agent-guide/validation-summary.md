# Validation Summary: How to Get Started with Open Policy Agent

## Status
validated

## Post Type
Tutorial / getting started guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego
- OPA CLI
- OPA REST Data API
- Docker
- Policy testing with `opa test`
- Policy-as-code integration patterns

## Sources Consulted
- Open Policy Agent Policy Language documentation: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent v1.0 upgrade guide: https://www.openpolicyagent.org/docs/v0-upgrade
- Open Policy Agent CLI reference: https://www.openpolicyagent.org/docs/cli
- Open Policy Agent REST API reference: https://www.openpolicyagent.org/docs/rest-api
- Open Policy Agent Docker deployment documentation: https://www.openpolicyagent.org/docs/deploy/docker
- Open Policy Agent policy testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- Open Policy Agent integration documentation: https://www.openpolicyagent.org/docs/integration
- Local verification with OPA 1.17.1 downloaded from the official latest Linux static binary URL.

## Issues Found
- Several Rego snippets used pre-OPA-1.x rule-body syntax such as `allow { ... }`, `allowed { ... }`, and `valid { ... }`. Updated these examples to Rego v1-compatible `if` syntax so they compile with the current OPA release.
- The validation errors example used `errors[msg] { ... }`, which is invalid for partial set rules in Rego v1. Updated it to `errors contains msg if { ... }`, matching the current `contains` syntax.
- The validation section described the errors rules as a "set comprehension" even though the code uses partial set rules. Updated the wording to avoid a technical mislabel.
- The validation example's `valid` rule returned undefined for invalid input. Added `default valid := false` so the rule behaves as a clear boolean decision.
- The Docker server command published port `8181` but did not bind OPA to all interfaces inside the container. Added `--addr=0.0.0.0:8181`, as required by the official Docker deployment documentation for host access.
- The API authorization HTTP examples queried `/v1/data/api/authz`, which returns the entire package including helper rules and constants, not just the compact response shown in the post. Added a `decision` rule and updated the examples to query `/v1/data/api/authz/decision`.
- The input section said to "Import the 'input' keyword" even though `input` is a built-in document, not imported. Updated the wording to "Use the 'input' document."

## Review Notes
The corrected snippets were spot-checked with OPA 1.17.1 for syntax and expected behavior. The guide now targets current Rego v1 syntax; users running old OPA 0.x versions may need compatibility imports or an upgrade path.
