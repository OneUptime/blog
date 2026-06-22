# Validation Summary: Using Helm with ArgoCD for GitOps Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- Argo CD Application and ApplicationSet resources
- Argo CD sync waves and resource hooks
- Argo Rollouts
- Argo CD Image Updater
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet List generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Matrix generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD CLI command reference for app logs/manifests/get/create: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app/
- Argo Helm argo-cd chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo Helm argocd-image-updater chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argocd-image-updater/values.yaml
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater command-line reference: https://argocd-image-updater.readthedocs.io/en/release-0.15/install/reference/
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts Prometheus provider documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/

## Issues Found
- The Git directory ApplicationSet referenced a Helm values file from a different Git repository using a relative path. Argo CD requires multi-source Applications and a `$values` reference for external values files, so the example was changed to use `sources`, `ref: values`, and `$values/environments/{{path.basename}}/values.yaml`.
- The List generator example used nested `values` objects and referenced `{{values.replicaCount}}` / `{{values.environment}}`. The documented List generator parameters are string key/value pairs, so the example now uses top-level string parameters and references `{{replicaCount}}` / `{{environment}}`.
- The Image Updater Helm chart values included an unsupported nested `config.argocd` block for the current argo-helm chart. This was changed to `extraArgs` with the documented `--argocd-grpc-web` and `--argocd-server-addr` flags.
- The Image Updater Application annotations tracked `image.repository` and `image.tag` Helm parameters but did not map the image alias to those Helm parameters. Added the `myimage.helm.image-name` and `myimage.helm.image-tag` annotations.

## Review Notes
- Argo CD Image Updater's current documentation emphasizes the `ImageUpdater` CRD configuration model, while annotation-based Application configuration still appears in compatibility/migration documentation. The post's annotation-based example is acceptable but may be worth modernizing in a future rewrite.
