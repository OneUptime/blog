# Validation Summary: How to Create a CephFilesystem for Shared File Storage in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Kubernetes (container orchestration)
- CephFilesystem CRD (Custom Resource Definition)
- MDS (Metadata Server)

## Sources Consulted
- Rook official CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook official filesystem example YAML: https://github.com/rook/rook/blob/master/deploy/examples/filesystem.yaml
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Ceph filesystem administration docs: https://docs.ceph.com/en/latest/cephfs/administration/

## Issues Found
1. **Deprecated field `preservePoolsOnDelete`**: The blog used `preservePoolsOnDelete: true` which is deprecated. Replaced with the current field `preserveFilesystemOnDelete: true` in both YAML examples and the Summary section. The deprecated field still works for backwards compatibility, but new configurations should use the current name.

2. **Incorrect `ceph fs status` pool table output**: The example output for `ceph fs status` had 5 values per row in the pool table (`myfs-metadata  metadata   0     0   285G`) but only 4 column headers (POOL, TYPE, USED, AVAIL). Fixed to show the correct 4 values per row.

3. **Misleading compression comment**: The YAML comment said "Use compression for metadata (optional)" but the value was `none`. Updated to "Compression mode for metadata (optional: none, passive, aggressive, force)" to clarify the available options and avoid implying compression is enabled.

## Review Notes
- The `requireSafeReplicaSize` field appears in the official Rook example YAML (filesystem.yaml) though it is not explicitly documented in the CRD documentation page. It is a valid field.
- The `ceph fs status` example output uses simplified MDS daemon names ("a", "b") rather than the full names typically shown (e.g., "myfs-a", "myfs-b"). This is acceptable for illustrative purposes.
- The status conditions example (`status.info.mdsCount`) is plausible given the CephFilesystemStatus struct uses `info` as a `map[string]string`, though the exact keys populated may vary by Rook version.
- The claim about activeCount: 2 producing "two standbys" aligns with the documentation stating Rook creates "double the number of MDS instances as requested by the active count."
