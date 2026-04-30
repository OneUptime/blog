# Validation Summary: How to Attach Volumes to VMs in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- `kubectl`
- `virtctl`
- Longhorn
- cloud-init
- Linux block devices and filesystems

## Sources Consulted
- Harvester: Hot-Plug Volumes https://docs.harvesterhci.io/v1.7/vm/hotplug-volume/
- Harvester: Edit a Virtual Machine https://docs.harvesterhci.io/v1.7/vm/edit-vm/
- Harvester: Virtual Machines https://docs.harvesterhci.io/v1.7/vm/virtual-machines
- KubeVirt user guide: Hotplug Volumes https://kubevirt.io/user-guide/storage/hotplug_volumes/
- KubeVirt user guide: Filesystems, Disks and Volumes https://kubevirt.io/user-guide/storage/disks_and_volumes/
- KubeVirt user guide: Download and Install the virtctl Command Line Interface https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/
- KubeVirt user guide: Windows virtio drivers https://kubevirt.io/user-guide/user_workloads/windows_virtio_drivers/
- KubeVirt source: `virtctl addvolume` implementation https://github.com/kubevirt/kubevirt/blob/main/pkg/virtctl/vm/add_volume.go
- KubeVirt source: `virtctl removevolume` implementation https://github.com/kubevirt/kubevirt/blob/main/pkg/virtctl/vm/remove_volume.go
- KubeVirt API source: `VirtualMachineSpec` and `status.observedKubeVirtVersion` https://github.com/kubevirt/kubevirt/blob/main/staging/src/kubevirt.io/api/core/v1/types.go

## Issues Found
- The stopped-VM UI instructions used generic wording for the edit flow. I updated them to match Harvester's documented `Edit Config` workflow.
- The bus recommendation implied `SATA` is the general choice for Windows disks. I corrected this to reflect current KubeVirt and Harvester guidance: `VirtIO` is appropriate when the guest has VirtIO drivers, and `SATA` is mainly a compatibility fallback.
- The hot-plug UI steps omitted the required volume name entry and used `Add` instead of Harvester's documented `Apply`. I corrected the steps to match the current UI.
- The cold-attach shell block was labeled as YAML even though it contains shell commands. I corrected the code fence to `bash`.
- The example VM manifest used deprecated `spec.running`. I replaced it with `spec.runStrategy: Always`, which is the current API direction.
- The `virtctl` install snippet wrote directly to `/usr/local/bin` without elevated permissions. I added `sudo` so the commands work on a typical Linux system.
- The `virtctl addvolume` and `virtctl removevolume` examples used the deprecated `--persist` flag. I removed it and updated the explanation because current KubeVirt persists these changes by default.
- The hot-plug example did not make the Harvester bus behavior explicit. I added `--bus=scsi` to align the post with Harvester's current hot-plug volume documentation and `virtctl` defaults.
- The verification command piped a `jsonpath` string into `jq`, which would not produce valid JSON. I changed it to fetch full JSON and then query `.status.volumeStatus`.
- The guest formatting section hard-coded `/dev/vdb`, which is not reliable across buses and guest OSes. I changed it to instruct the reader to identify the actual device path with `lsblk` first.
- The cold-detach JSON patch removed disk and volume entries by hard-coded array indexes, which could delete the wrong entries. I replaced it with a name-based index lookup before patching.
- The troubleshooting section incorrectly used `.spec.volumeName` on the PVC to determine whether the PVC was attached to another VM. I replaced that with a VM-spec search for matching `claimName` values.
- The troubleshooting section used a broad `grep` to check PVC state and a likely incorrect Longhorn-name assumption. I changed it to query the named PVC directly, derive the backing PV/Longhorn volume name from the PVC, and then inspect that exact Longhorn volume.

## Review Notes
- Harvester v1.7 currently documents hot-plug volumes as using the `scsi` bus. Upstream KubeVirt documentation and source show broader bus support in general, but this post was kept aligned with Harvester's product documentation.
