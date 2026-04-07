# Validation Summary: How to Understand the repair PG State in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Placement Group states, scrubbing, repair)
- Rook (Ceph orchestration on Kubernetes)
- rados CLI
- ceph CLI

## Sources Consulted
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph documentation on `rados` CLI: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph documentation on `ceph pg` commands: https://docs.ceph.com/en/latest/man/8/ceph/#pg

## Issues Found
1. **`watch` command piping error (line 49)**: `watch ceph health detail | grep -E "inconsistent|repair"` pipes the output of `watch` itself through `grep`, which is not the intended behavior. Fixed to `watch 'ceph health detail | grep -E "inconsistent|repair"'` so the entire pipeline runs inside `watch`.

2. **`rados list-inconsistent-obj` incorrect flag (line 107)**: The `--pool mypool` flag is not valid for this command. The pool is already encoded in the PG ID (e.g., `1.2a` means pool 1, PG 2a). Removed the invalid flag.

3. **`mark_unfound_lost` misused for inconsistent objects (line 111)**: `ceph pg <pg-id> mark_unfound_lost delete` is for **unfound** objects (objects Ceph knows should exist but cannot locate on any OSD), not for **inconsistent** objects (where copies exist but are corrupt). Using this command on inconsistent PGs is incorrect and could cause confusion. Replaced with `rados rm` as the appropriate last-resort action for unrecoverably corrupt objects.

## Review Notes
- The "How Ceph Chooses the Authoritative Copy" section is a simplification. In practice, Ceph's repair uses object digests/checksums from the scrub map to determine which copy is correct, rather than purely version-number comparisons. The explanation is acceptable for a high-level guide but could be more precise.
- The `ceph pg <pg-id> query | jq '.peer_info'` command is valid but the field name may vary across Ceph versions. In newer releases, `info` or `peer_info` structure may differ slightly.
- The post does not specify which Ceph version it targets. The commands and config options are valid for Ceph Pacific (16.x) through Reef (18.x).
