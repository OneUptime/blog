# Validation Summary: How to Install Calico VPP on Kubernetes Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- Calico VPP data plane
- Kubernetes
- Tigera Operator
- VPP
- DPDK, AF_PACKET, AF_XDP, and native VPP interface drivers
- Linux hugepages
- kubectl

## Sources Consulted
- Calico documentation: Get started with VPP networking: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico VPP generated manifest, v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Calico VPP no-hugepages generated manifest, v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp-nohuge.yaml
- Calico VPP operator installation manifest, v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/calico/installation-default.yaml
- Tigera Operator manifest, Calico v3.32.0: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml

## Issues Found
- The post described installing from a cloned `projectcalico/vpp-dataplane` repository and applying `yaml/calico-vpp.yaml`. Current Calico documentation says only operator-based installations are supported, with the Tigera Operator plus generated VPP data plane manifests. Updated the install commands to create the Calico CRDs, Tigera Operator, VPP `Installation` resource, and downloaded generated `calico-vpp.yaml`.
- The configuration snippet used non-current fields such as `vppIface`, `dpdkDriver`, and `hugepagesDirBase`. The documented manifest uses the `calico-vpp-config` ConfigMap with `SERVICE_PREFIX` and `CALICOVPP_INTERFACES`, including `uplinkInterfaces[].interfaceName` and `uplinkInterfaces[].vppDriver`. Replaced the snippet with the supported ConfigMap data format.
- The prerequisites implied DPDK-compatible NICs and hugepages were mandatory. Calico documents hugepages and DPDK/native drivers as optional for some hardware and supports `af_packet` without hugepages. Updated the prerequisites and hugepages step to clarify this distinction.
- The architecture explanation said Calico VPP runs alongside `calico-node` and intercepts traffic at the kernel-bypass level using DPDK or `af_packet`. Calico VPP is deployed as `calico-vpp-node` pods with `vpp` and `calico-vpp-agent` containers, and `af_packet` is a standard Linux packet socket driver rather than a DPDK-style kernel-bypass path. Updated the wording.
- The rollout and verification commands referenced `kube-system` `calico-node` pods and a `<vpp-manager-pod>`. The generated manifest creates `calico-vpp-node` pods in the `calico-vpp-dataplane` namespace and a `vpp` container. Updated the commands to watch `calico-vpp-dataplane` and `calico-system`, and to run `vppctl` in the `vpp` container.

## Review Notes
The post now follows the current Calico documentation at the time of review. The version pairing in the official docs uses Calico v3.32.0 operator manifests with Calico VPP v3.31.0 generated manifests, so the post uses those explicit URLs. Future maintenance should re-check these versions against the Calico VPP documentation before publication.
