# Validation Summary: How to Fix Flux Reconciliation Race Condition Between Kustomizations

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux kustomize-controller
- Kubernetes Kustomization custom resources
- Kubernetes CRDs, namespaces, Secrets, ConfigMaps, and admission webhooks
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux create kustomization` documentation: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl logs documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The timestamp diagnostic command used `.status.conditions[0]`, which is not a reliable way to select the Ready condition because Kubernetes condition arrays should be addressed by condition type. Changed the command to filter for `type=="Ready"` for both status and transition time.
- The namespace and dependent application Kustomization examples omitted required Flux Kustomization fields, including `prune` and `sourceRef`. Added the missing fields so the examples are valid complete Flux Kustomization resources.
- The health check example combined `wait: true` with `healthChecks`. Flux documents that `healthChecks` is ignored when `wait` is true, so the example did not demonstrate the specific health check it claimed to configure. Removed `wait: true` and added the required `prune` and `sourceRef` fields.

## Review Notes
The main guidance is consistent with Flux's dependency model: `.spec.dependsOn` gates reconciliation on dependency readiness, and `retryInterval` controls retry timing after failed reconciliation. A future improvement could mention that `wait: true` checks all reconciled resources, while `healthChecks` targets specific resources.
