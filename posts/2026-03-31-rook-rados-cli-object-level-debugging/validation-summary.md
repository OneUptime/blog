# Validation Summary: How to Use rados CLI for Object-Level Debugging

## Status
validated

## Post Type
Reference / Debugging Guide

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- `rados` CLI utility
- `ceph` CLI utility
- Ceph placement groups (PGs) and OSDs
- RADOS watch-notify mechanism
- Ceph pool benchmarking

## Sources Consulted
- https://docs.ceph.com/en/reef/man/8/rados/ — rados CLI man page (official Ceph documentation)
- https://docs.ceph.com/en/reef/rados/operations/control/ — Ceph control commands
- https://docs.ceph.com/docs/master/dev/osd_internals/watch_notify/ — RADOS watch-notify internals

## Issues Found

**Issue 1 — `rados watch` section used `rados put` to trigger the watcher (incorrect)**

The section "Monitor Object Write/Read in Real Time" showed `rados put` as the command to trigger a `rados watch`. This is technically wrong: `rados watch` implements the RADOS watch-notify messaging API. Watchers are only notified by explicit `rados notify` calls — a regular `rados put` does not trigger any watch events. The comment "Write an update to trigger the watch" was also inaccurate.

Fixed: changed `rados -p mypool put my-object /tmp/update.txt` to `rados -p mypool notify my-object ""`, and updated the comments from "Watch object operations happening in a pool" / "Write an update to trigger the watch" to "Watch for RADOS notifications on an object" / "Send a notification to trigger the watch".

**Issue 2 — `awk '{print $5}'` extracts the wrong field from `ceph osd map` output**

The "Verify Object Existence Across Replicas" section parsed the PG ID from `ceph osd map` output using `awk '{print $5}'`. The actual `ceph osd map` output format is:

```
osdmap e100 pool 'mypool' (1) object 'my-object' -> pg 1.abc123 (1.abc123) -> up ([2,0,1], p2) acting ([2,0,1], p2)
```

Field 5 is `(1)` — the pool ID in parentheses — not the PG ID. The PG ID (`1.abc123`) is at field 10.

Fixed: changed `awk '{print $5}'` to `awk '{print $10}'`.

## Review Notes
- The `rados bench cleanup` command (`rados -p mypool cleanup`) is correct per the rados man page.
- `ceph pg $OBJ_PG query | python3 -m json.tool | grep -A5 '"acting"'` is valid; `ceph pg <pgid> query` is an accepted syntax in current Ceph versions.
- The `--pgid` flag for `rados ls` is correct and works in Ceph Nautilus and later.
- All basic object operations (`ls`, `get`, `put`, `rm`, `stat`, `getxattr`, `setxattr`, `listxattrs`) are accurate.
