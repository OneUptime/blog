# Validation Summary: Cilium IPAM CRD Definition: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical reference guide

## Technologies Covered
- Cilium
- Kubernetes CustomResourceDefinitions
- CiliumNode CRD
- Cilium IPAM modes: cluster-pool, CRD-backed, multi-pool, AWS ENI, and Azure
- kubectl
- jq
- Helm

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium Cluster-Pool IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-cluster-pool/
- Cilium Multi-Pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/multi-pool/
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure/
- Cilium v1.19.3 CiliumNode CRD schema: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumnodes.yaml
- Cilium v1.19.3 Helm DaemonSet template for Cilium agent labels: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/templates/cilium-agent/daemonset.yaml

## Issues Found
- The post described `status.ipam.available`, which is not a current CiliumNode status field. Replaced it with `status.ipam.pod-cidrs`, which is present in the CRD schema for per-CIDR status.
- The post identified `spec.ipam.pool` as a multi-pool field. Corrected this to explain that `pool` is the per-IP pool used by CRD-backed IPAM, while multi-pool uses `spec.ipam.pools.requested` and `spec.ipam.pools.allocated`.
- The post used annotations such as `ipam.cilium.io/max-allocate` and `ipam.cilium.io/force-realloc` to control CiliumNode IPAM. Replaced these with a `kubectl patch` example for the actual `spec.ipam` allocation fields and an agent restart reconciliation example.
- Several commands piped Kubernetes jsonpath object output into `jq`, which can produce non-JSON text. Changed those examples to fetch full JSON with `-o json` and then select fields with `jq`.
- The status comparison and monitoring examples used fields that do not reflect cluster-pool IPAM status. Updated them to use `spec.ipam.podCIDRs`, `status.ipam.pod-cidrs`, and `status.ipam.operator-status.error`.
- The watch example assumed every watched JSON document was a CiliumNode object. Updated the `jq` filter to handle watch event wrappers via `.object // .`.
- The conclusion and introduction overstated `status.ipam` as actual allocation state for every IPAM mode. Adjusted wording to describe it as reported allocation status and node-level IPAM configuration/status.

## Review Notes
The post now distinguishes cluster-pool, CRD-backed, multi-pool, and cloud IPAM fields more accurately, but it still combines multiple IPAM modes in one reference. A future revision could split mode-specific examples into separate subsections to reduce operational ambiguity.
