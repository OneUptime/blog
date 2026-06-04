# Validation Summary: How to Configure Kyverno Policy Exceptions for Specific Namespaces or Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy
- Kyverno PolicyException
- Kubernetes RBAC
- kubectl
- Kyverno policy reports and metrics

## Sources Consulted
- Kyverno Policy Exceptions documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Policy Settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno Metrics reference: https://kyverno.io/docs/reference/metrics/
- Kyverno latest install manifest / CRD schema: https://github.com/kyverno/kyverno/releases/latest/download/install.yaml
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post used `apiVersion: kyverno.io/v2beta1` for `PolicyException`. The latest Kyverno CRD serves `kyverno.io/v2` and marks `v2beta1` deprecated, so all classic `PolicyException` examples were updated to `apiVersion: kyverno.io/v2`.
- The initial `ClusterPolicy` used deprecated `spec.validationFailureAction`. Kyverno now recommends `spec.rules[*].validate.failureAction`, so the example was updated to put `failureAction: Enforce` under the validate rule.
- The explanation said exceptions are scoped to namespaces in a way that implied the exception namespace must match the target resource namespace. Kyverno documents `PolicyException` as namespaced, but not correlated with the matched resource namespace, so the wording was corrected.
- The post implied PolicyExceptions work immediately after creating the resource. Kyverno disables PolicyExceptions by default and requires administrators to enable them and configure allowed exception namespaces, so a note was added.
- The subject-based exception used admission request user information without disabling background evaluation. Kyverno forbids user information in background-scanned exceptions, so `background: false` was added.
- The wildcard example used an invalid wildcard namespace for the exception object and omitted required `ruleNames`. It was changed to place the exception in a real namespace and use `ruleNames: ["*"]` for named policies, matching Kyverno's documented wildcard support.
- The metrics command searched for a non-documented `policy_exception` metric. It was updated to inspect `kyverno_policy_results`, which is the documented policy execution metric.

## Review Notes
Kyverno's newer documentation increasingly emphasizes CEL-based policy types under `policies.kyverno.io`, while this article focuses on classic `ClusterPolicy` and classic `kyverno.io/v2` `PolicyException` resources. The guide is valid for that classic policy model after the corrections above.
