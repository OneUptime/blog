# Validation Summary: Why Gatekeeper Blocks New Resources but Misses Existing Policy Violations

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OPA Gatekeeper v3.23 admission, audit, mutation, and violation export
- Kubernetes validating and mutating admission webhooks
- Kubernetes Deployments, StatefulSets, Pods, and workload controllers
- Gatekeeper Constraints, matching, namespace exclusions, and workload expansion
- Rego admission review input
- kubectl and Kubernetes JSONPath
- Prometheus metrics
- Helm-based Gatekeeper deployments

## Sources Consulted

- [Gatekeeper v3.23.x audit documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper v3.23.x runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper v3.23.x operations architecture](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Gatekeeper v3.23.x admission review input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper v3.23.x handling Constraint violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper v3.23.x admission behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper v3.23.x failing closed guidance](https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/)
- [Gatekeeper v3.23.x mutation documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/)
- [Gatekeeper v3.23.x workload resources](https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/)
- [Gatekeeper v3.23.x ExpansionTemplate documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/)
- [Gatekeeper v3.23.x namespace exclusions](https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/)
- [Gatekeeper v3.23.x violation export documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/export/)
- [Gatekeeper v3.23.0 release manifest](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/deploy/gatekeeper.yaml)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes kubectl label reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes kubectl patch reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)

## Issues Found

- The Constraint-status JSONPath example used `{"\\n"}` inside a single-quoted shell argument. kubectl interprets that as an escaped backslash followed by `n`, so the command prints the literal characters `\n` instead of line breaks. It was corrected to the Kubernetes-documented `{"\n"}` form.
- The audit-process diagnostic said to locate a Pod with `--operation=audit` without covering monolithic Gatekeeper layouts. Gatekeeper enables every operation when no `--operation` arguments are supplied, so the guidance now explains both split deployments and the no-flag default.

## Review Notes

- The remaining commands and configuration snippets use current syntax. The `kubectl label` command sends an update, the audit and log inspection commands use supported resource forms and flags, the Constraint match snippet uses the correct core API group for Pods, and the merge patch correctly changes a Deployment's Pod template.
- Gatekeeper's current documentation confirms the 60-second default audit interval, the default 20-entry per-Constraint status cap, `status.auditTimestamp`, `status.totalViolations`, JSON audit events with `event_type: violation_audited`, and the `gatekeeper_violations` metric.
- Gatekeeper workload expansion is beta and only becomes active for targeted resources when an `ExpansionTemplate` is created. Violation export remains alpha in the current documentation. The post describes both features conditionally and does not rely on either being universally configured.
- The `warn` enforcement action requires Gatekeeper v3.4 or later and Kubernetes v1.19 or later. This is not a practical limitation for the current Gatekeeper v3.23 documentation baseline.
- The post correctly distinguishes Gatekeeper's constraint webhook default of `failurePolicy: Ignore` from Kubernetes' generic admission-webhook API default of `Fail`.
