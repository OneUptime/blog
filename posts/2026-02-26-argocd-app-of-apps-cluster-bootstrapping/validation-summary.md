# Validation Summary: How to Use App-of-Apps for Cluster Bootstrapping

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications
- Argo CD app-of-apps cluster bootstrapping
- Argo CD automated sync, pruning, sync waves, sync options, and multi-source Applications
- Kubernetes namespaces and kubectl
- Helm charts
- Kustomize overlays and patches
- ingress-nginx, kube-prometheus-stack, and external-dns Helm charts

## Sources Consulted
- Argo CD Cluster Bootstrapping documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kustomize project documentation: https://github.com/kubernetes-sigs/kustomize
- ingress-nginx Helm chart repository index: https://kubernetes.github.io/ingress-nginx/index.yaml
- prometheus-community Helm chart repository index: https://prometheus-community.github.io/helm-charts/index.yaml
- external-dns Helm chart repository index: https://kubernetes-sigs.github.io/external-dns/index.yaml

## Issues Found
- The ingress-nginx Application example mixed `spec.source` with `spec.sources` while using a `$values` reference. Argo CD documents this pattern under multi-source Applications using `spec.sources`, so the duplicate single-source block was removed.
- The ingress-nginx and monitoring example headings and annotations did not match the sync wave strategy table. The ingress-nginx example was changed to wave 2 and the monitoring example was changed to wave 4 to keep the examples internally consistent.

## Review Notes
The pinned chart versions used in the examples are present in their referenced Helm chart repositories. The post uses older chart versions, so future readers may want to update the pins for a real production bootstrap, but the versions and repository URLs are technically valid.
