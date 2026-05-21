# Validation Summary: How to Create Custom Validation Rules for Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Open Policy Agent
- Rego
- Conftest
- OPA Gatekeeper

## Sources Consulted
- Istio `istioctl validate` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Conftest official documentation: https://www.conftest.dev/
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- Updated Conftest Rego examples from older `deny[msg]` rule-head syntax to current Rego v1 syntax using `deny contains msg if`, matching current OPA and Conftest documentation.
- Added explicit iteration declarations such as `some i` and `some route in ...` where needed so the examples are valid Rego v1.
- Fixed the generic Rego pattern example by replacing the undefined placeholder expression `some_condition_is_true` with a valid input field check.
- Fixed the DestinationRule mTLS policy so it also denies a resource when `trafficPolicy` or `trafficPolicy.tls` is missing, instead of only handling a present TLS block with a non-`ISTIO_MUTUAL` mode.
- Updated the Gatekeeper install command from v3.14.0 to the current documented release URL, v3.22.2.
- Updated the Gatekeeper ConstraintTemplate example to use the current Rego v1 `targets.code` form with `version: "v1"`.
- Updated Rego unit test examples to use `test_* if` syntax for OPA/Rego v1 compatibility.

## Review Notes
- The policy examples are intentionally opinionated organizational rules, not Istio requirements. The referenced Istio fields and values are valid in the official Istio API documentation.
- Rego snippets were syntax-checked with OPA 1.16.2. The unit test snippet was checked together with the timeout policy it references.
