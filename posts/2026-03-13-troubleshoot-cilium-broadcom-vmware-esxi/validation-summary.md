# Validation Summary: Troubleshoot Cilium on Broadcom VMware ESXi

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- VMware ESXi and vSphere networking
- VMware PowerCLI
- eBPF, tc, and XDP
- VXLAN and MTU configuration

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Routing Concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm Reference for MTU: https://docs.cilium.io/en/stable/helm-values/
- Cilium ConfigMap drift detection: https://docs.cilium.io/en/stable/configuration/configmap-drift-detection/
- Cilium Kubernetes configuration: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium BPF/XDP Program Types: https://docs.cilium.io/en/latest/reference-guides/bpf/progtypes/
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium cilium-dbg debuginfo command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_debuginfo/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- VMware PowerCLI Set-SecurityPolicy reference: https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/set-securitypolicy
- Broadcom VMware vSwitch security policy article: https://knowledge.broadcom.com/external/article/427110/forged-transmits-and-mac-address-changes.html

## Issues Found
- The post stated that promiscuous mode, MAC address changes, and forged transmits are always required for Cilium on ESXi. Changed this to a conditional troubleshooting check because VMware security policies only need relaxing when the guest sends or receives traffic using MAC addresses different from the VM's configured vNIC MAC.
- The post described VMXNET3 as providing eBPF offloading. Changed this to clarify that VMXNET3 is the preferred VMware paravirtual NIC and that native XDP support for vmxnet3 depends on Linux kernel 6.6 or later.
- The `kubectl debug` examples used `ubuntu`, which does not reliably include `ethtool` or other network troubleshooting tools. Changed the examples to use `nicolaka/netshoot`.
- The MTU ConfigMap patch did not mention that Cilium agents must pick up ConfigMap changes. Added a `kubectl rollout restart daemonset/cilium -n kube-system` command after the patch.
- The in-agent Cilium troubleshooting commands used `cilium monitor` and `cilium debuginfo`. Updated them to `cilium-dbg monitor` and `cilium-dbg debuginfo`, matching current Cilium command documentation for commands executed inside the Cilium agent pod.
- The jumbo frames best practice claimed that jumbo frames eliminate encapsulation overhead. Changed it to say they reduce the relative impact of encapsulation overhead.

## Review Notes
The remaining examples are version-neutral and syntactically plausible, but production clusters installed through Helm should generally persist MTU changes through Helm values rather than relying only on a direct ConfigMap patch.
