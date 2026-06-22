# Validation Summary: Helm + ArgoCD GitOps Deployment Complete Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Argo CD
- Argo CD Applications, AppProjects, ApplicationSets, sync waves, and hooks
- GitOps deployment workflows
- Sealed Secrets
- External Secrets Operator
- cert-manager
- kube-prometheus-stack

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- Sealed Secrets project documentation: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator Getting Started documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- prometheus-community kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The first Application example said Helm value files were relative to the repository root. Argo CD documents value file paths as relative to the Helm chart root for a single-source Application, so the comment was corrected.
- The automated sync policy comment incorrectly described `prune: true` as namespace creation. `prune` deletes resources no longer defined in Git; namespace creation is handled by `CreateNamespace=true`, so the comment was corrected.
- The kube-prometheus-stack example used `${GRAFANA_PASSWORD}` inside inline Helm values, which Argo CD does not substitute as an arbitrary values-file environment variable. The example now references an existing Kubernetes Secret through the chart's `grafana.admin.existingSecret` settings.
- The cert-manager example used `crds.enabled=true` with an older chart version and a now-unnecessary note. The chart version was updated to `v1.20.2`, where the official docs use `crds.enabled=true`.
- The ApplicationSet examples used the older default `{{parameter}}` templating style. They were updated to enable `goTemplate: true`, add `goTemplateOptions: ["missingkey=error"]`, and use current dot-prefixed Go template expressions.
- The External Secrets Operator chart version and ExternalSecret API version were outdated. The chart target revision was updated to `2.6.0`, and the ExternalSecret manifest now uses `external-secrets.io/v1`.

## Review Notes
Several pinned chart versions in examples, such as kube-prometheus-stack `55.0.0` and ingress-nginx `4.8.3`, are older but still valid examples of pinned GitOps deployments. Future updates could refresh those versions, but they are not correctness blockers for this guide.
