# Validation Summary: How to Build OPA Rego Policy Unit Tests for Kubernetes Admission Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent
- Rego
- OPA policy testing
- Kubernetes admission control

## Sources Consulted
- Open Policy Agent policy testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- Open Policy Agent Kubernetes admission control documentation: https://www.openpolicyagent.org/docs/kubernetes
- Open Policy Agent v1.0 upgrade documentation: https://www.openpolicyagent.org/docs/v0-upgrade
- Local verification with OPA 1.17.0 (`opa test`)

## Issues Found
- The Rego examples used pre-OPA-1.0 rule syntax (`deny[msg] { ... }` and `test_* { ... }`). Updated the policy rules to use `deny contains msg if { ... }` and the test rules to use `if`, matching current Rego syntax requirements.
- The passing test used `not deny[_]`, which is unsafe in current Rego. Changed it to `count(deny) == 0 with input as ...` to assert that no deny messages are produced.
- The command for running a specific test file used `opa test policy_test.rego`, which does not load the policy module. Changed it to `opa test policy.rego policy_test.rego` so the test file and policy file are evaluated together.

## Review Notes
The corrected Rego snippets were extracted from the post and validated with `opa test` using OPA 1.17.0. Both tests passed.
