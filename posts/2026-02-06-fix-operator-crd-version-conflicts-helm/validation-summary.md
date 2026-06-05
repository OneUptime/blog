# Validation Summary: How to Fix OpenTelemetry Operator CRD Version Conflicts After Upgrading the

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Operator Helm chart
- Helm
- Kubernetes CustomResourceDefinitions
- kubectl
- Kubernetes Server-Side Apply

## Sources Consulted
- Helm documentation on chart CRD limitations: https://helm.sh/docs/topics/charts/#limitations-on-crds
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator Helm chart `UPGRADING.md`: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/UPGRADING.md
- OpenTelemetry Operator CRD changelog: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/crd-changelog.md
- Kubernetes documentation on CRD versioning and stored versions: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- OpenTelemetry Operator v0.95.0 GitHub release assets: https://github.com/open-telemetry/opentelemetry-operator/releases/tag/v0.95.0

## Issues Found
- The post described OpenTelemetry Operator CRD upgrades as only a generic Helm `crds/` directory problem. That is incomplete for current OpenTelemetry Operator charts, which use templated CRDs and require existing CRDs to be owned by the Helm release. I updated the explanation and commands to include the documented Helm annotations and labels.
- The post instructed users to apply `opentelemetry-operator/crds/`, but OpenTelemetry Operator chart versions involved in the `v1beta1` migration use templated CRDs under chart configuration rendered through the webhook template. I changed the commands to render the chart and apply the rendered output.
- The GitHub release URL for `v0.95.0/opentelemetry-operator-crds.yaml` is not a valid OpenTelemetry Operator release asset. I removed that command and replaced it with rendered chart output tied to the target Helm chart version.
- The stored-version migration section implied that the Operator automatically completes storage migration. I clarified that conversion webhooks serve requested versions, but stored versions remain until objects are rewritten, and added the documented CRD status patch after migration.
- The "Fixing Stuck CRDs" commands referenced the old `opentelemetry-operator/crds/` path. I updated them to use the same rendered chart output and tightened the finalizer warning to deletion cases after custom resources are backed up or removed.

## Review Notes
The example target chart version is now `0.58.0` because that OpenTelemetry Operator Helm chart version maps to Operator `0.99.0`, where the `OpenTelemetryCollector` `v1beta1` migration was introduced. For future updates, the chart version should be replaced with the actual target version being deployed.
