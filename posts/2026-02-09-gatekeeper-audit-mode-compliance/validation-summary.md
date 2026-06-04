# Validation Summary: How to Configure Gatekeeper Audit Mode for Compliance Reporting Without Blocking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes
- Gatekeeper ConstraintTemplates and Constraints
- Helm
- Prometheus metrics and alerts
- jq

## Sources Consulted
- Gatekeeper Audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper Runtime Flags documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper Metrics & Observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper Operations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/operations/
- Gatekeeper Enforcement Points documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/enforcement-points/
- Gatekeeper Library Required Labels documentation: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/
- Gatekeeper Library Container Limits documentation: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerlimits/
- Gatekeeper Helm chart values and audit deployment templates: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper

## Issues Found
- The `K8sRequiredLabels` examples used `parameters.labels` as a list of strings. Current Gatekeeper Library `K8sRequiredLabels` expects label entries as objects with a `key` field, so the examples were changed to use `- key: "..."`.
- The audit interval example used a ConfigMap with `audit-interval`, which is not how Gatekeeper configures audit frequency. Gatekeeper exposes `--audit-interval`, and the official Helm chart maps that to `auditInterval`, so the example was changed to a Helm values snippet and `helm upgrade` command.
- The `K8sContainerLimits` example matched `apps/Deployment`, but the current Gatekeeper Library template evaluates Pod-level `spec.containers` and `spec.initContainers`. The example was changed to match core `Pod` resources and include the required `cpu` and `memory` parameters.
- The warning example applied a Deployment even though the corrected constraint matches Pods. The command and expected output were changed to `pod.yaml` and `pod/api created`.
- The metrics example port-forwarded `svc/gatekeeper-webhook-service` port 443 and used HTTPS. Gatekeeper exposes Prometheus metrics on port 8888 at `/metrics`, so the example now port-forwards the `gatekeeper-audit` deployment on `8888:8888` and uses HTTP.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so command verification was performed against official documentation and Gatekeeper chart templates rather than local CLI help output.
- Constraint kinds such as `K8sRequiredLabels` and `K8sContainerLimits` require their corresponding ConstraintTemplates to be installed before the constraint examples can be applied.
