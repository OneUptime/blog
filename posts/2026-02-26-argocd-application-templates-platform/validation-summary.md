# Validation Summary: How to Create Application Templates for Platform Consumers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Helm charts and values schema validation
- Kubernetes Deployments, probes, security contexts, topology spread constraints, autoscaling, Services, Ingress, PodDisruptionBudgets, and NetworkPolicies
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- PromQL alert expressions
- GitOps template versioning

## Sources Consulted
- Helm chart file structure and `values.schema.json` validation: https://helm.sh/docs/topics/charts/
- Helm template function list, including integer and float math functions: https://helm.sh/docs/chart_template_guide/function_list/
- Helm dependency `condition` behavior: https://helm.sh/docs/topics/charts/#tags-and-condition-fields-in-dependencies
- Argo CD Helm Application examples and inline values behavior: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/helm/
- Kubernetes object name requirements: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes HorizontalPodAutoscaler behavior and `autoscaling/v2`: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Prometheus Operator API reference for `ServiceMonitor` and `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The `values.schema.json` example was marked as YAML and included a comment inside the snippet. I changed the fence to JSON and removed the inline filename comment so the example is valid JSON.
- The application-name schema allowed names ending in `-`, which can fail Kubernetes DNS label name requirements for common resource names. I added `minLength`, `maxLength`, and a stricter pattern that requires the name to start with a lowercase letter and end with an alphanumeric character.
- The schema required `team` and `image` keys but allowed empty strings. I added `minLength: 1` to both fields so required developer inputs cannot be blank.
- The CronJob variant set `service.enabled: false`, but the base `service` values did not define an `enabled` field. I added `service.enabled: true` to keep the override contract consistent.
- The Deployment template included a checksum annotation for `configmap.yaml`, but the article does not define a ConfigMap template. I removed the annotation so the shown chart does not depend on an omitted template.
- The latency alert used Helm's integer `div` function to convert milliseconds to seconds. I changed it to `divf` so non-whole-second thresholds render correctly.
- The CronJob chart example declared `platform-app` as a dependency with `condition: baseApp.enabled`, but no corresponding parent value was defined and a direct dependency on the application chart would render the base app resources. I removed the dependency block and marked the CronJob chart as an application chart.

## Review Notes
The Argo CD Application example uses the supported inline `source.helm.values` field. The Prometheus Operator resources assume the relevant CRDs are installed and that the Prometheus instance selects the generated `ServiceMonitor` and `PrometheusRule` objects.
