# Validation Summary: How to Fix Problems During Calico CNI Removal

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico CNI
- Kubernetes CustomResourceDefinitions
- Kubernetes finalizers
- kubectl
- CNI node configuration
- Linux iptables
- Kubernetes RBAC

## Sources Consulted
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Calico node decommissioning documentation: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico Kubernetes requirements documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico hard-way calico/node installation documentation, including the preStop shutdown hook: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico v3.32 manifest for CRD names, RBAC names, CNI config paths, and CNI install behavior: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml
- Calico v3.32 CRD manifest for IPAMBlock, IPAMHandle, and BlockAffinity resource names: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
- iptables command help from the local environment (`iptables v1.8.10`)

## Issues Found
- The post stated that removing Calico IPAM finalizers is safe once the `calico-node` DaemonSet is deleted. Kubernetes documentation warns that finalizers should not be removed blindly because they represent cleanup work. I changed this to say finalizers should only be removed after confirming Calico will not be restored to complete cleanup and after manually accounting for remaining IPAM state.
- The CRD deletion command used `grep calico`, which can match less precisely than needed for Calico API CRDs and can invoke `kubectl delete crd` with no arguments if there are no matches. I changed it to target `projectcalico.org` CRDs and use `xargs -r`.
- The iptables cleanup only handled the default filter table and the nat table, and it tried to delete chains before removing jump references. Calico can program multiple iptables tables, and referenced chains cannot be deleted. I changed the command to remove references to `cali-` chains across `filter`, `nat`, `mangle`, and `raw`, then flush and delete the chains.
- The prevention section referenced an official `calicoctl` cleanup step before DaemonSet removal, but the current Calico documentation and CLI reference do not document a `calicoctl cleanup` command. I changed the guidance to let `calico-node` terminate cleanly so its configured `/bin/calico-node -shutdown` preStop hook can run before host-state removal.

## Review Notes
The guide is technically relevant and the corrected commands match current Kubernetes and Calico resource naming for the documented CRD API group. The node cleanup examples assume SSH access to node names and Linux/GNU userland behavior, including `xargs -r`; that is common for self-managed Linux clusters but may need adaptation for managed clusters, Windows nodes, or environments without direct node SSH.
