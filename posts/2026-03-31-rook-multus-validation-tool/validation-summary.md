# Validation Summary: How to Run the Multus Validation Tool for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.14.0)
- Ceph
- Multus CNI
- Kubernetes (Jobs, NetworkAttachmentDefinitions)
- Whereabouts IPAM

## Sources Consulted
- Rook official documentation on Multus network providers: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook GitHub repository deploy/examples directory: https://github.com/rook/rook/tree/master/deploy/examples
- Rook multus-validation.yaml manifest: https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/multus-validation.yaml
- Rook v1.14.0 release page: https://github.com/rook/rook/releases/tag/v1.14.0
- Rook GitHub issue #12706 (multus validation job help text): https://github.com/rook/rook/issues/12706
- Rook validation package Go docs: https://pkg.go.dev/github.com/rook/rook/cmd/rook/userfacing/multus/validation
- Red Hat OpenShift Data Foundation docs on Multus validation tool: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.21/html/red_hat_openshift_data_foundation_architecture/multus-prerequisites-validation-tool_mcg

## Issues Found

1. **Incorrect claim about throughput testing (line 19)**: The original post stated the validation tool checks that "Network throughput meets minimum requirements for Ceph." The tool explicitly does NOT perform load testing or benchmark throughput. It validates configuration, connectivity, and network stability. Changed to "Network stability (detecting flaky connections, IP conflicts, and routing issues)."

2. **Wrong configuration method in Job spec (lines 55-79)**: The original post showed configuration via environment variables (`PUBLIC_NETWORK`, `CLUSTER_NETWORK`, `NODE_COUNT`). The actual Rook validation manifest uses CLI flags passed as container args (e.g., `--public-network=`, `--cluster-network=`, `--daemons-per-node=`) and only uses environment variables for `POD_NAMESPACE` (from field ref) and `ROOK_LOG_LEVEL`. Fixed the entire Job YAML to match the actual manifest format.

3. **Non-existent CLI flag `--node-count` (line 168)**: The `--node-count` flag does not exist for `rook multus validation run`. The correct flag is `--daemons-per-node`, which controls the number of validation daemon pods per node (default: 16). Replaced `--node-count 3` with `--daemons-per-node 16`.

4. **Missing built-in cleanup command (lines 149-157)**: The post only showed manual cleanup via `kubectl delete`. Rook provides a dedicated `rook multus validation cleanup --namespace rook-ceph` command that properly removes all test resources. Added the built-in cleanup command as the primary method, keeping the manual approach as an alternative.

## Review Notes
- The example log output (lines 104-117) uses a `[INFO]`/`[ERROR]` format that is illustrative. The actual tool uses timestamped log lines with a format like `2023-06-27 01:10:03.044356 I | multus-validation: ...`. Since the post presents this as "Expected successful output" (i.e., approximate), the illustrative format was left as-is but readers should be aware actual output formatting differs.
- The `multus-validation.yaml` URL at `https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/multus-validation.yaml` was confirmed to exist and be accessible.
- Rook v1.14.0 was confirmed as a valid release (released April 3, 2024).
- The cleanup label selector `app=rook-multus-validation` in the manual cleanup section could not be fully verified as the exact label used by the tool; the built-in cleanup command is the recommended approach.
