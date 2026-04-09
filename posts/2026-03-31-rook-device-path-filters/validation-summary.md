# Validation Summary: How to Use Device Filters and Path Filters in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook-Ceph (CephCluster CRD device selection)
- Kubernetes (kubectl commands, pod labels)
- Ceph (OSD provisioning, ceph-volume, ceph osd tree)
- Go regular expressions (RE2 syntax)

## Sources Consulted
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub repository CRD types (DeviceFilter, DevicePathFilter struct fields)
- Rook GitHub Issue #11353: deviceFilter and devicePathFilter interaction
- Rook GitHub PR #4285: Device Path Filter implementation
- Rook cluster-update.md design document: https://github.com/rook/rook/blob/master/design/ceph/cluster-update.md
- SUSE Enterprise Storage Rook CRD Documentation: https://documentation.suse.com/ses/7.1/html/ses-all/admin-caasp-crd.html

## Issues Found

### 1. Incorrect comment about dot escaping in `nvme0n1`
- **What was wrong:** The "Escaping Special Regex Characters" section contained the comment "dot in nvme0n1 must be escaped for strict match," but `nvme0n1` contains no dot character — the characters are `n`, `v`, `m`, `e`, `0`, `n`, `1`.
- **What was changed:** Replaced the incorrect comment with an accurate one explaining that `^` and `$` anchors provide strict matching. Added a new example that actually demonstrates escaping a literal dot (`\\.`) in a device path containing a version number.
- **Why:** The original comment was factually wrong and would confuse readers about when regex escaping is needed.

### 2. Misleading "dots escaped" comment on devicePathFilter example
- **What was wrong:** The comment "Match by-id path with dots escaped" appeared on an example that contained no escaped dots — only `.*` (which is an intentional wildcard, not an escaped dot).
- **What was changed:** Reworded the comment to clarify that the unescaped dot in `.*` matches any character, and moved it below the new properly-escaped example for contrast.
- **Why:** The original comment misrepresented what the regex was doing.

### 3. Missing filter precedence information
- **What was wrong:** The post did not mention that `deviceFilter` and `devicePathFilter` are mutually exclusive on the same node. Per Rook documentation, if both are specified, `devicePathFilter` is ignored. The precedence order is: explicit `devices` > `deviceFilter` > `devicePathFilter`.
- **What was changed:** Added a new "Filter Precedence" section before "Per-Node Filters" explaining the priority order and that only one filter type should be used per node.
- **Why:** Without this information, a reader could set both filters on the same node and be puzzled when `devicePathFilter` has no effect.

## Review Notes
- The blog uses `grep -E` (POSIX ERE) to test Go regex patterns. For the simple patterns shown (character classes, anchors), this works identically, but Go uses RE2 syntax which differs from POSIX ERE for advanced features like backreferences. This is acceptable for the scope of this post.
- The `useAllDevices: false` setting shown in the blog is good practice for clarity, though `deviceFilter` technically overrides `useAllDevices` when specified. Keeping it explicit is the right call for a tutorial.
- Rook also supports a third filter field `devLinksFilter` for udev device names, which is not covered in this post. This is fine — the post's scope is limited to the two most common filters.
- The OSD prepare job label `app=rook-ceph-osd-prepare` and the `ceph-volume inventory` command were both verified as correct.
