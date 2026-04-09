# Validation Summary: How to Troubleshoot Unfound Objects in Cache Tiers

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Kubernetes Ceph operator)
- Cache tiering (Ceph cache tier architecture)
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Ceph official documentation — Troubleshooting PGs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph official documentation — Monitoring OSDs and PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph official documentation — Logging and Debugging: https://docs.ceph.com/en/reef/rados/troubleshooting/log-and-debug/
- Ceph manpage (ceph.8): https://manpages.debian.org/testing/ceph-common/ceph.8.en.html
- Ceph admin socket OSD commands reference

## Issues Found

1. **Invalid jq path `.recovery_state.unfound`** (Step 1): `ceph pg <pgid> query | jq '.recovery_state.unfound'` used an incorrect path — `recovery_state` is an array, not an object, and has no `.unfound` field. Replaced with `ceph pg <pgid> list_missing`, which is the correct command for listing unfound/missing objects in a PG.

2. **Invalid jq path `.recovery_state.num_unfound`** (Step 1): `ceph pg <pgid> query | jq '.recovery_state.num_unfound'` used an incorrect path for the same reason. Replaced with `ceph pg <pgid> list_missing | jq '.num_unfound'`, which returns the unfound count from the correct command output.

3. **Example output inconsistency** (Step 1): The example showed `num_unfound: 3` but only listed 2 objects. Changed to `num_unfound: 2` to match the actual listed objects.

4. **Invalid command `ceph pg <pgid> log`** (Step 5): `ceph pg <pgid> log` is not a valid Ceph CLI command. The valid PG subcommands do not include `log`. Replaced with `ceph pg <pgid> query` which includes the PG log in its JSON output.

5. **Misleading comment for `ceph daemon osd.X log flush`** (Step 6): The comment said "Check OSD journal for the cache OSD" but `ceph daemon osd.X log flush` flushes the daemon's in-memory debug/info log to disk, not the OSD data journal (BlueStore/FileStore WAL). Fixed the comment to accurately describe what the command does.

6. **Invalid watch channel `ceph -W objecter`** (Removing the Cache Tier Safely): `objecter` is not a valid watch channel. Valid channels are `cluster` (default), `audit`, `cephadm`, and `*`. Replaced with `ceph -w` which watches the default cluster channel for events including flush progress.

## Review Notes
- Cache tiering is deprecated in Ceph since the Nautilus release and discouraged for new deployments. The post is still technically valid for existing deployments but readers should be aware of the deprecation.
- The `ceph pg <pgid> query | jq '.pg_log.log[-10:]'` path in Step 5 could not be definitively confirmed from official documentation, as the exact JSON schema of `ceph pg query` output varies across Ceph versions. It is left as-is since the general approach is correct.
- The official command for listing unfound objects is `ceph pg <pgid> list_missing` (not `list_unfound`), which returns both `num_missing` and `num_unfound` fields in its JSON output.
