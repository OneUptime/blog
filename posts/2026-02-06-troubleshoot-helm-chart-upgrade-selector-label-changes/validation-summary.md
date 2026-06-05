# Validation Summary: How to Troubleshoot Helm Chart Upgrade Failures Due to Selector Label Breaking

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector Helm chart
- Helm
- Kubernetes Deployments
- Kubernetes labels and selectors

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector chart upgrade notes: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/UPGRADING.md
- OpenTelemetry Collector chart templates for 0.109.0, 0.110.0, 0.110.1, 0.110.2, and 0.110.3: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector

## Issues Found
- The post incorrectly stated that chart version 0.110.0 changed the selector labels and that upgrades from older versions to 0.110.0+ fail. The official chart templates and upgrade notes show that 0.110.1 and 0.110.2 were the broken versions, and upstream recommends upgrading directly to 0.110.3. Updated the description, explanation, examples, and commands to use 0.110.3 and to identify 0.110.1/0.110.2 as the broken versions.
- The selector label example was inaccurate. The actual chart selector includes `component: standalone-collector`; the broken 0.110.1/0.110.2 selector additionally included `app.kubernetes.io/component: standalone-collector`. Updated the YAML example to match the chart templates.
- The post suggested using `podLabels`, `nameOverride`, or a `selectorLabels` value to override the Deployment selector for a zero-downtime upgrade. The OpenTelemetry Collector chart does not expose a general `selectorLabels` value, and `podLabels` only adds Pod template labels. Replaced this with guidance to skip the broken chart versions and verify rendered selectors.
- The Helm replacement guidance only mentioned `--force`. Added a Helm 4 caveat noting that the equivalent replacement flag is `--force-replace`.

## Review Notes
Helm and kubectl were not installed in the local environment, so CLI behavior was verified against official documentation and upstream chart source rather than local `--help` output.
