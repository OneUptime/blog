# Validation Summary: Expanding the Cilium Cluster Pool

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium cluster-pool IPAM
- Kubernetes
- Helm
- kubectl
- PrometheusRule
- Python ipaddress module
- jq

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/cluster-pool/
- Cilium CRD-Backed Cluster-Pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool.html
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics.html
- Python ipaddress module documentation: https://docs.python.org/3/library/ipaddress.html
- Kubernetes PrometheusRule custom resource usage via Prometheus Operator: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- The post suggested replacing an existing `clusterPoolIPv4PodCIDRList` entry with a larger supernet. Cilium documentation explicitly warns not to change existing list elements because this can cause unexpected behavior. I replaced that example with a warning to append new CIDRs instead.
- The Prometheus alert expression mixed per-node CIDR allocation capacity with usable pod IP counts. For cluster-pool exhaustion, the relevant capacity is the number of per-node CIDRs available from the configured pool and mask size. I changed the example expression to use `count(kube_node_info) / 512` for the post's example of two `/16` pools with `/24` node masks.
- The validation and troubleshooting steps implied that the next new node must immediately receive a CIDR from the newly added range. I clarified that this is only expected after earlier pool ranges are exhausted.

## Review Notes
- The guide assumes kube-state-metrics is installed for `kube_node_info`, and Prometheus Operator is installed for `PrometheusRule`.
- The fixed alert remains an example tied to two `/16` pools and a `/24` node mask. Operators should adjust the denominator when their pool list or mask size differs.
