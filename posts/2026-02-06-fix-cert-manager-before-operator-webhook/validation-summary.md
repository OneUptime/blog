# Validation Summary: How to Fix cert-manager Not Being Installed Before the OpenTelemetry Operator

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes admission webhooks
- OpenTelemetry Operator
- OpenTelemetry Operator Helm chart
- cert-manager
- Helm
- kubectl

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- OpenTelemetry Operator Helm chart documentation: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator
- OpenTelemetry Operator Helm chart values and templates: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator/templates
- OpenTelemetry Kubernetes Operator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm chart dependency best practices: https://helm.sh/docs/chart_best_practices/dependencies/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- kubectl wait command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The post used `--set installCRDs=true` for cert-manager Helm installation. Current cert-manager Helm documentation uses `--set crds.enabled=true`, so both install examples were updated.
- The webhook error examples used an outdated service name and path, `opentelemetry-operator-webhook-service` and `/mutate--v1-pod`. The current OpenTelemetry Operator Helm chart renders the service as `opentelemetry-operator-webhook` for the release name in the post and the pod mutation path as `/mutate-v1-pod`, so the examples were corrected.
- The recovery section said to delete the Operator `Certificate` so cert-manager could recreate it. The `Certificate` resource is rendered by the OpenTelemetry Operator Helm chart, not created by cert-manager, so the recovery flow was changed to re-apply the Operator Helm release after cert-manager is installed.
- The recovery section used the old deployment name `opentelemetry-operator-controller-manager`. The current Helm chart renders the deployment as `opentelemetry-operator` for the release name used in the post, so the rollout restart command was updated.
- The webhook verification and emergency recovery commands referenced `opentelemetry-operator-mutating-webhook-configuration`. The current Helm chart renders the mutating webhook configuration as `opentelemetry-operator-mutation`, so those commands were updated.
- The emergency recovery JSON patch targeted `/webhooks/0/failurePolicy`, but the pod webhook `mpod.kb.io` is the third mutating webhook in the current chart. The patch path was changed to `/webhooks/2/failurePolicy`.
- The Helm automation section recommended embedding cert-manager as an umbrella-chart dependency and claimed that dependency order guarantees cert-manager installation first. cert-manager documentation warns not to embed cert-manager as a subchart because it manages cluster-scoped resources and should be installed exactly once. The section was changed to install cert-manager and the OpenTelemetry Operator as separate Helm releases with `--wait`.

## Review Notes
- The OpenTelemetry Operator chart still supports disabling cert-manager with `admissionWebhooks.certManager.enabled=false` and using Helm-generated certificates with `admissionWebhooks.autoGenerateCert.enabled=true`.
- The pod webhook failure policy is configurable separately from the other admission webhook failure policy in the current OpenTelemetry Operator chart.
