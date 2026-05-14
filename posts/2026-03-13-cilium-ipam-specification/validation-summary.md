# Validation Summary: Cilium IPAM Specification: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide / configuration reference

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNode CRD
- Cilium IPAM
- AWS ENI IPAM
- Helm
- kubectl
- Prometheus metrics

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/latest/observability/metrics/
- Cilium v1.19.4 Helm chart values.yaml: https://raw.githubusercontent.com/cilium/cilium/v1.19.4/install/kubernetes/cilium/values.yaml
- Cilium v1.19.4 CiliumNode CRD schema: https://raw.githubusercontent.com/cilium/cilium/v1.19.4/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumnodes.yaml

## Issues Found
- Helm command examples contained line-continuation backslashes followed by comment lines, which would break shell execution. Removed inline comment lines from continued commands.
- The cluster-pool Helm example used `operator.ipamGCInterval`, which is not a current Cilium Helm value. Removed it from the cluster-pool example.
- The AWS ENI Helm example used invalid values `ipam.operator.eniMinAllocate`, `ipam.operator.eniMaxAllocate`, and `eni.tags.cilium`. Replaced them with current values: `ipam.nodeSpec.ipamMinAllocate`, `ipam.nodeSpec.ipamPreAllocate`, `ipam.nodeSpec.ipamMaxAllocate`, and `eni.eniTags.cilium`.
- Several examples referenced non-existent `status.ipam.available`. Updated them to calculate available IPs as `spec.ipam.pool` minus `status.ipam.used`, matching the CiliumNode CRD schema and Cilium ENI IPAM docs.
- The ConfigMap inspection command piped Kubernetes JSONPath map output into `jq`, which would not produce valid JSON. Changed it to use `-o json | jq '.data | ...'`.
- The ENI validation command counted `.status.eni` directly. Updated it to count `.status.eni.enis`.
- The monitoring example used the Cilium agent metrics port and unprefixed metric names. Updated it to port-forward `deployment/cilium-operator` on port `9963` and use `cilium_operator_ipam_*` metric names.
- The Prometheus alert used `cilium_ipam_available_ips`, which is not the exported operator metric name. Changed it to `cilium_operator_ipam_available_ips`.
- The post suggested restarting Cilium after an IPAM mode mismatch. Updated this guidance to avoid changing IPAM mode in place and instead install a fresh cluster with the target mode, matching the Cilium IPAM documentation warning.
- Adjusted wording that described the article as a complete reference to all IPAM parameters, because the post covers common parameters rather than every current Cilium IPAM option.

## Review Notes
Cilium IPAM behavior is mode-specific. The corrected post now distinguishes cluster-pool CIDR allocation from cloud IPAM pre-allocation more accurately, but future revisions could add version-specific examples for multi-pool IPAM and cloud-provider-specific node fields.
