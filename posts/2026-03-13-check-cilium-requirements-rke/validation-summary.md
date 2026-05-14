# Validation Summary: Check Cilium Requirements on RKE (Rancher Kubernetes Engine)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Rancher Kubernetes Engine 1 (RKE1)
- Rancher Kubernetes Engine 2 (RKE2)
- Kubernetes CNI plugins
- eBPF
- Hubble

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium installation using Rancher Kubernetes Engine: https://docs.cilium.io/en/latest/installation/k8s-install-rke/
- Cilium CLI `cilium install` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE1 Network Plug-ins documentation: https://rke.docs.rancher.com/config-options/add-ons/network-plugins

## Issues Found
- The kernel requirement list used older feature-specific minimums and implied that basic Cilium operation still supports kernels as old as 4.9.17. Updated it to the current documented Cilium requirement of Linux kernel 5.10+ or an equivalent vendor kernel, with a note that newer kernels enable additional eBPF features.
- The RKE2 support statement claimed Cilium support specifically since RKE2 v1.21+. The current RKE2 documentation lists Cilium as a supported CNI option but does not present that version-specific claim, so the sentence was changed to avoid an unsupported version assertion.
- The RKE2 `disable-kube-proxy` comment implied it is always required. Updated the comment to state that it is optional and should be used when configuring Cilium kube-proxy replacement.
- The Cilium CLI example used `--helm-set`, but the current `cilium install` command reference documents `--set`, `--set-file`, and `--set-string`. Replaced `--helm-set` with `--set`.
- The post described `cilium install --dry-run` as a built-in pre-installation check. Current CLI documentation says `--dry-run` writes the resources that would be installed without installing them, so the wording was corrected.
- The CNI binary cleanup note overstated the need to remove old binaries. Updated it to focus on stale `/etc/cni/net.d/` configuration files as the primary conflict and treat obsolete binaries as optional cleanup.
- The Cilium port list omitted WireGuard's documented UDP 51871 requirement. Added it to the port checklist.

## Review Notes
The post is now technically accurate for current Cilium and RKE/RKE2 documentation. Future updates should re-check Cilium kernel requirements and Cilium CLI flags because both are version-sensitive.
