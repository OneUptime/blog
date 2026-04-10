# Validation Summary: How to Use the ceph mon Command Suite

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Ceph (monitor subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- CephCluster CRD

## Sources Consulted
- Ceph MonCommands.h source: https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph Monitoring a Cluster: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph Adding/Removing Monitors: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph Monitor Election Strategies: https://docs.ceph.com/en/reef/rados/operations/change-mon-elections/
- Ceph Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph Messenger v2 (msgr2): https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Rook CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

1. **`ceph mon ls` does not exist.** The post used `ceph mon ls` with a fabricated JSON output showing name/rank/public_addr fields. This command is not part of the Ceph CLI. **Fix:** Replaced with `ceph mon dump`, which is the correct command for listing monitor members, and updated the example output to reflect the actual `mon dump` format.

2. **`ceph mon remove` is deprecated; `ceph mon rm` is preferred.** While `ceph mon remove` still works for backward compatibility, it is flagged as deprecated in the Ceph source. **Fix:** Changed `ceph mon remove b` to `ceph mon rm b`.

3. **`ceph mon election` does not exist.** There is no `ceph mon election` command in the Ceph CLI. There is no single command to force a new election. **Fix:** Replaced with `ceph tell mon.<id> quorum exit` / `ceph tell mon.<id> quorum enter`, which forces a monitor to leave and rejoin quorum, effectively triggering a new election.

4. **`ceph log last 20 mon` uses an invalid channel.** The `ceph log last` command accepts channels: `cluster`, `audit`, `cephadm`, or `*`. "mon" is not a valid channel. **Fix:** Changed to `ceph log last 20 cluster`.

## Review Notes
- The `ceph tell mon.\* version` command is correct but users should be aware that the `*` may need shell escaping (the post already escapes it with `\*`).
- The `ceph config get mon <option>` syntax retrieves centrally stored configuration values only; it does not reflect defaults or values from ceph.conf. For runtime effective values, `ceph config show mon.<id>` would be more appropriate, but the current usage is not incorrect.
- The Rook CephCluster CRD field `spec.mon.count` and the monitor port conventions (3300 for v2/msgr2, 6789 for v1/msgr1) are correct.
