# Validation Summary: How to Install Longhorn with Helm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Helm
- `kubectl`
- iSCSI / `open-iscsi`

## Sources Consulted
- Longhorn archived install guide for v1.7.0: https://longhorn.io/docs/archives/1.7.0/deploy/install/
- Longhorn archived Helm install guide for v1.7.0: https://longhorn.io/docs/archives/1.7.0/deploy/install/install-with-helm/
- Longhorn archived default settings guide for v1.7.0: https://longhorn.io/docs/archives/1.7.0/advanced-resources/deploy/customizing-default-settings/
- Longhorn archived Helm values reference for v1.7.0: https://longhorn.io/docs/archives/1.7.0/references/helm-values/
- Longhorn archived uninstall guide for v1.7.0: https://longhorn.io/docs/archives/1.7.0/deploy/uninstall/
- Longhorn archived UI access guide for v1.7.0: https://longhorn.io/docs/archives/1.7.0/deploy/accessing-the-ui/
- Longhorn archived best practices for v1.7.0: https://longhorn.io/docs/archives/1.7.0/best-practices/
- Longhorn chart metadata for `longhorn-1.7.0`: https://raw.githubusercontent.com/longhorn/charts/longhorn-1.7.0/charts/longhorn/Chart.yaml
- Longhorn chart values for `longhorn-1.7.0`: https://raw.githubusercontent.com/longhorn/charts/longhorn-1.7.0/charts/longhorn/values.yaml
- Helm command reference for `helm search repo`: https://helm.sh/docs/helm/helm_search_repo
- Helm command reference for `helm get values`: https://helm.sh/docs/helm/helm_get_values
- Helm command reference for `helm upgrade`: https://helm.sh/docs/helm/helm_upgrade

## Issues Found
- The prerequisites section said only `open-iscsi` was required on nodes. Longhorn v1.7.0 requires both `open-iscsi` and a running `iscsid` daemon, so the prerequisite was corrected.
- The post omitted that the environment check script may require local `jq`. This was added because the official v1.7.0 install docs call it out.
- The post claimed "at least 10 GiB recommended" per node without support in the official v1.7.0 docs. This was replaced with a storage recommendation aligned with Longhorn best practices.
- The post did not mention the Pod Security Policy caveat for supported Kubernetes versions below v1.25. A prerequisite note was added to use `--set enablePSP=true` when PSP admission is still enabled, matching the official Helm install docs.
- The repository verification command used `helm search repo longhorn` while claiming to show available chart versions. Helm only shows the latest stable chart entry by default, so the command was corrected to `helm search repo longhorn/longhorn --versions`.
- The sample `values.yaml` used an incorrect schema for `longhornManager.priorityClass` by nesting `name:` under it. In the official chart, `longhornManager.priorityClass` is a string, so the snippet was corrected.
- The `defaultSettings.defaultReplicaCount` comment implied it applied to all new volumes. In Longhorn v1.7.0, that setting applies to volumes created from the Longhorn UI, so the comment was corrected for accuracy.
- The `helm get values` example claimed to show all applied values, but without `--all` Helm only returns user-supplied values. The command was corrected to `helm get values longhorn -n longhorn-system --all`.
- The uninstall section omitted Longhorn's required `deleting-confirmation-flag` step. The official patch command was added before `helm uninstall`.
- The uninstall warning was too narrow. It was updated to reflect the official guidance to remove workloads using Longhorn volumes before uninstalling and to preserve data because PersistentVolumes are not automatically removed.

## Review Notes
- The post is pinned to Longhorn `v1.7.0`, which is an archived release as of April 30, 2026. The review validated the post against archived `v1.7.0` documentation and chart sources, not the latest Longhorn release.
- The environment check script used in the post is deprecated in Longhorn `v1.7.0` in favor of `longhornctl check preflight`, but it still exists and is documented for that version.
