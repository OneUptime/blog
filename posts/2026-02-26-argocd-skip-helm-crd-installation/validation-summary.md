# Validation Summary: How to Skip Helm CRD Installation in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes Custom Resource Definitions
- cert-manager Helm chart
- kube-prometheus-stack Helm chart
- Istio Helm chart
- Argo Rollouts Helm chart
- Kustomize

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager v1.14.0 CRD release asset: https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml
- cert-manager v1.14.0 CRD directory: https://github.com/cert-manager/cert-manager/tree/v1.14.0/deploy/crds
- prometheus-community kube-prometheus-stack chart source: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Istio base chart source: https://github.com/istio/istio/tree/master/manifests/charts/base
- Argo Rollouts Helm chart source: https://github.com/argoproj/argo-helm/tree/main/charts/argo-rollouts

## Issues Found
- The kube-prometheus-stack example disabled `prometheusOperator.admissionWebhooks.enabled`, which controls admission webhooks rather than CRD installation. Updated the example to use `crds.enabled: false`, matching the current official chart values.
- The Istio example suggested `base.enableCRDTemplates: false` as a way to skip CRDs. In current Istio base chart templates, that value does not reliably skip CRD output; the chart still emits CRDs from the bundled CRD file. Replaced the misleading snippet with a note to manage the `istio/base` chart or CRD manifests separately instead of relying on `skipCrds`.

## Review Notes
The Argo CD `skipCrds` field and `--helm-skip-crds` CLI flag are valid. Helm's documented behavior for CRDs in the `crds/` directory, Argo CD sync options such as `ServerSideApply=true`, `Replace=true`, and `Prune=false`, and cert-manager's `installCRDs` value all matched official documentation. `Replace=true` is valid but can be disruptive because Argo CD uses replace/create semantics; the post's recommendation is technically correct, but teams should prefer server-side apply where it satisfies the size and ownership requirements.
