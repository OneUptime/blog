# Validation Summary: How to Configure SR-IOV in Rancher - Sriov

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Multus CNI
- SR-IOV CNI and SR-IOV Network Operator
- Whereabouts IPAM
- Prometheus Operator and Rancher Monitoring

## Sources Consulted
- RKE2 Multus and SR-IOV documentation: https://docs.rke2.io/networking/multus_sriov
- SUSE Edge SR-IOV/Telco features documentation: https://documentation.suse.com/suse-edge/3.2/html/edge/atip-features.html
- SUSE Rancher Helm Charts and Apps documentation: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-admin/helm-charts-in-rancher/helm-charts-in-rancher.html
- SR-IOV Network Operator documentation: https://github.com/k8snetworkplumbingwg/sriov-network-operator
- SR-IOV Network Operator API reference: https://pkg.go.dev/github.com/openshift/sriov-network-operator/pkg/apis/sriovnetwork/v1
- SR-IOV CNI plugin documentation: https://github.com/k8snetworkplumbingwg/sriov-cni
- Whereabouts IPAM documentation: https://github.com/k8snetworkplumbingwg/whereabouts
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The original post described generic CNI configuration and Kubernetes NetworkPolicy resources, but SR-IOV in Rancher/RKE2 is configured through Multus, SR-IOV CNI/device plugin components, and the SR-IOV Network Operator. Replaced the generic ConfigMap and NetworkPolicy examples with `SriovNetworkNodePolicy`, `SriovNetwork`, and a Multus-annotated pod that requests an SR-IOV device resource.
- The original verification commands checked kube-proxy, NetworkPolicies, and generic CNI files, which do not validate SR-IOV. Replaced them with checks for SR-IOV-capable hardware, the RKE2 Multus daemonset, SR-IOV operator pods, node labels, and `SriovNetworkNodeState` resources.
- The original CNI JSON used a placeholder plugin type (`main-cni-plugin`) and did not configure SR-IOV. Replaced it with current SR-IOV operator custom resources and a Whereabouts IPAM configuration suitable for cluster-wide secondary-network addressing.
- The original monitoring and troubleshooting commands referenced unrelated Calico/Cilium commands and an undefined `network-probe` job. Replaced them with SR-IOV operator logs, generated NetworkAttachmentDefinition checks, pod interface checks, node VF checks, and Prometheus alerts for the SR-IOV config daemon and host network errors.
- The original prerequisites omitted required SR-IOV conditions. Added Multus, primary CNI, SR-IOV-capable NICs, IOMMU, compatible drivers, and the SR-IOV Network Operator.

## Review Notes
- Rancher documentation notes that the older `sriov` chart from the Rancher Charts repository is deprecated and users should migrate to the `sriov-network-operator` chart from the SUSE Edge repository.
- The example uses the `rancher.io/intelnics` extended resource prefix because the Rancher/SUSE SR-IOV operator examples expose resources with the `rancher.io` prefix. Clusters using a different operator configuration should use the resource name shown in node allocatable resources.
- The example uses Whereabouts because RKE2 documentation does not recommend `host-local` IPAM for multi-node secondary networks.
