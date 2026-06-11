# Validation Summary: How to Create Helm Global Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm charts
- Helm template values and global values
- Helm CLI commands
- Kubernetes Deployments
- Kubernetes ServiceMonitor custom resources
- YAML
- JSON Schema for Helm values

## Sources Consulted
- Helm documentation: Subcharts and Global Values - https://helm.sh/docs/chart_template_guide/subcharts_and_globals/
- Helm documentation: Values Files - https://helm.sh/docs/chart_template_guide/values_files/
- Helm documentation: Charts, Global Values, and Schema Files - https://helm.sh/docs/topics/charts/
- Helm CLI documentation: helm install - https://helm.sh/docs/helm/helm_install/
- Helm CLI documentation: helm get values - https://helm.sh/docs/helm/helm_get_values/
- Helm CLI documentation: helm template - https://helm.sh/docs/helm/helm_template/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Deployment examples used `apiVersion: apps/v1` but omitted `spec.selector` and matching `spec.template.metadata.labels`. Kubernetes requires an explicit selector for apps/v1 Deployments, and it must match the pod template labels. Added selectors and labels to both Deployment snippets.
- The override priority diagram put `Subchart values.yaml` after `Parent values.yaml`, which reverses the effective precedence for subchart values. Updated the diagram so subchart defaults are lowest, then parent values, then custom values files, then `--set` flags.
- The schema validation sentence only mentioned `helm install` and `helm upgrade`. Helm also validates chart values schemas during `helm lint` and `helm template`. Updated the sentence to include all four commands.
- The debug ConfigMap used `{{- ... }}` immediately under a block scalar. The left trim marker can remove the newline after `globals: |` and produce invalid YAML. Removed the trim marker so the rendered block scalar remains valid.

## Review Notes
- Helm was not installed in the local environment, so CLI behavior was checked against official Helm command documentation rather than local `helm --help` output.
- The ServiceMonitor example assumes the Prometheus Operator CRD is installed and that the chart defines the referenced helper templates.
