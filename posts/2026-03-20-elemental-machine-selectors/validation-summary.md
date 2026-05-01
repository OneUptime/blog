# Validation Summary: How to Configure Elemental Machine Selectors

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elemental / SUSE Rancher Prime OS Manager
- Kubernetes
- Rancher cluster provisioning
- RKE2
- `kubectl`
- `jq`

## Sources Consulted
- SUSE Rancher Prime OS Manager `MachineInventorySelectorTemplate` reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineinventoryselectortemplate-reference.html
- SUSE Rancher Prime OS Manager `MachineInventorySelector` reference: https://documentation.suse.com/cloudnative/os-manager/1.7/en/references/machineinventoryselector-reference.html
- SUSE Rancher Prime OS Manager inventory management reference: https://documentation.suse.com/cloudnative/os-manager/1.7/en/references/inventory-management.html
- SUSE Rancher Prime OS Manager Kubernetes cluster provisioning architecture: https://documentation.suse.com/cloudnative/os-manager/next/en/rancher-os-management/architecture/services/architecture-clusterdeployment.html
- SUSE Edge 3.5 Elemental quickstart: https://documentation.suse.com/suse-edge/3.5/html/edge/quickstart-elemental.html
- Rancher kontainer-driver-metadata for valid `kubernetesVersion` values: https://raw.githubusercontent.com/rancher/kontainer-driver-metadata/release-v2.14/data/data.json
- Elemental operator `MachineInventory` API source: https://raw.githubusercontent.com/rancher/elemental-operator/main/api/v1beta1/machineinventory_types.go
- Elemental operator `MachineInventorySelector` API source: https://raw.githubusercontent.com/rancher/elemental-operator/main/api/v1beta1/machineselector_types.go
- Elemental operator `MachineInventorySelectorTemplate` API source: https://raw.githubusercontent.com/rancher/elemental-operator/main/api/v1beta1/machineselectortemplate_types.go
- Elemental operator selector controller source: https://raw.githubusercontent.com/rancher/elemental-operator/main/controllers/machineselector_controller.go

## Issues Found
- The post presented `MachineInventorySelector` as the primary user-authored resource for cluster provisioning. I changed the explanation and YAML examples to use `MachineInventorySelectorTemplate`, because the official docs define the template as the user-created resource and Rancher generates `MachineInventorySelector` objects during provisioning.
- The cluster example referenced `cp-selector-template` without defining it anywhere in the post. I updated the dedicated template example to create `cp-selector-template` so the later cluster manifest references resources that are actually shown.
- The template example used `ready: "true"` as though it were a built-in inventory label. I replaced it with explicit labels (`role` and `environment`) that fit the documented selector model and do not rely on an undocumented default label.
- The jq command filtered on `.spec.machineRef`, but the `MachineInventory` CRD does not have that field. I changed the command to detect unadopted machines by checking for the absence of a `MachineInventorySelector` owner reference, which matches the documented adoption flow and controller implementation.
- The match-count command piped `kubectl get` to `wc -l` without suppressing the header row. I added `--no-headers` so the count is accurate.
- The cluster manifest used `kubernetesVersion: v1.28.0+rke2r1`, which is not present in Rancher 2.14 metadata as of 2026-05-01. I updated the example to `v1.34.6+rke2r1`, which is listed in the current metadata consulted during validation.

## Review Notes
- The selector logic and provisioning flow are now aligned with current Elemental documentation: users define `MachineInventorySelectorTemplate` resources, and Rancher provisioning generates `MachineInventorySelector` resources per requested machine.
- The exact `kubernetesVersion` value is environment-sensitive. Future updates should recheck the Rancher metadata branch that matches the Rancher release in use before publishing.
