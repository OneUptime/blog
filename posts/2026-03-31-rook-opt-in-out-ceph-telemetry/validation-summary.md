# Validation Summary: How to Opt In and Out of Ceph Telemetry

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster telemetry module)
- Rook (Kubernetes Ceph operator)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation on the Telemetry Module (https://docs.ceph.com/en/latest/mgr/telemetry/)
- Ceph source code: `src/pybind/mgr/telemetry/module.py` (MODULE_OPTIONS, ALL_CHANNELS, status method, on/off commands)
- Ceph source code: `src/mon/MgrMonitor.cc` (always_on_modules_map showing telemetry became always-on in Octopus)
- Ceph Crash Module documentation (https://docs.ceph.com/en/latest/mgr/crash/)

## Issues Found
1. **Incorrect version attribution**: The post stated telemetry became enabled by default in "Ceph Pacific (16.x)". It was actually introduced as an always-on module in **Ceph Octopus (15.x)**. Fixed the version reference.

2. **Fabricated output field `opt_in_all_collections`**: The example output for `ceph telemetry status` included a field called `opt_in_all_collections` which does not exist in the actual status output. This is a method name in the module source, not an output field. Removed it and added the missing `channel_ident` and `channel_perf` fields to the example output.

3. **Incorrect claim that telemetry module can be disabled**: The post included a section "Configuring Opt-In at the Module Level" suggesting `ceph mgr module disable telemetry` could be used. Since Octopus, telemetry is an always-on module and this command will be rejected by Ceph. Rewrote the section to clarify this and point users to `ceph telemetry off` instead.

4. **Missing `perf` channel**: The post listed only four telemetry channels (basic, crash, device, ident) but Ceph has five channels. The `perf` channel (for performance metrics, default off) was missing. Added it to the channel configuration examples and the status output example.

## Review Notes
- The `ceph config set mgr mgr/telemetry/channel_* true/false` syntax used for channel configuration is valid but older. Newer Ceph releases (Reef/Squid+) provide dedicated subcommands: `ceph telemetry enable channel basic` / `ceph telemetry disable channel basic`. The older syntax still works, so this was not changed, but readers using newer Ceph versions may prefer the newer syntax.
- The command `ceph mgr module ls | grep telemetry` works but the output is JSON, so the grep match will return a raw JSON fragment rather than a clean status line. This is functional but not ideal; using `jq` would be more robust.
- The `ceph telemetry show` command works when telemetry is enabled. When telemetry is disabled, `ceph telemetry preview` may be needed in some versions to preview the data that would be sent.
