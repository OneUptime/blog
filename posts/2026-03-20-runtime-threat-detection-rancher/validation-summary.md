# Validation Summary: How to Implement Runtime Threat Detection in Rancher

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Falco
- Pod Security Standards
- Prometheus Operator PrometheusRule
- jq

## Sources Consulted
- Falco Kubernetes Helm installation docs: https://falco.org/docs/setup/kubernetes/
- Falco default and local rules docs: https://falco.org/docs/concepts/rules/default-custom/
- Falco rule basics and default macros: https://falco.org/docs/concepts/rules/basic-elements/ and https://falco.org/docs/reference/rules/default-macros/
- Falco metrics docs: https://falco.org/docs/concepts/metrics/
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Kubernetes Pod Security Standards namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes security context docs: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl get and JSONPath docs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ and https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus Operator PrometheusRule API reference: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Rancher workload monitoring docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/set-up-monitoring-for-workloads

## Issues Found
- The audit command referenced `.securityContext.runAsRoot`, which is not a Kubernetes Pod or container securityContext field. Replaced it with `runAsUser == 0` checks at pod and container scope and kept privileged-container checks using the valid `privileged` field.
- The original "security feature" ConfigMap was a placeholder and did not configure Rancher or Falco. Replaced it with `falco-values.yaml` that uses the Falco Helm chart's `customRules`, metrics, webserver, and ServiceMonitor settings.
- The Deployment example was missing the required `spec.selector` and matching `spec.template.metadata.labels` for `apps/v1`. Added both so the manifest can be accepted by the Kubernetes API.
- The Helm install example used a fake chart repository and chart name. Replaced it with the official `falcosecurity` Helm repository and `falcosecurity/falco` chart.
- The PrometheusRule examples used kube-state-metrics security-context metrics that are not a reliable runtime detection source for Falco. Replaced them with alerts based on Falco's documented `falcosecurity_falco_rules_matches_total` and output-drop metrics.
- The verification script did not verify Falco installation or custom rule loading. Added Falco pod/log checks and changed namespace label inspection to `kubectl get namespaces -L pod-security.kubernetes.io/enforce`.
- Added missing prerequisites for Rancher Monitoring, Linux worker nodes, and `jq`.

## Review Notes
- Falco's documentation now recommends the Falco Operator for Kubernetes, but the Helm chart remains fully supported; the post keeps the Helm flow because Helm is listed as a prerequisite.
- `kubectl` and `helm` were not installed in the local review environment, so live cluster execution was not possible. YAML snippets were parsed locally, jq filters were checked against sample JSON, and command semantics were verified against official documentation.
