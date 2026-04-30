# Validation Summary: How to Create Virtual Machines in Harvester

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- `kubectl`
- `virtctl`
- cloud-init
- Multus / NetworkAttachmentDefinition-based VM networking

## Sources Consulted
- Harvester docs: Create a Virtual Machine — https://docs.harvesterhci.io/v1.7/vm/index/
- Harvester docs: Create a Volume — https://docs.harvesterhci.io/v1.7/volume/index/
- Harvester docs: VM Network — https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester API docs: Create a Namespaced Virtual Machine Template — https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-template/
- Harvester source: template API types — https://github.com/harvester/harvester/blob/master/pkg/apis/harvesterhci.io/v1beta1/template.go
- Harvester source: built-in VM template versions — https://github.com/harvester/harvester/blob/master/pkg/data/template.go
- KubeVirt user guide: Run Strategies — https://kubevirt.io/user-guide/compute/run_strategies/
- KubeVirt user guide: Lifecycle — https://kubevirt.io/user-guide/user_workloads/lifecycle/
- KubeVirt user guide: Interfaces and Networks — https://kubevirt.io/user-guide/network/interfaces_and_networks/
- cloud-init docs: About the cloud-config file — https://cloudinit.readthedocs.io/en/stable/explanation/about-cloud-config.html
- Kubernetes docs: Field Selectors — https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes docs: kubectl Quick Reference — https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found

1. **The introduction claimed the guide covered Terraform, but the post did not include a Terraform method.** Updated the introduction to match the actual content: UI, Kubernetes manifests, and Harvester VM templates.

2. **The UI boot-volume instructions incorrectly told readers to set a StorageClass for an image-backed disk.** Harvester documents that image-backed volumes use the StorageClass associated with the selected image. Updated the step to reflect that behavior.

3. **The networking description was too broad about management-network access.** Harvester documents the management network as in-cluster connectivity, while VLAN or untagged networks are used for external connectivity. Updated the text accordingly.

4. **The cloud-init example was formatted incorrectly.** cloud-init requires the first line of a cloud-config file to begin with `#cloud-config`. Removed the leading comment so the example will be recognized correctly.

5. **The `kubectl` example referenced a root-disk PVC that was never created.** Added a documented Harvester image-backed PVC manifest using the `harvesterhci.io/imageId` annotation and corresponding image StorageClass, then attached that PVC to the VM.

6. **The `kubectl` VM example mixed older `running` usage with current run-strategy guidance.** Updated the VM manifest to use `runStrategy: RerunOnFailure`, which aligns with Harvester’s documented/default behavior and avoids mixing `running` with `runStrategy`.

7. **The template manifests used invalid Harvester field names and an incomplete boot-disk definition.** Corrected `defaultVersionID` to `defaultVersionId` and `templateID` to `templateId`, then replaced the empty `dataVolume` placeholder with a valid Harvester template pattern using `harvesterhci.io/volumeClaimTemplates`, a root-disk PVC claim, and required CPU/memory limits.

8. **The lifecycle section used `kubectl patch` against `spec.running`, which no longer matched the corrected examples.** Replaced those commands with `virtctl start`, `virtctl stop`, and `virtctl restart`, and changed the detail command to `kubectl describe vm` so it works even when the VM is stopped.

9. **The event-sorting command used `.lastTimestamp`, which is no longer the recommended sort key in current Kubernetes docs.** Updated it to sort by `.metadata.creationTimestamp`.

## Review Notes
- The example image identifiers such as `default/image-8rb2z` and StorageClasses such as `longhorn-image-8rb2z` are placeholders and must be replaced with real values from the target Harvester cluster.
- Harvester’s management network is convenient for in-cluster access, but its IP address can change after reboot. For stable external connectivity, VLAN or untagged VM networks remain the better choice.
