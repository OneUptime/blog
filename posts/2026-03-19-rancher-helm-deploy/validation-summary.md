# Validation Summary: How to Deploy Applications Using Helm Charts in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Bitnami Redis Helm chart

## Sources Consulted
- Rancher docs: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher docs: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Helm docs: https://helm.sh/docs/helm/helm_install/
- Helm docs: https://helm.sh/docs/helm/helm_repo_add/
- Helm docs: https://helm.sh/docs/helm/helm_repo_update/
- Helm docs: https://helm.sh/docs/helm/helm_search_repo/
- Helm docs: https://helm.sh/docs/helm/helm_list/
- Helm docs: https://helm.sh/docs/helm/helm_uninstall/
- Helm chart structure docs: https://helm.sh/docs/topics/charts/
- Kubernetes docs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes docs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Bitnami Redis chart README: https://github.com/bitnami/charts/blob/main/bitnami/redis/README.md
- Rancher source: https://github.com/rancher/rancher/blob/master/pkg/catalogv2/helm/info.go
- Rancher Dashboard source: https://github.com/rancher/dashboard/blob/master/shell/edit/helm.cattle.io.projecthelmchart.vue

## Issues Found
- The post said Rancher form-based chart configuration is generated from `questions.yaml` or `values.schema.json`. Rancher documentation and source indicate Rancher question forms are driven by `questions.yaml`, so I corrected that wording.
- The post said the **Edit YAML** view directly edits the chart's `values.yaml` file. In Rancher, the UI edits the values supplied for the release, not the chart file in its repository, so I changed the wording to "chart values."

## Review Notes
- The Redis example values and service names remain valid for the current Bitnami Redis chart.
- The Helm CLI workflow shown in the post remains valid. Bitnami's current chart README also documents OCI-based installation, but the repository-based workflow used here is still supported by Helm and the Bitnami chart repository endpoint.
