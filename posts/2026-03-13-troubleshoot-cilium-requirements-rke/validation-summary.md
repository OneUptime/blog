# Validation Summary: Troubleshoot Cilium Requirements on RKE

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Rancher Kubernetes Engine 1 (RKE1)
- Rancher Kubernetes Engine 2 (RKE2)
- Canal, Flannel, Calico, and Weave CNI plugins
- eBPF, kube-proxy replacement, and WireGuard encryption

## Sources Consulted
- RKE1 Network Plug-ins documentation: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE2 Network Options documentation: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Cilium Installation using Rancher Kubernetes Engine: https://docs.cilium.io/en/latest/installation/k8s-install-rke/
- Cilium Installation using Rancher: https://docs.cilium.io/en/latest/installation/k8s-install-rancher-existing-nodes/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium CLI `status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/

## Issues Found
- The introduction incorrectly implied that both RKE1 and RKE2 ship Cilium as a selectable built-in CNI. Updated it to state that RKE1 ships Flannel, Calico, Canal, and Weave, while RKE2 ships Canal, Cilium, Calico, and Flannel.
- The post described RKE as a Docker-based or containerd-based node model without distinguishing versions. Updated it to clarify that RKE1 is Docker-based and RKE2 uses containerd with bundled CNI Helm chart add-ons.
- The RKE1 Cilium configuration used `network.plugin: cilium` and `cilium_network_provider`, which are not valid RKE1 built-in CNI settings. Replaced the snippet with `network.plugin: none` and noted that Cilium must be installed separately.
- The RKE2 kube-proxy replacement example used `disable: rke2-kube-proxy`, which is not the correct RKE2 setting. Replaced it with `disable-kube-proxy: true`.
- The kernel guidance mixed older and feature-specific requirements. Updated it to reflect current Cilium 5.10+ recommendation, RKE2's documented 4.9.17 minimum note, kernel 5.8+ recommendation for kube-proxy replacement, and WireGuard kernel/module requirements.
- The RKE2 log command for kernel validation was not a reliable validation method. Replaced it with `uname -r` on each node.
- The post recommended manually deleting Canal resources and CNI binaries for migration. Replaced this with safer validation commands and a note that RKE1 does not support changing the built-in network provider after cluster creation.
- The command `cilium endpoint list` is not part of the current Cilium Kubernetes CLI command set. Replaced it with `kubectl get ciliumendpoints.cilium.io -A`.
- The conclusion overstated "complete removal" as a generic step. Updated it to emphasize avoiding conflicting CNI components.

## Review Notes
The corrected guide remains high-level. In the future, it could be improved with explicit version-scoped migration procedures for RKE2 clusters that already run Canal, because CNI migration details can vary by RKE2 release and operational constraints.
