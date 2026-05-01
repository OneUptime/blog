# Validation Summary: How to Create Elemental Machine Registrations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elemental
- Rancher
- Kubernetes
- `MachineRegistration`
- `MachineInventory`
- `kubectl`

## Sources Consulted
- Elemental MachineRegistration reference: https://elemental.docs.rancher.com/machineregistration-reference/
- Elemental Inventory Management: https://elemental.docs.rancher.com/inventory-management/
- Elemental Label Templates CPU: https://elemental.docs.rancher.com/label-templates-cpu/
- Elemental Label Templates Memory: https://elemental.docs.rancher.com/label-templates-memory/
- Elemental Label Templates Product: https://elemental.docs.rancher.com/label-templates-product/
- Elemental Label Templates deprecated variables: https://elemental.docs.rancher.com/label-templates-deprecated/
- Elemental Operator `MachineRegistration` type definition: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineregistration_types.go
- Elemental Operator config types: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/types.go
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The post used `spec.machineLabels`, but the Elemental CRD defines `spec.machineInventoryLabels`. I changed both YAML examples to the correct field name.
- The basic example included `config.elemental.registration.uri`, which is not a valid field. The current schema uses `url`, and the registration URL/token are exposed through `status`, so I removed the invalid placeholder block from the example.
- The basic example used an unverified `element.cattle.io/os.management` label and described labels too broadly. I replaced that with ordinary example inventory labels that are valid Kubernetes labels.
- The post implied cloud-config is applied during registration. Elemental’s reference states the `cloud-config` is injected into the node and evaluated after reboot, so I corrected that explanation.
- The post said MachineRegistration defines RBAC. The resource does not expose RBAC configuration in `spec`; I replaced that explanation with installation settings and machine inventory metadata, which are the documented responsibilities of the resource.
- The advanced example used unsupported `install.partitions` keys and a nonexistent `system-agent.values` map. I replaced that subsection with a documented `install.device-selector` example from the current MachineRegistration schema.
- The hardware label example used deprecated and incorrect template variables, including a CPU comment mapped to `${System Information/Manufacturer}` and a memory variable that does not exist in the current label-template reference. I updated the example to current label-template variables: `${CPU/Processor/Model}`, `${Memory/TotalPhysicalBytes}`, and `${Product/SerialNumber}`.
- The commands retrieved `status.registrationURL` and `status.registrationToken` immediately after creation. Since Elemental documents those as available once the MachineRegistration is `Ready`, I added `kubectl wait --for=condition=Ready` before inspecting status.

## Review Notes
- Elemental still documents older SMBIOS and hardware label-template families in some pages and examples, but those variable families were deprecated in Elemental Operator v1.7.0. The post now uses the newer label-template families to avoid future breakage.
- Public Elemental docs contain at least one inconsistent `Product/Serial Number` example, while the dedicated Product template reference lists `Product/SerialNumber`. The post uses `Product/SerialNumber`, which matches the current template reference and deprecation mapping.
- `kubectl` was not installed in the local review environment, so CLI syntax was checked against the official Kubernetes command reference rather than local `--help` output.
