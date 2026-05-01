# Validation Summary: How to Manage Elemental Machine Inventory

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Elemental
- Kubernetes
- `kubectl`
- `jq`
- Elemental `MachineInventory`, `MachineRegistration`, and `MachineInventorySelector`

## Sources Consulted
- Rancher Elemental Inventory Management: https://elemental.docs.rancher.com/inventory-management/
- Rancher Elemental MachineInventory reference: https://elemental.docs.rancher.com/machineinventory-reference/
- Rancher Elemental MachineRegistration reference: https://elemental.docs.rancher.com/machineregistration-reference/
- Rancher Elemental Machine Reset: https://elemental.docs.rancher.com/reset/
- Rancher Elemental Troubleshooting Reset: https://elemental.docs.rancher.com/troubleshooting-reset/
- Rancher Elemental MachineInventorySelectorTemplate reference: https://elemental.docs.rancher.com/machineinventoryselectortemplate-reference
- Rancher Elemental MachineInventorySelector reference: https://elemental.docs.rancher.com/machineinventoryselector-reference
- Rancher Elemental operator API source for `MachineInventory`: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineinventory_types.go
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl` quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The sample `MachineInventory` resource used undocumented or incorrect fields and annotations for current Elemental, including `elemental.cattle.io/registered`, `spec.machineRegistrationRef`, and `spec.machineRef`. I replaced these with documented system annotations and the documented ownership pattern via `metadata.ownerReferences`, while keeping the valid `spec.tpmHash` field.
- The “not yet adopted” and “adopted” queries depended on the nonexistent `spec.machineRef` field. I updated both commands to detect adoption by checking for a `MachineInventorySelector` owner reference, which matches Elemental’s documented selector adoption model.
- The “Generate a CSV report” example used `kubectl get -o custom-columns`, which produces aligned table output rather than CSV. I replaced it with a `jq @csv` pipeline that emits real CSV rows.
- The deletion note claimed that deleting a `MachineInventory` would trigger re-provisioning if it was part of a cluster. I corrected this to reflect Elemental’s documented reset behavior: deletion only triggers the reset workflow when reset is enabled for that machine.

## Review Notes
- The post is technically relevant and salvageable after the corrections above.
- The examples assume `jq` is installed locally for JSON filtering and CSV generation.
- Reset behavior in Elemental is configuration-dependent. Direct `MachineInventory` deletion does not universally imply reset or reprovisioning unless reset has been enabled through the relevant Elemental settings.
