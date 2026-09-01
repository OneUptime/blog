# Validation Summary: Install KubeVela with Helm and Fix “Failed to Download kubevela/vela-core”

## Status
validated

## Post Type
Troubleshooting Guide / Installation Tutorial

## Technologies Covered
- KubeVela v1.11 and the `vela` CLI
- Kubernetes and `kubectl`
- Helm 3 chart repositories and releases
- KubeVela CustomResourceDefinitions (CRDs)
- HTTPS, TLS, DNS, and proxy troubleshooting

## Sources Consulted
- [KubeVela v1.11 Kubernetes installation guide](https://kubevela.io/docs/installation/kubernetes/) - Kubernetes compatibility, Helm minimum version, official chart repository, release name, namespace, and installation command.
- [KubeVela `vela install` reference](https://kubevela.io/docs/cli/vela_install/) - confirmation that `vela install` installs or upgrades the control plane and defaults to `vela-system`.
- [KubeVela v1.11 migration and upgrade guide](https://kubevela.io/docs/platform-engineers/system-operation/migration-from-old-version/) - supported upgrade procedure and pinned v1.11 chart version.
- [KubeVela v1.11.0 release](https://github.com/kubevela/kubevela/releases/tag/v1.11.0) and [official chart index](https://kubevela.github.io/charts/index.yaml) - current stable release and availability of `vela-core` chart 1.11.0.
- [KubeVela v1.11.0 Application CRD](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/crds/core.oam.dev_applications.yaml) and [ComponentDefinition CRD](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/crds/core.oam.dev_componentdefinitions.yaml) - verification of the CRD names used by the post.
- [Helm chart repository guide](https://helm.sh/docs/topics/chart_repository/) - repository aliases, `index.yaml`, and local index caching behavior.
- [Helm 3 `repo add`](https://helm.sh/docs/v3/helm/helm_repo_add/), [`repo update`](https://helm.sh/docs/v3/helm/helm_repo_update/), [`search repo`](https://helm.sh/docs/v3/helm/helm_search_repo/), and [`show chart`](https://helm.sh/docs/v3/helm/helm_show_chart/) references - repository command syntax and behavior.
- [Helm 3 `install`](https://helm.sh/docs/v3/helm/helm_install/), [`list`](https://helm.sh/docs/v3/helm/helm_list/), [`status`](https://helm.sh/docs/v3/helm/helm_status/), and [`get values`](https://helm.sh/docs/v3/helm/helm_get_values/) references, plus the [Helm install action source](https://github.com/helm/helm/blob/v3.21.4/pkg/action/install.go) - release command syntax, flags, namespace scope, statuses, wait-failure behavior, and values output.
- [Helm 3.13 release article](https://helm.sh/blog/helm-3.13/) - confirmation that `helm get metadata` was introduced in Helm 3.13.
- [Helm v3.2.0 repository-update source](https://github.com/helm/helm/blob/v3.2.0/cmd/helm/repo_update.go), [Helm v3.7.0 repository-update source](https://github.com/helm/helm/blob/v3.7.0/cmd/helm/repo_update.go), and [Helm troubleshooting guidance](https://helm.sh/docs/v3/faq/troubleshooting/) - version availability of selective repository updates and `--force-update`.
- [Kubernetes `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), and [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) references - resource inspection, event sorting, and controller-log command syntax.
- Local CLI help for Helm 3.12.3, kubectl 1.34.1, and curl, plus an isolated render of the official `vela-core` 1.11.0 chart targeting Kubernetes 1.31.

## Issues Found
1. **Repository repair commands exceeded the documented Helm minimum** - The post states KubeVela's official Helm 3.2.0 minimum, but `helm repo add --force-update` was unavailable in Helm 3.2 and named-repository arguments such as `helm repo update kubevela` were not accepted until later Helm releases. Replaced those commands with `helm repo remove kubevela`, `helm repo add ...`, and an unqualified `helm repo update`, all of which work with Helm 3.2.
2. **Release metadata command exceeded the documented Helm minimum** - `helm get metadata` was added in Helm 3.13, so it fails on otherwise supported older Helm 3 clients. Replaced it with a namespace-scoped, status-inclusive `helm list` command, whose output includes the installed chart version and is available in Helm 3.2.
3. **Incorrect missing-alias error text** - A missing repository alias for a chart reference such as `kubevela/vela-core` produces `repo kubevela not found`; `no repository definition for kubevela` is associated with a different dependency-resolution path. Updated the diagnostic bullet to use the correct error.
4. **Checks were incorrectly described as read-only** - `helm show chart` does not install anything or modify the cluster, but it downloads the chart archive into Helm's local cache. Changed “read-only checks” to “non-installing checks.”
5. **`DEPLOYED` status was described as necessary** - A non-atomic `helm install --wait` timeout marks the release failed while leaving created resources in place, and those resources can subsequently become ready. Reworded the statement so `DEPLOYED` confirms Helm completed successfully while controller readiness remains the operational outcome.
6. **The log-inspection instructions had no log command** - The text instructed readers to inspect controller logs but only showed event and pod-description commands. Added `kubectl logs --namespace vela-system deployment/kubevela-vela-core --all-containers=true`; the deployment name was verified from the official v1.11.0 chart.
7. **The conclusion switched to cluster troubleshooting too early** - Downloading a chart does not guarantee that Helm rendered or created Kubernetes resources. Qualified the conclusion so readers switch to events and readiness checks after the chart downloads and Helm creates resources.

## Review Notes
- As of 2026-09-01, KubeVela v1.11.0 is the current stable release, and the official chart index contains `vela-core` 1.11.0.
- The v1.11 installation page documents Kubernetes `>=1.19` and `<=1.31` and Helm `v3.2.0+`; those release-specific bounds in the post are accurate.
- The official chart repository URL is correct. Its directory root is not a browsable web page, but its `index.yaml` and the referenced chart archive are available as required by Helm.
- Helm's unversioned documentation URLs currently display Helm 4 documentation. The post's commands were checked against Helm 3 because KubeVela's v1.11 installation page explicitly names Helm v3.2.0+; users should confirm KubeVela support before adopting a newer Helm major version.
- The official chart rendered successfully with Helm 3.12.3 for Kubernetes 1.31, and it contains both CRDs named in the verification commands.
