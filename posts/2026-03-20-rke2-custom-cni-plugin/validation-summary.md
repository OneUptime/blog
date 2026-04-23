# Validation Summary: How to Set Up RKE2 with a Custom CNI Plugin - Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- CNI plugins
- Antrea
- Multus
- macvlan
- host-local IPAM
- kubectl
- systemd

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Multus and SR-IOV: https://docs.rke2.io/networking/multus_sriov
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- Antrea v2.6.1 Getting Started: https://antrea.io/docs/v2.6.1/docs/getting-started/
- Antrea GitHub Releases: https://github.com/antrea-io/antrea/releases
- Multus Quickstart Guide: https://k8snetworkplumbingwg.github.io/multus-cni/docs/quickstart.html
- Multus Usage Guide: https://k8snetworkplumbingwg.github.io/multus-cni/docs/how-to-use.html
- CNI host-local IPAM plugin documentation: https://www.cni.dev/plugins/current/ipam/host-local/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- RKE2's bundled CNI list was incomplete. Updated the description and introduction to include Flannel, which is listed as a bundled primary CNI in current RKE2 docs.
- Multus was described alongside primary CNI replacements. Updated the text to clarify that Multus is a secondary CNI and requires a primary/default CNI.
- The prerequisite listed RKE2 v1.21+, which is outdated for a current guide. Replaced it with "A supported RKE2 release."
- The RKE2 install commands used `kubectl` without configuring the RKE2 kubeconfig or adding RKE2's bundled CLI path. Added the documented `KUBECONFIG` and `PATH` exports.
- The Antrea example used the older v1.13.0 manifest and an outdated vendor attribution. Updated the manifest to v2.6.1, the latest Antrea release checked during review, and removed the outdated attribution.
- The Multus install flow cloned the repository and applied a local manifest while implying Multus could be installed as the replacement CNI. Updated it to use the official quickstart DaemonSet URL and clarified it should run after a default CNI is installed.
- The Multus `host-local` IPAM example used deprecated top-level `subnet`, `rangeStart`, `rangeEnd`, and `gateway` fields. Updated it to the current `ranges` array format and fixed the resulting JSON syntax.
- The custom CNI DaemonSet referenced a plugin-specific ServiceAccount without noting that matching RBAC must exist. Added an inline comment to make that dependency explicit.
- The RKE2 `disable` example listed `rke2-canal`, `rke2-calico`, and `rke2-cilium`, which are not valid current `disable` entries in the RKE2 server configuration reference. Removed those entries and kept only the optional packaged ingress component.
- Normalized `kubectl wait` examples to use the documented `condition=Ready` spelling.
- Updated the conclusion's built-in CNI list to include Flannel.

## Review Notes
- The custom CNI DaemonSet remains a schematic example because the image, install script, ServiceAccount, and RBAC depend on the specific custom CNI implementation.
- RKE2 also has a packaged Multus integration using `cni: [multus, <primary>]` or `cni: [multus, none]` for a custom default plugin; the post now keeps the manual upstream Multus example but notes that Multus is secondary.
