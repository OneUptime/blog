# Validation Summary: Why Does `helm list` Show No KubeVela Release? Checking Namespaces, Repositories, and Existing Names

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- `kubectl`
- Helm 3 and Helm 4
- KubeVela 1.11
- KubeVela CLI (`vela`)
- Helm chart repositories and release storage
- Kubernetes custom resources and CRDs

## Sources Consulted

- [Helm 4 `helm list` reference](https://helm.sh/docs/helm/helm_list/)
- [Helm 3 `helm list` reference](https://helm.sh/docs/v3/helm/helm_list/)
- [Helm: Changes Since Helm 2](https://helm.sh/docs/v3/faq/changes_since_helm2/)
- [Helm 4 `helm status` reference](https://helm.sh/docs/helm/helm_status/)
- [Helm 3 `helm status` reference](https://helm.sh/docs/v3/helm/helm_status/)
- [Helm 4 full changelog](https://helm.sh/docs/changelog/)
- [Helm 3.13 release announcement](https://helm.sh/blog/helm-3.13/)
- [Helm `get metadata` reference](https://helm.sh/docs/helm/helm_get_metadata/)
- [Helm `get manifest` reference](https://helm.sh/docs/helm/helm_get_manifest/)
- [Helm `get values` reference](https://helm.sh/docs/helm/helm_get_values/)
- [Helm `history` reference](https://helm.sh/docs/helm/helm_history/)
- [Helm `search repo` reference](https://helm.sh/docs/helm/helm_search_repo/)
- [Helm `repo add` reference](https://helm.sh/docs/helm/helm_repo_add/)
- [Helm `repo update` reference](https://helm.sh/docs/helm/helm_repo_update/)
- [Helm `install` reference](https://helm.sh/docs/helm/helm_install/)
- [Helm `uninstall` reference](https://helm.sh/docs/helm/helm_uninstall/)
- [Helm advanced techniques: storage backends and resource ownership](https://helm.sh/docs/topics/advanced/)
- [KubeVela: Install KubeVela on Kubernetes](https://kubevela.io/docs/installation/kubernetes/)
- [KubeVela `vela install` reference](https://kubevela.io/docs/cli/vela_install/)
- [KubeVela `vela system` reference](https://kubevela.io/docs/cli/vela_system/)
- [KubeVela `vela system info` reference](https://kubevela.io/docs/cli/vela_system_info/)
- [KubeVela `vela version` reference](https://kubevela.io/docs/cli/vela_version/)
- [KubeVela 1.11 installer source](https://github.com/kubevela/kubevela/blob/v1.11.0/references/cli/install.go)
- [KubeVela 1.11 system-info selector source](https://github.com/kubevela/kubevela/blob/v1.11.0/references/cli/system.go)
- [KubeVela 1.11 version lookup source](https://github.com/kubevela/kubevela/blob/v1.11.0/references/cli/cli.go)
- [KubeVela 1.11 system namespace environment handling](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/utils/system/system.go)
- [KubeVela 1.11 controller Deployment template](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/templates/kubevela-controller.yaml)
- [KubeVela 1.11 chart naming helpers](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/templates/_helpers.tpl)
- [KubeVela 1.11 `ComponentDefinition` CRD](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/crds/core.oam.dev_componentdefinitions.yaml)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl config view` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)
- [Kubernetes `kubectl cluster-info` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/)
- [Kubernetes `kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes `kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes deprecated API migration guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Kubernetes: Delete a CustomResourceDefinition](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#delete-a-customresourcedefinition)

## Issues Found

- The all-status listing examples used Helm 3's `--all` flag, which was removed in Helm 4. Updated the primary commands for Helm 4's all-status default and added explicit guidance to append `--all` on Helm 3.
- The failed-release diagnostic used `helm status --show-resources`, but Helm 4 removed that flag and now includes resources by default. Removed the flag from the cross-version command and documented when Helm 3 users should add it.
- `helm get metadata` was presented without a version qualification even though it was introduced in Helm 3.13. Added the minimum-version caveat.
- The Deployment lookup selected `app.kubernetes.io/part-of=kubevela`, which is not present on the current KubeVela control-plane Deployment. Replaced it with `app.kubernetes.io/name=vela-core`, matching the KubeVela 1.11 chart and `vela system info` implementation.
- The Helm Secret query hard-coded `name=kubevela`, so it could miss the nonstandard release names the guide asks readers to investigate. Changed the discovery query to select all records for the default Helm Secret driver with `owner=helm`.
- The Event command sorted on the legacy `lastTimestamp` field. Replaced it with the current `kubectl events --namespace <namespace>` command.
- The post referred to "cluster-scoped definitions," although KubeVela definition custom resources such as `ComponentDefinition` are namespaced. Changed the wording to "cluster-scoped CRDs."
- The duplicate-install warning described charts as trying to own CRDs, although Helm handles files in a chart's `crds/` directory differently from ordinary managed resources. Changed the wording to "create or manage" while preserving the valid duplicate-controller warning.
- The final health-check example assumed the standard namespace and Deployment name after the guide had covered nonstandard identities. Made that assumption explicit and instructed readers to substitute the located namespace and Deployment name. Also documented that `vela version` needs `KUBEVELA_SYSTEM_NAMESPACE` when the control plane is outside `vela-system`.

## Review Notes

- The standard KubeVela 1.11 Helm installation still uses release `kubevela`, namespace `vela-system`, chart `kubevela/vela-core`, and Deployment `kubevela-vela-core`.
- Helm 3 and Helm 4 both keep release identity namespace-scoped and use the current kubeconfig namespace when no namespace flag is supplied. Helm's default storage driver uses Secrets, but ConfigMap and SQL storage backends can be configured; the post's "normally" qualification is therefore accurate.
- `helm list` returns at most 256 results by default. Very large clusters can require `--max` and `--offset` pagination, although the exact-name filter substantially narrows this troubleshooting search.
- The chart repository endpoint is valid for Helm because its `index.yaml` is available even though opening the repository root in a browser does not render a chart page.
- All remaining commands, resource names, technical explanations, and external documentation links were verified as current and relevant.
