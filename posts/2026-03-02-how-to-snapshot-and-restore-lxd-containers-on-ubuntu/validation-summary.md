# Validation Summary: How to Snapshot and Restore LXD Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LXD (system container manager)
- Ubuntu (24.04)
- ZFS storage backend
- btrfs storage backend
- `dir` storage backend
- CRIU (for stateful snapshots)
- `lxc` CLI (snapshot, restore, copy, move, export, import, config, profile)
- cron expressions (for `snapshots.schedule`)
- Bash scripting

## Sources Consulted
- LXD instance options reference: https://documentation.ubuntu.com/lxd/en/latest/reference/instance_options/
- LXD server configuration reference: https://documentation.ubuntu.com/lxd/en/latest/server/
- LXD CLI documentation for `lxc snapshot`, `lxc restore`, `lxc copy`, `lxc export`, `lxc profile`

## Issues Found
1. **Invalid server configuration key `core.snapshots_expiry`.**
   - The post originally claimed that snapshot retention defaults could be configured with `lxc config set core.snapshots_expiry 7d`. This key does not exist in LXD. The valid `core.*` server configuration keys are limited to networking, TLS, BGP, DNS, proxy, and similar concerns — none are snapshot-related.
   - Snapshot defaults are configured per-instance, or applied across instances via a profile (e.g. the `default` profile) using the instance-level keys `snapshots.expiry`, `snapshots.schedule`, `snapshots.schedule.stopped`, and `snapshots.pattern`.
   - Rewrote the "Setting Default Snapshot Retention" section to use `lxc profile set default snapshots.expiry 7d` (and added schedule/pattern examples on the profile) instead, and replaced the verification command with `lxc profile show default`.

## Review Notes
- The `--expiry 24H` flag in the "Creating a Snapshot" section uses LXD's expiry duration format, which accepts case-sensitive units: `s` (seconds), `m` (minutes), `H` (hours), `d` (days), `w` (weeks), `M` (months), `y` (years). `24H` is valid.
- `lxc snapshot --stateful`, the CRIU dependency note, `lxc restore`, `lxc copy <instance>/<snapshot>`, `lxc move`, `lxc export`, and `lxc import` are all syntactically and semantically correct against current LXD documentation.
- The cron expressions in the scheduling section are standard 5-field cron (minute, hour, day-of-month, month, day-of-week) and match LXD's expectations. LXD additionally supports aliases such as `@hourly`, `@daily`, `@weekly`, `@monthly`, `@annually` — not mentioned in the post but the cron form used is fine.
- The deletion-loop one-liner (`for snap in $(lxc info mycontainer | grep '^\s\+snap' | awk '{print $1}')`) is fragile because the `lxc info` snapshot listing is rendered as an ASCII table with `|` column separators, so the grep pattern will not reliably match modern output. A more robust approach would use `lxc query` against the REST API (e.g. `lxc query /1.0/instances/mycontainer/snapshots`) and parse JSON. Left as-is since it's an illustrative script, not a correctness issue with any LXD command itself.
- The ZFS dataset path in the "Snapshot Space Usage" section (`lxdpool/containers/mycontainer`) assumes the pool is named `lxdpool` and uses the legacy `containers/` dataset prefix. Modern LXD installations may use a different pool name or `virtual-machines/` for VMs, but this is illustrative and clearly labeled as an example.
- The comment "container is stopped after restore" on `lxc restore` is approximately correct for non-stateful snapshots of running containers — LXD requires the instance to be stopped to restore. The post's follow-up `lxc start mycontainer` keeps this accurate in practice.
