# Validation Summary: How to Set Up Harvester for Dev/Test Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- Multus / NetworkAttachmentDefinition
- CDI DataVolumes
- Rancher
- K3s
- Longhorn StorageClass

## Sources Consulted
- Harvester VM Network documentation: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester Virtual Machines documentation: https://docs.harvesterhci.io/v1.5/vm/index/
- Harvester StorageClass documentation: https://docs.harvesterhci.io/v1.4/advanced/storageclass/
- Harvester Managed DHCP documentation: https://docs.harvesterhci.io/v1.4/advanced/addons/managed-dhcp
- Harvester VirtualMachineTemplate API: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-template/
- Harvester VirtualMachineTemplateVersion API schema: https://docs.harvesterhci.io/v1.2/api/create-namespaced-virtual-machine-template-version/
- Kubernetes ResourceQuota documentation: https://v1-33.docs.kubernetes.io/docs/concepts/policy/resource-quotas/
- KubeVirt Run Strategies: https://kubevirt.io/user-guide/compute/run_strategies/
- KubeVirt Accessing Virtual Machines: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt Filesystems, Disks and Volumes: https://kubevirt.io/user-guide/storage/disks_and_volumes/
- KubeVirt Interfaces and Networks: https://kubevirt.io/user-guide/network/interfaces_and_networks/
- CDI API reference: https://kubevirt.io/cdi-api-reference/main/definitions.html
- Rancher on Harvester K3s cluster creation: https://documentation.suse.com/external-tree/en-us/cloudnative/virtualization/v1.4/en/integrations/rancher/node-driver/k3s-cluster.html

## Issues Found
- The original Step 1 network YAML was not a supported Harvester VM-network workflow. It mixed Harvester route annotations with a hand-written bridge/Whereabouts config and assumed a bridge that Harvester does not create that way. I replaced it with the documented Harvester VM Network UI flow and added the Managed DHCP caveat for networks without an external DHCP server.
- The original `VirtualMachineTemplate` YAML in Step 2 was incorrect. Harvester templates and template versions are separate resources, and the example used an invalid `spec.versionName` field on the template object. I removed the broken YAML and kept the UI-based workflow, which matches the documented Harvester behavior.
- The VM provisioning script in Step 4 had multiple correctness issues. It referenced `dev-network` without the namespace qualifier even though the network was created in `default`, used `kubectl virtctl vnc` instead of `virtctl vnc`, pointed to the wrong Harvester storage class name (`longhorn` instead of `harvester-longhorn`), and used a placeholder registry source. I corrected the network reference, console command, storage class, and switched the disk import to a documented CDI registry source.
- The original Step 4/Step 5 flow would leak storage. The VM used a separate `DataVolume`, while the cleanup job only deleted `VirtualMachine` objects. I changed the VM definition to use `dataVolumeTemplates`, which ties the imported disk to the VM lifecycle and aligns the cleanup step with KubeVirt behavior.
- The cleanup CronJob in Step 5 would not run as written because it depended on `jq` in a `bitnami/kubectl` image and declared a service account without any RBAC. I replaced the `jq` dependency with `kubectl` JSONPath plus shell date parsing, and added the required `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding`.
- The Rancher instructions in Step 6 used the wrong creation path and implied automatic cleanup that is not documented. I updated the flow to the documented Rancher path for the Harvester node driver, and added the official caveats that the K3s node driver is Tech Preview, requires a VLAN network, and only supports cloud images.

## Review Notes
- Harvester Managed DHCP is still documented as experimental, so it is suitable for dev/test but should not be presented as the default production approach without qualification.
- The Rancher Harvester K3s node driver is documented as Tech Preview. That is acceptable for short-lived test clusters, but readers should expect feature and support limitations.
- The namespace quota example is technically valid, but CPU and memory enforcement for VM workloads ultimately applies through the KubeVirt launcher pod resources.
