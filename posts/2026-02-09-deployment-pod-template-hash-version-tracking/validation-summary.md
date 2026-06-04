# Validation Summary: How to Use Deployment Pod Template Hash for Version Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes ReplicaSets
- kubectl JSONPath
- jq
- Prometheus / PromQL
- Prometheus Operator ServiceMonitor
- Argo Rollouts AnalysisTemplate
- GitLab CI

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes JSONPath Support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The post claimed the pod template hash was a unique identifier for the exact configuration. Kubernetes documents it as a hash of the ReplicaSet PodTemplate added to ReplicaSets, selectors, pod template labels, and Pods; the wording was softened to avoid overstating uniqueness and to clarify that pods with the same hash came from the same ReplicaSet pod template.
- The resource limits YAML example placed `resources` at the pod spec level instead of under the container. It was corrected to valid container resource syntax.
- Two examples attempted to read `pod-template-hash` from `.spec.template.metadata.labels` on the Deployment. The Deployment template does not contain the controller-added hash; the examples now read the newest Deployment-created ReplicaSet by revision and then use its `pod-template-hash` label.
- The PromQL error-rate example used invalid aggregation placement for comparing hashes. It now aggregates numerator and denominator with `sum by (pod_template_hash)`.
- The Argo Rollouts `successCondition` examples used `result` where the official examples use `result[0]` for Prometheus query results. Both conditions were updated.
- The classic histogram `histogram_quantile` examples omitted the required bucket aggregation by `le`. They now use `sum by (le) (rate(..._bucket[5m]))`.
- The pod JSONPath example used dot notation for a label key with hyphens. It now uses bracket notation with double quotes inside the JSONPath expression.

## Review Notes
kubectl was not installed in the local workspace, so CLI details were verified against official Kubernetes documentation rather than local `kubectl --help` output.
