# Validation Summary: How to Manage Helm Release Versions in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Helm Diff plugin
- kubectl

## Sources Consulted
- Rancher docs: Helm Charts and Apps - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher docs: Access a Cluster with Kubectl and kubeconfig - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Helm docs index - https://docs.helm.sh/docs/helm/
- Helm docs: `helm upgrade` - https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm docs: Advanced Helm Techniques / storage backends - https://docs.helm.sh/docs/topics/advanced/
- Helm docs: environment variables (`HELM_DRIVER`, `HELM_MAX_HISTORY`) - https://docs.helm.sh/docs/helm/helm/
- Helm source: release Secret labels - https://github.com/helm/helm/blob/main/pkg/storage/driver/secrets.go
- Helm source: system label list - https://github.com/helm/helm/blob/main/pkg/storage/driver/util.go
- Helm source: release status definitions - https://github.com/helm/helm/blob/main/pkg/release/common/status.go
- Helm source: `helm get values` command output handling - https://github.com/helm/helm/blob/main/pkg/cmd/get_values.go
- Helm source: default output format binding - https://github.com/helm/helm/blob/main/pkg/cmd/flags.go
- Helm Diff plugin README - https://github.com/databus23/helm-diff

## Issues Found
- The post said to use Rancher's kubectl shell for `helm history`. Rancher documents kubectl shell and workstation kubeconfig access, but not Helm availability inside the Rancher shell. I changed this to recommend using the Helm CLI against the cluster from a normal Helm-configured environment.
- The post described `helm history my-redis -n default` as providing a "complete" revision history. Helm documents output limits for history queries, so that wording was too strong. I changed the text to "release history details."
- The value-comparison example redirected `helm get values` output into `.yaml` files without setting an output format. Current Helm uses `table` as the default output format for commands that bind the standard output flag, and `helm get values` writes a heading in table mode. I added `-o yaml` to both redirected commands.
- The `helm diff` install example did not mention Helm 4 plugin verification behavior. The plugin's own README documents that Helm 4 users may need `--verify=false` because the plugin does not publish provenance artifacts. I added a short compatibility note without changing the Helm 3-compatible command.
- The post stated that Helm stores release history as Kubernetes Secrets. Helm documents Secrets as the default storage backend, with `HELM_DRIVER` supporting other backends. I changed this to "By default, Helm stores release information as Kubernetes Secrets."
- The line "To clean up old revisions manually" only showed how to list release Secrets, not remove them. I changed the wording to reflect inspection rather than cleanup.
- The pending-state troubleshooting example filtered only `status=pending-upgrade` even though the section covered pending install and pending upgrade states generally. I changed the example to inspect the release Secrets with `--show-labels` so the labels can be reviewed regardless of pending subtype.
- The rollback comment said "Roll back to the last successful revision" while hardcoding revision `3`, which is only an example. I changed the comment to "Roll back to a known-good revision."
- The orphaned-resources section described `helm uninstall --no-hooks` as a "force delete." That flag only skips uninstall hooks; it is not a force-delete mechanism. I corrected the wording.
- The release-status reference table omitted the valid Helm statuses `unknown` and `uninstalled`. I added both entries and aligned the descriptions with Helm's upstream status definitions.

## Review Notes
- Rancher currently documents Apps management around Helm 3-compatible charts, while Helm upstream documentation now includes Helm 4 behavior. The post remains usable, but Helm 4 users should pay attention to plugin-install verification differences.
- The Rancher docs used for review confirm `Apps > Installed Apps`, upgrade flows, and app detail access, but deeper revision inspection is still better covered by the Helm CLI than by the Rancher UI documentation.
