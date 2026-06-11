# Validation Summary: How to Create Kyverno Policy Exceptions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kyverno PolicyException resources
- Kyverno ClusterPolicy validation rules
- Kubernetes Custom Resources
- kubectl
- Prometheus Operator ServiceMonitor and PrometheusRule
- jq
- Mermaid diagrams

## Sources Consulted
- Kyverno Policy Exceptions documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno Metrics reference: https://kyverno.io/docs/reference/metrics/
- Kyverno Monitoring guide: https://kyverno.io/docs/guides/monitoring/
- Kyverno Policy Reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno PolicyException guardrail sample policy: https://kyverno.io/policies/other/policy-for-exceptions/policy-for-exceptions/
- Kyverno Helm chart templates and values: https://github.com/kyverno/kyverno/tree/main/charts/kyverno
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- PolicyException examples used `apiVersion: kyverno.io/v2beta1`. Updated all PolicyException manifests to the current stable `kyverno.io/v2` API version documented by Kyverno.
- The post implied PolicyExceptions typically live in the `kyverno` namespace. Updated the note to explain they must be created in a namespace allowed by Kyverno's policy exception configuration.
- The post omitted that PolicyExceptions are disabled by default. Added this prerequisite in the introductory explanation.
- The evaluation flow diagram showed a skipped rule directly admitting the resource. Updated the diagram so final admission requires all applicable rules to pass or skip.
- Examples using `request.userInfo` did not disable background processing. Added `spec.background: false` where needed because Kyverno forbids admission-only fields like user information during background scans.
- Several JMESPath condition examples accessed optional labels or annotations without defaults, and annotations with hyphenated names used dot notation. Added defaults and quoted hyphenated annotation keys.
- The guardrail ClusterPolicy used deprecated `spec.validationFailureAction`. Moved enforcement to `rules[].validate.failureAction`, which is the current Kyverno guidance.
- The ServiceMonitor example used an outdated selector and port name. Updated it to match the current Kyverno Helm chart's admission-controller labels and `metrics-port`.
- The Prometheus query examples used the old `kyverno_policy_results_total` spelling. Updated them to the metric name used in Kyverno's current metrics reference.
- The Kyverno log command used an old `app=kyverno` selector. Updated it to select the admission controller label used by current Kyverno chart templates.

## Review Notes
- The local environment did not have `kubectl` installed, so kubectl commands were checked against Kubernetes documentation rather than local `kubectl --help`.
- The Prometheus examples assume Kyverno metrics are enabled and scraped by Prometheus, and that skipped policy results are present in the metric stream.
