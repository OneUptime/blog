# Validation Summary: How to Pass ARGOCD_APP_NAME to Manifest Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD build environment variables
- Argo CD Applications and ApplicationSets
- Helm manifest generation
- Argo CD Config Management Plugins
- Jsonnet external variables
- Kubernetes Deployments and HorizontalPodAutoscalers
- Prometheus alerting rule templates

## Sources Consulted
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/build-environment/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Jsonnet documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/jsonnet/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Prometheus Alerting Rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Argo CD Application examples omitted `spec.project`, and some examples omitted `spec.destination`, even though the Application specification documents these as core fields. Added `project: default` and destination fields where the snippets are presented as Application manifests.
- The Helm Deployment template omitted `spec.selector`, which is required for `apps/v1` Deployments and must match the pod template labels. Added `spec.selector.matchLabels` using the chart's selector labels helper.
- The Jsonnet example produced a wrapper object with a nested `deployment` field rather than a Kubernetes object with top-level `apiVersion`, `kind`, `metadata`, and `spec`. Updated the Jsonnet output to render the Deployment object directly.
- The monitoring example used the Kubernetes label key `argocd-app` but the Prometheus alert referenced `$labels.argocd_app`. Updated the label key to `argocd_app` so it matches the Prometheus template reference.

## Review Notes
The main claim is correct: Argo CD exposes `ARGOCD_APP_NAME` as part of the standard build environment, and official docs show build environment substitution for Helm parameters and Jsonnet external variables. Config Management Plugin commands also have access to the standard build environment. The plugin example is valid as a sidecar plugin configuration file, but it should be installed as plugin configuration mounted into the sidecar rather than applied as a Kubernetes CRD.
