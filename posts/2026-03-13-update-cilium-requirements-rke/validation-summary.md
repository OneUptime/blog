# Validation Summary: Update Cilium Requirements on RKE

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Rancher Kubernetes Engine (RKE1)
- Rancher Kubernetes Engine 2 (RKE2)
- Rancher
- eBPF
- containerd
- Docker
- Linux kernel requirements

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium BPF Architecture: https://docs.cilium.io/en/stable/reference-guides/bpf/architecture/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE1 Network Plug-ins: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE1 Custom Network Plug-in Example: https://rke.docs.rancher.com/config-options/add-ons/network-plugins/custom-network-plugin-example
- Ubuntu package details for `linux-generic-hwe-22.04`: https://packages.ubuntu.com/jammy/kernel/linux-generic-hwe-22.04

## Issues Found
- The introduction implied Cilium was a normal RKE1 replacement path. RKE1's built-in network plug-ins are Flannel, Calico, Canal, and Weave, so the post now states that Cilium must be installed as a custom CNI with `network.plugin: none` before cluster creation.
- The post described `/etc/rancher/rke2/rke2.yaml` as RKE2 cluster config. RKE2 documents this file as the generated admin kubeconfig; the node configuration file is `/etc/rancher/rke2/config.yaml`. The relevant comment was corrected.
- Kernel guidance listed older version-specific assumptions and described CentOS Stream 8 kernel 4.18 as "basic Cilium support." Current Cilium documentation requires Linux kernel 5.10+ or an equivalent vendor kernel such as RHEL 8.10's 4.18 kernel, so the comments were updated.
- The Ubuntu kernel upgrade command installed only the image metapackage. It was changed to `linux-generic-hwe-22.04`, the broader HWE kernel metapackage.
- The RKE2 Cilium kube-proxy replacement example only set `disable-kube-proxy: true`. RKE2 also documents matching Cilium Helm chart values, so the post now includes the required `HelmChartConfig`.
- The sysctl guidance suggested `echo 0 > /proc/sys/kernel/unprivileged_bpf_disabled`. Cilium documentation describes this as a one-way runtime switch once set to `1`, and Cilium's privileged DaemonSet may set it to disable unprivileged BPF use. The unsafe reset command was removed.
- The container runtime validation command used an undocumented direct containerd binary path. It was replaced with RKE2's documented `crictl` access pattern and packaged tool directory.

## Review Notes
The corrected post is still a planning and requirements guide, not a full migration runbook. Future improvements could add a separate tested migration procedure for greenfield RKE2 installs, existing RKE2 clusters, and RKE1 custom CNI deployments.
