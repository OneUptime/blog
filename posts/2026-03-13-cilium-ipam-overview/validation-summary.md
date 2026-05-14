# Validation Summary: Cilium IPAM Overview: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- CiliumNode CRDs
- Helm
- AWS ENI IPAM
- Azure IPAM
- GKE networking
- Prometheus metrics

## Sources Consulted
- Cilium IPAM overview: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium cluster-scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/cluster-pool/
- Cilium cluster-pool IPAM Helm configuration: https://docs.cilium.io/en/latest/network/kubernetes/ipam-cluster-pool/
- Cilium Kubernetes host-scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium AWS ENI IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium GKE IPAM notes: https://docs.cilium.io/en/stable/network/concepts/ipam/gke/
- Cilium CRD-backed IPAM status fields: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command reference for cilium-dbg: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium upgrade notes for IPAM metric names: https://docs.cilium.io/en/latest/operations/upgrade/

## Issues Found
- Corrected the Kubernetes IPAM explanation. The post said Kubernetes mode delegates IPAM to the Kubernetes controller manager; the Cilium docs describe Kubernetes host-scope mode as Kubernetes assigning node PodCIDRs while Cilium agents allocate endpoint IPs from those ranges.
- Corrected IPAM mode naming. The AWS Helm mode is `eni`, not `aws-eni`, and GKE uses Kubernetes host-scope IPAM with GKE-native addressing rather than a separate `gke` Helm mode.
- Replaced `cilium ip list` examples with `cilium-dbg status --all-addresses`, matching current Cilium command documentation.
- Corrected CiliumNode IPAM field references. The post used `status.ipam.allocated` and `status.ipam.available`; current CiliumNode IPAM status reports used IPs under `status.ipam.used`, while available cloud/CRD pool entries are represented under `spec.ipam.available`.
- Corrected the pod event guidance for IP allocation failures. Scheduler messages such as "insufficient IPs" are not the reliable CNI/IPAM failure signal; pod events usually show allocation failures from the CNI/IPAM path.
- Replaced the operator log label selector with the current Cilium operator selector `io.cilium/app=operator`.
- Corrected the cluster-pool mask-size remediation. Cilium documentation says not to change `clusterPoolIPv4MaskSize` on an existing cluster, so the live Helm update example was replaced with guidance to plan the mask before installation, add node capacity, or create a new cluster.
- Corrected Prometheus metric names. The post used non-current `cilium_ipam_*` and `cilium_ipam_capacity` names; current Cilium operator IPAM metrics use names such as `cilium_operator_ipam_available_ips`, `cilium_operator_ipam_used_ips`, and `cilium_operator_ipam_needed_ips`.

## Review Notes
The post is now technically accurate as a general Cilium IPAM overview. Some commands remain environment-dependent, especially cloud IPAM metrics and `spec.ipam.available`, which apply to cloud/CRD-backed modes rather than every cluster-pool deployment.
