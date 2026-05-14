# Validation Summary: Cilium IPAM Status: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNode CRD
- Cilium IPAM
- AWS ENI and Azure IPAM status
- Prometheus metrics
- jq

## Sources Consulted
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium CRD-backed IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium cluster-scope IPAM troubleshooting documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium metrics documentation: https://docs.cilium.io/en/latest/observability/metrics/
- Cilium IPAM API types: https://pkg.go.dev/github.com/cilium/cilium@v1.19.3/pkg/ipam/types
- Cilium CLI `config set` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_set.html
- Kubernetes kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post described `status.ipam.available` as a CiliumNode status field. Cilium exposes allocated IPv4 addresses in `status.ipam.used`; the CRD-backed/cloud allocatable IPv4 pool is represented in `spec.ipam.pool`. I changed the examples to derive free capacity from `spec.ipam.pool` minus `status.ipam.used`.
- The sample CiliumNode YAML placed cloud ENI data under `status.ipam.enis`. Cilium AWS ENI documentation records ENI metadata under `status.eni.enis`, so I corrected the YAML comments.
- The post showed `operator-status` as a CIDR-to-state map with values such as `allocated`. The Cilium IPAM API defines `operator-status` as an object with an optional `error` field, so I changed the diagnostics to check `.status.ipam."operator-status".error`.
- The validation script compared total `status.ipam.used` entries directly to running pods. Cilium may include non-pod owners such as router and health endpoints in `used`, so I changed the script to compare pod-like owners to running non-hostNetwork pods and to report pool/free counts separately.
- The Prometheus metric examples used `cilium_ipam_allocated_ips` and `cilium_ipam_available_ips`, which do not match the documented operator IPAM metrics. I changed them to `cilium_operator_ipam_used_ips` and `cilium_operator_ipam_available_ips` with the documented `target_node` label.
- The debug command executed `cilium config set` inside the Cilium DaemonSet pod. The documented `cilium config set` command is a Cilium CLI command that updates Cilium configuration through Kubernetes, so I changed it to run directly as `cilium config set debug true`.
- The stale/failure troubleshooting snippets were updated to use the corrected CiliumNode fields and avoid relying on a non-documented `cilium.io/ipam-refresh` annotation.

## Review Notes
Local `kubectl` and `cilium` binaries were not installed in this workspace, so CLI command validation was performed against official documentation. The updated `jq` filters were syntax-checked and exercised against representative CiliumNode-shaped JSON.
