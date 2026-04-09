# Validation Summary: How to Use Ceph RBD Snapshots for VM Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- libvirt / virsh (VM management)
- KVM / QEMU
- jq (JSON processing)

## Sources Consulted
- libvirt snapshots knowledge base: https://libvirt.org/kbase/snapshots.html
- libvirt backing chains documentation: https://libvirt.org/kbase/backing_chains.html
- libvirt external snapshot wiki: https://wiki.libvirt.org/I_created_an_external_snapshot_but_libvirt_will_not_let_me_delete_or_revert_to_it.html
- Ceph RBD snapshots documentation: https://docs.ceph.com/en/reef/rbd/rbd-snapshot/
- rbd(8) manpage: https://manpages.debian.org/unstable/ceph-common/rbd.8.en.html
- Ceph PR #12817 (snapshot timestamp field): https://github.com/ceph/ceph/pull/12817
- Ceph PR #23191 (rbd snap ls --all): https://github.com/ceph/ceph/pull/23191
- libvirt v9.9.0 release notes (external snapshot revert support): https://libvirt.org/news.html

## Issues Found

### 1. Incorrect claim that libvirt external snapshots create RBD snapshots (Overview, Step 2)
**What was wrong:** The Overview stated "VM snapshots map directly to RBD snapshots" and Step 2 claimed "The snapshot created by libvirt appears as an RBD snapshot in the pool." In reality, `virsh snapshot-create-as --disk-only` creates external snapshots using qcow2 overlay files, not native RBD snapshots. The overlay is managed by QEMU/libvirt, not by Ceph's snapshot mechanism.
**What was changed:** Updated the Overview to say "you can leverage RBD snapshots for VM disk state capture" and clarified the guide covers both libvirt snapshots and direct RBD snapshots. Replaced the Step 2 explanation to clarify that libvirt external snapshots use overlay files, and directed readers to Step 5 for creating RBD-level snapshots.

### 2. Missing version caveat for `virsh snapshot-revert` with external snapshots (Step 4)
**What was wrong:** The post showed `virsh snapshot-revert` being used to revert an external snapshot (created with `--disk-only`), but this functionality was only added in libvirt 9.9.0 (November 2023). On older versions, this command fails with "unsupported configuration: revert to external disk snapshot not supported yet."
**What was changed:** Added a note after the Step 4 code block stating the libvirt 9.9.0 requirement and suggesting `rbd snap rollback` as an alternative for older versions.

### 3. Broken snapshot sorting in pruning script (Step 6)
**What was wrong:** The script used `jq 'sort_by(.timestamp)'` to sort snapshots chronologically. However, `rbd snap ls --format json` outputs the timestamp as a human-readable ctime string (e.g., "Thu Mar 31 14:22:05 2026"). jq's `sort_by` performs lexicographic sorting on strings, which would sort by day-of-week name (Fri, Mon, Sat...) rather than chronologically. This could cause the pruning script to delete the wrong snapshots.
**What was changed:** Changed `sort_by(.timestamp)` to `sort_by(.id)`. RBD snapshot IDs are monotonically increasing integers, so sorting by `.id` correctly produces chronological order.

## Review Notes
- The `--memspec` and `--diskspec` syntax for `virsh snapshot-create-as` is correct per libvirt documentation.
- The `rbd snap ls --all` flag is valid (available since Ceph Nautilus/14.x) and includes trash namespace snapshots.
- The `rbd du` command and its output format are accurate.
- The Step 3 comment "briefly pauses VM" is technically correct but could understate the pause duration for VMs with large memory, since `--live` is not used. Without `--live`, the VM remains paused for the entire memory save operation.
- The post mixes two distinct snapshot approaches (libvirt VM snapshots vs. direct RBD snapshots) which serve different use cases. The fixes clarify the distinction without restructuring the post.
