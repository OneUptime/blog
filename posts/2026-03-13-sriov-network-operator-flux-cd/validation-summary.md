# Validation Summary: How to Configure SR-IOV Network Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SR-IOV (Single Root I/O Virtualization)
- SR-IOV Network Operator (k8snetworkplumbingwg)
- Flux CD (HelmRepository, HelmRelease v2, Kustomization)
- Kubernetes (extended resources, CRDs)
- Multus CNI
- DPDK
- Intel X710 NICs (PCI vendor/device IDs)
- HugePages
- vfio-pci driver
- Node Feature Discovery (NFD)

## Sources Consulted
- SR-IOV Network Operator GitHub: https://github.com/k8snetworkplumbingwg/sriov-network-operator
- SR-IOV Network Operator Helm chart values.yaml: https://raw.githubusercontent.com/k8snetworkplumbingwg/sriov-network-operator/master/deployment/sriov-network-operator-chart/values.yaml
- SR-IOV Network Operator chart README: https://github.com/k8snetworkplumbingwg/sriov-network-operator/blob/master/deployment/sriov-network-operator-chart/README.md
- SR-IOV Network Operator OCI package: https://github.com/k8snetworkplumbingwg/sriov-network-operator/pkgs/container/sriov-network-operator-chart
- SR-IOV Network Operator releases: https://github.com/k8snetworkplumbingwg/sriov-network-operator/releases
- Flux HelmRelease v2 API: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository (OCI) docs: https://fluxcd.io/flux/components/source/helmrepositories/
- Kubernetes extended resources: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#extended-resources
- PCI ID database for Intel X710 (8086:1572): https://devicehunt.com/view/type/pci/vendor/8086/device/1572

## Issues Found

1. **Incorrect Helm repository URL**. The post used `https://k8snetworkplumbingwg.github.io/sriov-network-operator`, which does not host a Helm index. The chart is published as an OCI artifact at `ghcr.io/k8snetworkplumbingwg/sriov-network-operator-chart`. Fixed by setting `type: oci` on the HelmRepository and changing the URL to `oci://ghcr.io/k8snetworkplumbingwg`.

2. **Incorrect chart name**. The Helm chart artifact name is `sriov-network-operator-chart`, not `sriov-network-operator`. Fixed.

3. **Outdated chart version pin**. `"1.3.x"` was released in June 2023 and is ~2.5 years out of date. Updated to `"1.6.x"` (latest released line as of validation time).

4. **Invalid chart value paths**. The post used `webhook.enable: true`, `sriovOperatorConfig.enableInjector`, and `sriovOperatorConfig.enableOperatorWebhook`, none of which exist in the chart values.yaml. (The `enableInjector` / `enableOperatorWebhook` keys exist on the SriovOperatorConfig CRD itself, but the chart wraps these behind `operator.admissionControllers.enabled`.) Replaced with the correct `operator.admissionControllers.enabled: true`.

5. **Reserved resource prefix**. The post used `resourcePrefix: k8s.io`, which falls under Kubernetes' reserved `*.kubernetes.io` / `k8s.io` namespace for built-in resources and cannot be used for extended resources. Changed to `intel.com`, and updated the pod resource request from `k8s.io/intelnics` to `intel.com/intelnics` accordingly.

## Review Notes

- The SriovNetworkNodePolicy and SriovNetwork CRD fields, `apiVersion: sriovnetwork.openshift.io/v1`, Intel X710 PCI IDs (`8086:1572`), and all Flux API versions (`source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, `kustomize.toolkit.fluxcd.io/v1`) were verified correct.
- The static IPAM configuration (`{ "type": "static" }`) combined with `capabilities: { "mac": true, "ips": true }` is a valid pattern for runtime/annotation-driven IP assignment, but readers may want to consult the CNI static IPAM plugin docs for how addresses are then injected (e.g., via the `k8s.v1.cni.cncf.io/networks` annotation with embedded `ips`).
- For real DPDK workloads, the pod will typically also need an explicit hugepages resource request (e.g., `hugepages-2Mi: "1Gi"`) in addition to the `/dev/hugepages` mount, plus capabilities like `IPC_LOCK`. The post's `privileged: true` simplifies this but is broader than strictly required.
- The Helm chart no longer ships under a GitHub Pages index; readers should expect OCI as the canonical distribution channel going forward.
