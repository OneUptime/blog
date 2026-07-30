# Validation Summary: Policy Guardrail Metrics: Tracking Failed Checks, Exceptions, and Time to Compliance

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Policy as code
- Kyverno
- Open Policy Agent (OPA)
- Kubernetes admission control and PolicyReports
- Prometheus-style metrics and labels
- Compliance and exception lifecycle measurement

## Sources Consulted

- [Kyverno: Policy Reports](https://kyverno.io/docs/guides/reports/)
- [Kyverno: Policy Exceptions](https://kyverno.io/docs/guides/exceptions/)
- [Kyverno: Metrics](https://kyverno.io/docs/reference/metrics/)
- [Open Policy Agent: Decision Logs](https://www.openpolicyagent.org/docs/management-decision-logs)
- [Open Policy Agent: REST API Reference](https://www.openpolicyagent.org/docs/rest-api)
- [Kubernetes: Controlling Access to the Kubernetes API](https://kubernetes.io/docs/concepts/security/controlling-access/)
- [Prometheus: Instrumentation Best Practices](https://prometheus.io/docs/practices/instrumentation/)

## Issues Found

- The event taxonomy combined `skip` and not applicable. In Kyverno, a `skip` result means a resource matched a rule but further evaluation was bypassed, such as when preconditions are not met or a matching `PolicyException` exists. A subject that does not match a rule is not applicable and does not produce that rule evaluation result. The taxonomy now lists these cases separately and warns against treating either as a pass.

## Review Notes

- The metric formulas and lifecycle snippets are conceptual definitions rather than executable code or product configuration.
- Kyverno PolicyReports describe current cluster state and remove results when their resources are deleted; they are not historical event storage.
- Kyverno documents that resources blocked during admission do not appear as failed current-resource PolicyReport entries. Its policy execution metrics or Kubernetes Events should be used for those attempts.
- Kyverno `PolicyException` support is disabled by default and must be enabled and namespace-scoped by operators. Current documentation also permits persisted PolicyReport result types, including `skip`, to be filtered by controller configuration.
- OPA decision logs support the input, result, bundle revision, requester information, timestamp, and decision identifier described in the post, along with masking policies that remove or replace sensitive fields before upload.
- No deprecated commands, invalid configuration fields, or broken referenced documentation links were found.
