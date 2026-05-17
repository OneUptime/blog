# Validation Summary: How to Configure Talos Linux VMs on VMware vSphere

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- VMware vSphere / vCenter (7.0+)
- govc (vSphere CLI)
- talosctl
- Kubernetes
- vSphere Cloud Controller Manager (CCM)
- vSphere CSI Driver
- vSAN storage policies

## Sources Consulted
- Talos VMware install docs: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/virtualized-platforms/vmware/
- Talos v1.7.0 GitHub release assets (confirmed `vmware-amd64.ova` exists): https://github.com/siderolabs/talos/releases/tag/v1.7.0
- kubernetes/cloud-provider-vsphere repo releases directory: https://github.com/kubernetes/cloud-provider-vsphere/tree/master/releases
- kubernetes-sigs/vsphere-csi-driver vanilla manifests: https://github.com/kubernetes-sigs/vsphere-csi-driver/tree/master/manifests/vanilla
- govc command reference (vm.clone, vm.change, vm.disk.change, vm.network.change, vm.power, vm.ip, cluster.rule.create, snapshot.create, import.ova, vm.markastemplate)
- HTTP HEAD checks on referenced raw GitHub URLs to verify reachability

## Issues Found
- **Broken vSphere CCM manifest URL**: The post referenced `https://raw.githubusercontent.com/kubernetes/cloud-provider-vsphere/master/releases/latest/vsphere-cloud-controller-manager.yaml`. The `releases/latest/` path does not exist in the upstream repo (verified with curl, returns 404). The `releases/` directory only contains version-specific folders (v1.18 … v1.36). Replaced with `releases/v1.30/...` (verified to return 200) and added a note to choose the release matching the user's Kubernetes version.

## Review Notes
- The Talos OVA download from `github.com/siderolabs/talos/releases/download/v1.7.0/vmware-amd64.ova` is still served (302 → asset download) and was confirmed present via `gh release view`. Note that Sidero's current docs now recommend pulling vSphere OVAs from the Image Factory (`https://factory.talos.dev/image/{hash}/{version}/vmware-amd64.ova`) so the published OVA includes `open-vm-tools`; the GitHub release path used in the post still works but is the older flow.
- The `disk.enableUUID` value is shown as `TRUE`. Talos's own docs use `disk.enableUUID=1`. Both are accepted by vSphere — left as-is since either form works.
- The CCM ConfigMap in the post uses the legacy INI-style format with `[Global]` / `[VirtualCenter "..."]` sections. Recent cloud-provider-vsphere versions document a YAML-style `vsphere.conf`, but the CCM still parses the INI format for backward compatibility, so the example continues to work.
- The `--config-patch` JSON Patch targeting `/cluster/externalCloudProvider` is applied to both control plane and worker configs. Talos worker configs do contain a `cluster:` section, so the patch applies cleanly; the `externalCloudProvider` field is only acted on by the control plane, which is harmless.
- The `--cloud-provider=external` kubelet flag is still the supported value for delegating to an out-of-tree CCM. Only the legacy in-tree provider names (e.g. `aws`, `vsphere`) have been removed.
- `releases/v1.30/` was chosen as a stable, broadly-compatible CCM release; readers running newer Kubernetes (1.31+) should bump the version in the URL accordingly. The added inline comment now flags this.
