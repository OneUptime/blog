# Validation Summary: How to Troubleshoot VM Boot Issues in Harvester - Issues

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- `kubectl`
- Longhorn
- `virtctl`
- cloud-init
- NetworkAttachmentDefinition (Multus/CNI)

## Sources Consulted
- Harvester VM troubleshooting: https://docs.harvesterhci.io/v1.7/troubleshooting/vm/
- Harvester VM access: https://docs.harvesterhci.io/v1.7/vm/access-to-the-vm/
- Harvester image upload / `VirtualMachineImage` usage: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Harvester `VirtualMachineImage` API type definition (official source): https://github.com/harvester/harvester/blob/master/pkg/apis/harvesterhci.io/v1beta1/image.go
- KubeVirt Accessing Virtual Machines: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt `virtctl` installation guide: https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/
- KubeVirt `VirtualMachineStuckOnNode` runbook: https://kubevirt.io/monitoring/runbooks/VirtualMachineStuckOnNode
- cloud-init CLI reference: https://docs.cloud-init.io/en/latest/reference/cli.html
- cloud-init user-data validation guide: https://docs.cloud-init.io/en/latest/howto/debug_user_data.html
- cloud-init status guide: https://docs.cloud-init.io/en/latest/howto/status.html
- cloud-init log files reference: https://docs.cloud-init.io/en/latest/reference/user_files.html
- Longhorn CRDs (official source): https://github.com/longhorn/longhorn/blob/master/chart/templates/crds.yaml

## Issues Found
1. The post used `kubectl get lhvolume`, but Longhorn’s volume CRD is `volumes.longhorn.io` with short name `lhv`, not `lhvolume`. Updated the command to use the canonical resource name.
2. The cloud-init section said “Or via kubectl” immediately before a `virtctl console` command. Corrected the wording to `virtctl`.
3. The post used the outdated `cloud-init devel schema` syntax. Updated both occurrences to the current `cloud-init schema --config-file user-data.yaml --annotate` form documented by cloud-init.
4. The network troubleshooting section used `kubectl get nad`, which is less reliable than the canonical resource name documented by Harvester’s API. Updated it to `kubectl get network-attachment-definitions.k8s.cni.cncf.io -n default`.
5. The image troubleshooting section expected `Failed: false`, but Harvester’s `VirtualMachineImage` API exposes `status.failed` as an integer counter, not a boolean. Updated the guidance to `Initialized: True`, `Imported: True`, and `Failed: 0`, and adjusted the commands to inspect `virtualmachineimages`.
6. The `virtctl` installation example was pinned to the old fixed release `v1.2.0`. Replaced it with KubeVirt’s current documented stable-release installation flow so the command stays current.

## Review Notes
- Validated against Harvester v1.7 documentation and current upstream KubeVirt, Longhorn, and cloud-init documentation as of 2026-04-30.
- Harvester’s troubleshooting guide also documents version-specific VM start failures such as the `not a device node` CSI issue on impacted older releases. The post remains intentionally generic, but operators on older Harvester versions should check the versioned Harvester troubleshooting page for release-specific workarounds.
