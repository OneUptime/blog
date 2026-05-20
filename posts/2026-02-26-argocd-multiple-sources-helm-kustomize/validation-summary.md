# Validation Summary: How to Use Multiple Sources with Helm and Kustomize Together in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Applications and multiple sources
- Helm charts and Helm values
- Kustomize overlays and `helmCharts`
- Kubernetes ServiceMonitor, PodDisruptionBudget, and NetworkPolicy resources
- cert-manager Helm chart
- ingress-nginx Helm chart

## Sources Consulted
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager chart v1.14.2 Artifact Hub page: https://artifacthub.io/packages/helm/cert-manager/cert-manager/1.14.2
- ingress-nginx Helm chart values and README: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction and scenario list implied that a Kustomize source in an Argo CD multi-source Application can patch Helm-generated resources. Argo CD renders each source separately and combines the resulting manifests, so cross-source patching does not work. I changed those statements to describe adding companion resources and clarified that Kustomize patches only apply within the same source.
- The ingress-nginx ServiceMonitor example did not enable the Helm chart's metrics service, so the `metrics` port referenced by the ServiceMonitor might not exist. I added `controller.metrics.enabled: true` and `controller.metrics.service.enabled: true` to the Helm values example.
- The ServiceMonitor, PodDisruptionBudget, and NetworkPolicy selectors matched only `app.kubernetes.io/name`, which could be broader than the ingress controller workload. I added `app.kubernetes.io/instance` and `app.kubernetes.io/component` selectors to target the controller resources more precisely.
- The full cert-manager Application example omitted `spec.project`, which is part of normal Argo CD Application configuration. I added `project: default`.
- The cert-manager examples used `targetRevision: 1.14.2`; cert-manager's Helm documentation and Artifact Hub install command use the chart version form `v1.14.2`. I updated the examples to `targetRevision: v1.14.2`.
- The values repository source was described as providing both values files and Kustomize resources, but that specific source has no `path` and is used only as a values reference. I changed the comment to say it provides values files.
- The limitation section said there were two alternatives but listed three. I corrected it to three alternatives.
- The `helmCharts` alternative did not mention that Argo CD requires Helm support to be enabled for Kustomize builds. I added the `kustomize.buildOptions: --enable-helm` or config management plugin caveat from the official Argo CD Kustomize documentation.
- The Kustomize patch example used a JSON patch that could fail if the target Deployment's pod template had no existing `annotations` map. I changed it to a strategic merge patch that creates or merges the annotation map.

## Review Notes
The post is now technically accurate for the multi-source pattern it describes. One future improvement would be to mention that ingress-nginx already has built-in Helm values for some optional resources, including metrics and ServiceMonitor support, so readers should prefer chart-supported values when available.
