# Validation Summary: How to Troubleshoot VM Boot Issues in Harvester

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
- cloud-init
- Longhorn
- VirtualMachineImage
- NetworkAttachmentDefinition

## Sources Consulted
- Harvester VM troubleshooting: https://docs.harvesterhci.io/v1.7/troubleshooting/vm/
- Harvester image upload and `VirtualMachineImage` examples: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Harvester networking and `NetworkAttachmentDefinition` examples: https://docs.harvesterhci.io/v1.7/networking/index
- KubeVirt architecture and `status.printableStatus`: https://kubevirt.io/user-guide/architecture/
- KubeVirt access guide for `virtctl console` and `virtctl vnc`: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt virtual hardware guide for BIOS/UEFI behavior: https://kubevirt.io/user-guide/compute/virtual_hardware/
- KubeVirt API reference for `VirtualMachineStatus` and disk `bootOrder`: https://kubevirt.io/api-reference/v1.5.1/definitions.html
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- cloud-init user-data validation guide: https://docs.cloud-init.io/en/latest/howto/debug_user_data.html
- cloud-init re-run guide: https://docs.cloud-init.io/en/latest/howto/rerun_cloud_init.html
- cloud-init CLI reference: https://docs.cloud-init.io/en/latest/reference/cli.html

## Issues Found
- The lifecycle diagram mixed `VirtualMachine`, `VirtualMachineInstance`, and pod/container states into a single linear flow. I split it into the correct layers and clarified that `CrashLoopBackOff` is a pod/container state, not a VM object state.
- The status guidance treated `status.phase` as the main VM field. I changed it to `vm.status.printableStatus` for the VM layer and kept `vmi.status.phase` and `vmi.status.conditions` for the VMI layer, which matches current KubeVirt behavior.
- Several pod inspection examples used `kubectl describe pod $(... -o name)` and `kubectl get pod $(... -o name)`. Those subshells return `pod/<name>`, which is the wrong shape when the outer command already specifies `pod`. I changed them to return raw pod names via JSONPath.
- The boot-order patch used JSON Patch `replace`, which fails when `bootOrder` does not already exist. I changed it to `add` and clarified that the disk index must match the actual boot disk.
- The UEFI example incorrectly implied `machine.type: q35` is required for UEFI. I removed that claim and kept the supported `firmware.bootloader.efi` configuration.
- The cloud-init debugging section used a less accurate rerun command and an unsupported Python internal API example. I changed the rerun step to documented `cloud-init clean --logs --reboot` and reduced validation to the supported `cloud-init schema --config-file ... --annotate` command.
- The CrashLoopBackOff section incorrectly framed the condition as a VM state, omitted `-c compute` on `kubectl logs --previous`, and used `app=virt-handler`, which is not the selector used by current Harvester docs. I corrected the section to target the `virt-launcher` pod, added `-c compute`, and switched to `kubevirt.io=virt-handler` with node lookup from the VMI.
- The NetworkAttachmentDefinition command used a generic alias. I changed it to the fully qualified resource name from Harvester’s networking docs to avoid ambiguity.

## Review Notes
- The post is technically sound after the fixes above.
- Some commands assume shell access to a Harvester node, especially the OOM check using `dmesg`.
- `virtctl vnc` requires `remote-viewer` on the client system.
