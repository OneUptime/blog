# Validation Summary: How to Use the ceph tell Command for Daemon Communication

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Ceph daemon types: OSD, MON, MDS, MGR

## Sources Consulted
- Ceph official documentation: ceph(8) man page for `ceph tell`, `ceph osd`, `ceph pg` subcommands
- Ceph source code: `src/mds/MDSDaemon.cc` for MDS admin socket command registration (`session ls`, `client ls`, `cache status`)
- Ceph source code: OSD admin socket registered commands (`config get/set`, `perf dump`, `dump_historic_ops`, `dump_ops_in_flight`)
- Ceph bug tracker: issues #39440 (mgr tell failures) and #19885 (limited `ceph tell mgr` support)
- Ceph PR #30217: unification of `ceph tell` and `ceph daemon` command sets; `trigger_deep_scrub` as a PG tell command
- Ceph documentation on BlueStore vs FileStore architecture

## Issues Found

1. **`ceph tell osd.0 scrub` and `ceph tell osd.0 deep_scrub` are not valid tell commands.**
   Scrub and deep-scrub are not registered as OSD admin socket commands and cannot be invoked via `ceph tell`. The correct commands are `ceph osd scrub <id>` and `ceph osd deep-scrub <id>` (top-level OSD subcommands), or `ceph pg scrub <pgid>` / `ceph pg deep-scrub <pgid>` for per-PG operations. Also, the blog used `deep_scrub` (underscore) but the correct syntax is `deep-scrub` (hyphen). Fixed to use `ceph osd scrub 0` and `ceph osd deep-scrub 0` with a note that these are not `ceph tell` subcommands.

2. **`ceph tell osd.0 flush_journal` is FileStore-only and not applicable to Rook/BlueStore.**
   The `flush_journal` command is a FileStore concept. Rook and modern Ceph deployments use BlueStore by default, which does not have a traditional journal. This command would be a no-op or error on BlueStore OSDs. Added a note clarifying this is FileStore-only.

3. **`ceph tell mgr.* module ls` is not a valid tell command.**
   Module listing is a monitor-side command, not a manager daemon admin socket command. The correct command is `ceph mgr module ls`. Fixed accordingly with an explanatory note.

4. **`ceph tell mds.0 session ls` uses deprecated syntax.**
   While `session ls` still works for backward compatibility, `client ls` is the modern preferred form introduced in the Luminous release. Updated to use `client ls`.

## Review Notes
- MDS daemons in Rook are typically named by filesystem (e.g., `myfs-a`, `myfs-b`), not numeric IDs. Using `mds.0` targets MDS rank 0, which works when there is a single filesystem, but readers with multiple CephFS filesystems may need to use `mds.<fsname>:<rank>` syntax.
- The `mon_status` output example shows `"state": "leader"` which is valid for Paxos-based mon election. Readers using Ceph Pacific+ with the new election algorithm may see slightly different output.
- The example output blocks are illustrative/simplified and may not exactly match real daemon output, but they correctly represent the structure and key fields.
