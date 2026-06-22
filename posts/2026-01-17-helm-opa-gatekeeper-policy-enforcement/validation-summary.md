# Validation Summary: Policy Enforcement with Helm and OPA Gatekeeper

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- OPA Gatekeeper
- Rego
- Kubernetes admission control
- Prometheus Operator
- Prometheus alerting

## Sources Consulted
- OPA Gatekeeper Helm chart README: https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/README.md
- OPA Gatekeeper Helm chart values.yaml: https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/values.yaml
- OPA Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper usage and constraints documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- OPA Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- OPA Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus Operator API reference for PodMonitor: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md

## Issues Found
- Several Gatekeeper Helm values in the production configuration were not valid current chart values. Replaced ignored keys such as `webhookConfigurationPriorityClassName`, top-level `podSecurityContext`, top-level namespace exemptions, `mutatingWebhook.enabled`, `externalData.enabled`, `validatingWebhookTimeout`, and `metricsBackend` with current chart values such as `controllerManager.priorityClassName`, `controllerManager.podSecurityContext`, `controllerManager.exemptNamespaces`, `disableMutation`, `enableExternalData`, `validatingWebhookTimeoutSeconds`, and `metricsBackends`.
- Removed `audit.replicas` from the values example because the current Gatekeeper Helm chart hard-codes the audit Deployment replica count to one and does not expose that field as a chart value.
- Updated the container-limits Rego to evaluate both Pods and workload pod templates. The original constraint matched Deployments, StatefulSets, and DaemonSets, but the Rego only looked at `spec.containers`, so it would not catch workload resources.
- Updated the container-limits Rego to detect missing `resources`, missing `limits`, and missing CPU or memory limits reliably by using negated field lookups instead of passing possibly undefined paths into a helper function.
- Replaced the ServiceMonitor example with a PodMonitor example because the Gatekeeper chart exposes a named `metrics` container port on Pods, while its Service does not expose a `metrics` port.
- Replaced the non-existent `gatekeeper_controller_webhook_request_errors_total` alert metric with the documented `gatekeeper_validation_request_count` metric.
- Replaced the controller-down alert expression using an assumed `up{job="gatekeeper"}` label with an `absent(gatekeeper_constraints)` check based on a documented Gatekeeper metric.

## Review Notes
The post is technically relevant and useful. The examples remain version-sensitive because Gatekeeper chart values and metrics can change across releases, so future reviews should compare the snippets against the chart version intended by the article.
