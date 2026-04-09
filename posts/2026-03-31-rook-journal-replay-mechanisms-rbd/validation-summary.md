# Validation Summary: How to Understand Journal Replay Mechanisms in RBD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD Journaling
- rbd-mirror daemon
- Rook (Kubernetes Ceph operator)
- RADOS

## Sources Consulted
- Ceph source code (`src/common/options/rbd.yaml.in`, `src/common/options/rbd-mirror.yaml.in`) for config option names, defaults, and descriptions
- Ceph source code (`ReplayStatusFormatter.cc`) for JSON output field names (`entries_behind_primary`, `primary_position`, `non_primary_position`)
- Ceph systemd unit template (`systemd/ceph-rbd-mirror@.service.in`) for service naming
- Ceph RBD mirroring documentation (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph RBD config reference (https://docs.ceph.com/en/latest/rbd/rbd-config-ref/)

## Issues Found

1. **Incorrect journal position terminology (lines 48-52)**: The post described `mirror_position` and `master_position` as if they were named fields in the `rbd journal status` output. In reality, `rbd journal status` shows registered clients (internal and mirror), each with their own `commit_position`. These field names do not appear in the output. Rewrote the section to accurately describe the client-based position model and reference `entries_behind_primary` as the lag metric.

2. **Outdated `entries_behind_master` reference (summary section)**: The post used `entries_behind_master` but the JSON output field in current Ceph versions uses inclusive naming: `entries_behind_primary`. Changed to `entries_behind_primary`.

3. **Incorrect `jq` selector for lag check**: The command used `jq '.description'` to check lag, but the structured JSON field is `entries_behind_primary`. Changed to `jq '.entries_behind_primary'`.

4. **Misleading comment on `rbd_journal_max_concurrent_object_sets` (line 63)**: The comment said "Increase replay threads for faster catch-up" but this option controls the maximum number of object sets a journal client can be behind before being automatically unregistered — not replay threads. Fixed the comment to accurately describe the option.

5. **Non-existent "overflow" field in `rbd journal info` (line 85)**: The post suggested grepping for "overflow" in `rbd journal info` output, but no such field exists. Changed to a general inspection of journal info to assess journal size and object count.

6. **`rbd_journal_order 24` is the default value (line 91)**: The post suggested setting `rbd_journal_order` to 24 (16MB) to fix overflow, but 24 is already the default. Changed to 25 (32MB) to actually increase journal object size.

## Review Notes
- The systemd unit name `ceph-rbd-mirror@rbd-mirror.0` uses a non-standard instance ID (`rbd-mirror.0`). In typical deployments, the instance ID is the Ceph auth client ID (e.g., `admin`). However, this varies by deployment and is not strictly wrong — left as-is.
- The `rbd_mirror_journal_poll_age` option exists (default 5 seconds). Setting it to 2 would reduce polling interval for lower latency, which is correct as described.
- The overall RBD journal mechanism description (write-ahead to journal, async apply, mirror daemon replay) is accurate.
- The Rook-specific kubectl command for mirror pod logs uses the correct label selector (`app=rook-ceph-rbd-mirror`).
