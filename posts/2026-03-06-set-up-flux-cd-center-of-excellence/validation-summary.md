# Validation Summary: How to Set Up a Flux CD Center of Excellence

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- GitOps
- Kubernetes
- Kustomize Controller
- Source Controller
- Notification Controller
- Kyverno
- Prometheus and Prometheus Operator
- kube-state-metrics
- Bash
- Mermaid

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The simple Flux Kustomization set `wait: true` while also defining explicit `healthChecks`. Flux documents that `healthChecks` is ignored when `wait` is true, so the snippet now relies on the explicit Deployment health check.
- The Flux Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but current Flux API docs list Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`; only Receiver is available under notification API v1. Updated both resources to v1beta3.
- The Alert example used `.spec.summary`, which is deprecated in the v1beta3 API. Replaced it with `.spec.eventMetadata.summary`.
- The Kyverno policy used deprecated top-level `spec.validationFailureAction`. Moved enforcement to `rules[].validate.failureAction`, per current Kyverno documentation.
- The Kyverno policy message said the policy required `coe.example.com/pattern`, but the actual pattern only enforced `coe.example.com/managed` and `coe.example.com/team`. Updated the message to match the policy.
- The Prometheus examples counted all `gotk_reconcile_condition` status series, which would overcount resources. Updated the examples to count a single Ready status series and compute failure rate against that resource count. Added a note that the compliance metric requires kube-state-metrics custom resource metrics configured for Flux resources and CoE labels.

## Review Notes
The remaining examples are templates and use placeholder values such as `REPLACE_APP_NAME`, `REPLACE_REPO_URL`, and `your-org`, so they require organization-specific substitution before use. The Prometheus compliance query assumes kube-state-metrics is configured to expose Flux custom resource labels with the shown label names.
