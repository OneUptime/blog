# Validation Summary: How to Set Up VM Affinity Rules in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes scheduling
- kubectl
- YAML manifests for virtual machines

## Sources Consulted
- Harvester documentation, "Create a Virtual Machine": https://docs.harvesterhci.io/v1.5/vm/index/
- Harvester documentation, "Create a Windows Virtual Machine": https://docs.harvesterhci.io/v1.5/vm/create-windows-vm/
- KubeVirt user guide, "Node assignment": https://kubevirt.io/user-guide/compute/node_assignment/
- KubeVirt user guide, "Run Strategies": https://kubevirt.io/user-guide/compute/run_strategies/
- KubeVirt API Reference, `v1.VirtualMachineSpec`: https://kubevirt.io/api-reference/v1.5.1/definitions.html#_v1_virtualmachinespec
- Kubernetes documentation, "Assigning Pods to Nodes": https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes reference, `kubectl label`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes reference, `kubectl get`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes reference, `kubectl describe`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The VM manifests used `spec.running: true`. In current KubeVirt API documentation, `running` is deprecated in `VirtualMachineSpec` and `runStrategy` is the current field. I replaced all four occurrences with `runStrategy: Always`, which preserves the intended behavior.
- The UI walkthrough said affinity settings are configured from the `Advanced` tab and listed option text that does not match Harvester's current documented layout. I corrected the steps to use the `Node Scheduling` tab for node-label rules and the `VM Scheduling` tab for workload affinity and anti-affinity rules.

## Review Notes
- The affinity and anti-affinity examples are otherwise aligned with KubeVirt and Kubernetes scheduling semantics. `podAffinity` and `podAntiAffinity` are valid under `spec.template.spec.affinity`, and using `kubernetes.io/hostname` for hard pod anti-affinity is consistent with Kubernetes guidance.
- The verification commands are valid `kubectl` usage. The `vmi` short resource name is standard in KubeVirt-based environments.
- The manifest examples assume the referenced PVCs already exist and that any target workloads used by affinity selectors are labeled as shown.
