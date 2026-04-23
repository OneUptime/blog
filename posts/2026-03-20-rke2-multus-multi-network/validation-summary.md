# Validation Summary: How to Configure RKE2 with Multus for Multi-Network Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Multus CNI
- NetworkAttachmentDefinition
- macvlan, ipvlan, and vlan CNI plugins
- host-local IPAM
- Whereabouts IPAM
- RKE2 HelmChartConfig

## Sources Consulted
- RKE2 Multus and SR-IOV documentation: https://docs.rke2.io/networking/multus_sriov
- RKE2 Network Options documentation: https://docs.rke2.io/networking/basic_network_options
- RKE2 Helm integration documentation: https://docs.rke2.io/add-ons/helm
- RKE2 Quick Start documentation: https://docs.rke2.io/install/quickstart
- Multus CNI quickstart: https://k8snetworkplumbingwg.github.io/multus-cni/docs/quickstart.html
- Multus CNI usage guide: https://k8snetworkplumbingwg.github.io/multus-cni/docs/how-to-use.html
- CNI macvlan plugin documentation: https://www.cni.dev/plugins/current/main/macvlan/
- CNI ipvlan plugin documentation: https://www.cni.dev/plugins/current/main/ipvlan/
- CNI vlan plugin documentation: https://www.cni.dev/plugins/current/main/vlan/
- CNI host-local IPAM documentation: https://www.cni.dev/plugins/current/ipam/host-local/
- Whereabouts IPAM documentation: https://github.com/k8snetworkplumbingwg/whereabouts
- RKE2 Multus chart source: https://github.com/rancher/rke2-charts/tree/main-source/packages/rke2-multus/charts
- RKE2 Whereabouts chart source: https://github.com/rancher/rke2-charts/tree/main-source/packages/rke2-whereabouts/charts

## Issues Found
- The prerequisites referenced an RKE2 v1.21+ cluster and Helm installed locally. Updated this to recommend a currently supported RKE2 release and sudo access to create RKE2 config/manifest files, since the post uses RKE2-managed HelmChartConfig rather than the Helm CLI.
- The RKE2 CNI configuration comment described Multus as the primary CNI plugin. Updated the wording to match RKE2's model: Multus must be first in the `cni` list and delegates the default network to Canal or another primary CNI.
- The Multus pod selector used `app=multus`, but the RKE2 Multus chart labels pods with `app=rke2-multus`. Updated the verification command.
- The Multus binary verification path pointed at `/var/lib/rancher/rke2/data/*/bin/multus`. The RKE2 Multus chart installs CNI binaries under `/opt/cni/bin` by default, so the command now checks `/opt/cni/bin/multus`.
- The `host-local` IPAM examples used deprecated top-level `subnet`, `rangeStart`, `rangeEnd`, and `gateway` fields. Updated the examples to use the current `ranges` array format.
- The post did not warn that `host-local` only tracks allocations locally on each node. Added a short caveat and directed multi-node users to Whereabouts.
- The Whereabouts install command applied only the upstream daemonset manifest and omitted the CRDs required by the upstream installation. Replaced it with RKE2's documented `HelmChartConfig` method for enabling the bundled `rke2-whereabouts` dependency.

## Review Notes
The remaining examples are syntactically valid Kubernetes manifests and use current NetworkAttachmentDefinition and Multus annotation formats. The CNI examples still require readers to replace interface names, subnets, gateways, and VLAN IDs with values valid for their nodes and physical network. RKE2's current docs note that older Cilium + Multus patch releases may require disabling Cilium's `exclusive` CNI setting.
