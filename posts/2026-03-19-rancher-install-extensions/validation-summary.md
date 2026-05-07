# Validation Summary: How to Install Rancher UI Extensions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher UI Extensions
- Kubernetes
- Helm
- `kubectl`
- Rancher API
- OCI registries

## Sources Consulted
- Rancher Manager documentation, "SUSE Rancher Prime Extensions": https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/integrations/rancher-extensions.html
- Rancher UI Extensions documentation, "Air-gapped Environments": https://extensions.rancher.io/extensions/next/advanced/air-gapped-environments
- Rancher Dashboard source, extension repository defaults: https://github.com/rancher/dashboard/blob/release-2.13/shell/config/uiplugins.js
- Rancher Dashboard source, `ClusterRepo` editor and supported target types: https://github.com/rancher/dashboard/blob/release-2.13/shell/edit/catalog.cattle.io.clusterrepo.vue
- Rancher `ClusterRepo` CRD schema: https://github.com/rancher/rancher/blob/main/pkg/crds/yaml/generated/catalog.cattle.io_clusterrepos.yaml
- Rancher `UIPlugin` CRD schema: https://github.com/rancher/rancher/blob/main/pkg/crds/yaml/generated/catalog.cattle.io_uiplugins.yaml
- Rancher API handler for UI plugin delivery: https://github.com/rancher/rancher/blob/main/pkg/api/steve/catalog/plugin.go
- Rancher charts repository index and `ui-plugin-operator` chart metadata: https://charts.rancher.io/index.yaml
- Rancher UI plugin charts air-gapped guidance: https://github.com/rancher/ui-plugin-charts/blob/main/airgapped.md

## Issues Found
- The prerequisites said "Admin or cluster-owner privileges". Rancher’s current extensions documentation requires logging in as an admin to access and manage the Extensions page, so this was corrected to admin privileges.
- The Helm enablement command used `--set ui-plugin-operator.enabled=true` on the main Rancher chart. That is not the current way to install extension support. It was replaced with installation of the `ui-plugin-operator-crd` and `ui-plugin-operator` charts from `https://charts.rancher.io`, with a note to choose versions compatible with the Rancher release.
- The install flow said a page refresh "may" be required. Current Rancher docs explicitly require reloading after a successful install to load the new UI code, so the wording was corrected.
- The repository management section treated extension repositories as Helm index repositories only. Current Rancher supports Git-backed repositories, HTTP(S) Helm index URLs, and OCI repositories in the UI. The UI instructions were updated to reflect the supported target types.
- The `ClusterRepo` YAML example only showed `spec.url` and the API example only printed `spec.url`. That misses Git-backed extension repositories, including Rancher’s official extensions repo. The examples were corrected to use `spec.gitRepo` / `spec.gitBranch` for the kubectl example and `(.spec.url // .spec.gitRepo)` in the API example.
- The Helm install and upgrade examples used `https://charts.rancher.io/extensions`, which does not exist as a valid chart repository URL. They were replaced with OCI-based examples that match Rancher’s supported repository model.
- The `UIPlugin` custom resource example pointed `endpoint` at what looked like a chart repository path and used `noAuth` unnecessarily. The example was corrected so `endpoint` / `compressedEndpoint` clearly point to built plugin assets, which is what the `UIPlugin` CRD and Rancher plugin-serving code expect.
- The UI upgrade flow pointed readers to `Extensions > Installed`. Current Rancher documentation uses the `Updates` tab for upgrades, so the steps were updated accordingly.
- The post claimed an installed extension could be "disabled" by patching `spec.plugin.noCache=true`. That is incorrect: `noCache` controls caching behavior, not whether an extension is disabled. The section was corrected to explain that Rancher supports global "Disable Extension Support" rather than a per-extension disable toggle that preserves installation.
- The kubectl uninstall command was presented as a general uninstall path. Deleting a `UIPlugin` is appropriate for manually created `UIPlugin` resources, but not as a generic equivalent of uninstalling a Helm-managed extension. The text was clarified.
- The air-gapped section described mirroring a chart and arbitrary extension image, which does not match Rancher’s documented Extension Catalog Image workflow. It was replaced with a mirrored catalog image plus `Manage Extension Catalogs` import flow aligned with current Rancher docs.
- The troubleshooting command used `-l app=ui-plugin-operator`, which does not match current chart labels reliably. It was corrected to fetch logs from `deployment/ui-plugin-operator`.
- The repository refresh example used a `cattle.io/force-update` annotation. Current `ClusterRepo` refreshes are driven by `spec.forceUpdate`, so the command was corrected to patch that field with an RFC3339 timestamp.

## Review Notes
- Rancher extension support starts in Rancher 2.7, but extension and operator chart compatibility is release-specific. Installing the latest `ui-plugin-operator` chart blindly is unsafe; the chart version must match the Rancher version range published in the chart metadata.
- Rancher’s official extensions repository is currently defined as a Git-backed `ClusterRepo` in the dashboard source, not as the nonexistent `https://charts.rancher.io/extensions` Helm repository used in the original draft.
- `UIPlugin` resources are namespaced and expect plugin asset endpoints, not Helm repository URLs. For declarative installs, the chart package and the `UIPlugin` asset endpoint serve different roles.
