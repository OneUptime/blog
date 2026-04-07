# Validation Summary: How to Configure the Telemetry Module in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage platform)
- Ceph Manager (mgr) telemetry module
- Ceph CLI (`ceph` command)

## Sources Consulted
- Ceph official documentation: Telemetry Module (https://docs.ceph.com/en/latest/mgr/telemetry/)
- Ceph source code for the telemetry mgr module (channel option definitions)

## Issues Found
- **Incorrect telemetry channel config option name**: The post used `mgr/telemetry/channel_perf_schema` but the correct config option is `mgr/telemetry/channel_perf`. The telemetry module defines channels as `basic`, `crash`, `device`, `ident`, and `perf` — there is no `perf_schema` channel. Fixed the command to use `channel_perf`.

## Review Notes
- All other commands (`ceph mgr module enable telemetry`, `ceph telemetry on --license sharing-1-0`, `ceph telemetry preview`, `ceph telemetry status`, `ceph telemetry off`, `ceph mgr module disable telemetry`) are correct and current.
- The channel config options for `channel_crash` and `channel_ident` are correct.
- The default telemetry URL `https://telemetry.ceph.com/report` and the `ceph config set` syntax for overriding it are correct.
- The example status output JSON structure with `enabled`, `last_opt_revision`, `url`, and `interval` fields is consistent with actual `ceph telemetry status` output.
- The post does not mention the `channel_basic` and `channel_device` channels, which are also available and enabled by default. This is not an error but could be a useful addition in the future.
