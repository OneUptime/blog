# Validation Summary: How to Manage rbd-mirror Daemon (systemd Integration)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Ceph RBD Mirroring (`rbd-mirror` daemon)
- systemd service management
- Ceph cluster configuration (`ceph.conf` and centralized config store)
- Rook Ceph Operator (`CephRBDMirror` CRD)
- Kubernetes (`kubectl`)

## Sources Consulted
- [RBD Mirroring — Ceph Documentation (Quincy)](https://docs.ceph.com/en/quincy/rbd/rbd-mirroring/) — confirmed systemd unit naming convention `ceph-rbd-mirror@rbd-mirror.{unique id}`
- [RBD Mirroring — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/rbd/rbd-mirroring/) — verified `rbd mirror pool status` and `rbd mirror pool info` commands
- [rbd-mirror man page — Ceph Documentation](https://docs.ceph.com/en/latest/man/8/rbd-mirror/) — daemon operation and configuration reference
- [Ceph PR #11840: rbd-mirror configuration overrides for hard coded timers](https://github.com/ceph/ceph/pull/11840) — confirmed `rbd_mirror_journal_poll_age`, `rbd_mirror_sync_point_update_age`, and `rbd_mirror_image_state_check_interval` config options
- [Ceph PR #9623: Throttle in-flight image syncs](https://github.com/ceph/ceph/pull/9623/files) — confirmed `rbd_mirror_concurrent_image_syncs` option (default: 5)
- [ceph-rbd-mirror.target — Ceph GitHub](https://github.com/ceph/ceph/blob/main/systemd/ceph-rbd-mirror.target) — systemd target unit structure
- [Service Management — Ceph Documentation](https://docs.ceph.com/en/latest/cephadm/services/) — verified `ceph orch ps` / `ceph -s` as the correct commands for listing daemons
- [Config Settings — Ceph Documentation](https://docs.ceph.com/en/latest/rbd/rbd-config-ref/) — RBD configuration reference

## Issues Found
1. **Incorrect ceph.conf section name `[rbd-mirror]`**: The rbd-mirror daemon is a client-type entity (its CephX identity is `client.rbd-mirror.<id>`). In `ceph.conf`, sections are matched by entity type and name. The valid entity type sections are `[global]`, `[mon]`, `[mgr]`, `[osd]`, `[mds]`, and `[client]`. The section `[rbd-mirror]` does not match any recognized entity type and would be ignored. Changed to `[client.rbd-mirror]`, which correctly targets all rbd-mirror daemon instances. Note: the `ceph config set rbd-mirror ...` commands in the post were already correct because the centralized config store has its own daemon-type targeting logic.

2. **Invalid command `ceph service ls`**: The command `ceph service ls` does not exist in the standard Ceph CLI. For bare-metal deployments (which this post targets), the correct way to verify daemon registration is `ceph -s` (or `ceph status`), which displays a services summary including rbd-mirror daemon counts. Changed `ceph service ls | grep rbd-mirror` to `ceph -s | grep rbd-mirror`.

## Review Notes
- The `rbd_mirror_image_state_check_interval` option is referenced in Ceph PRs and source code but is not prominently documented in official user-facing docs. It does exist and is functional, but readers may have difficulty finding documentation for it.
- The Rook `CephRBDMirror` CRD example uses `spec.resources` directly under `spec`, which is correct for Rook's CRD schema.
- For cephadm-managed deployments (as opposed to the bare-metal focus of this post), the equivalent command to list rbd-mirror daemons would be `ceph orch ps --daemon-type rbd-mirror`.
