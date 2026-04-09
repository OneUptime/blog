# Validation Summary: How to Enable and Configure Ceph Telemetry Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Ceph Manager Telemetry Module (`mgr/telemetry`)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official source code: `src/pybind/mgr/telemetry/module.py` (MODULE_OPTIONS, ALL_CHANNELS, LICENSE constant, CLI command definitions)
- Ceph official source code: `src/mon/MgrMonitor.cc` (always-on module list since Octopus)
- Ceph official documentation: https://docs.ceph.com/en/latest/mgr/telemetry/

## Issues Found

### 1. Missing `perf` channel from the channels table
- **What was wrong:** The telemetry channels table listed only `basic`, `crash`, `device`, and `ident`. The `perf` channel was missing. Ceph defines `ALL_CHANNELS = ['basic', 'ident', 'crash', 'device', 'perf']` in the source code.
- **What was changed:** Added a row for the `perf` channel with description "Various performance metrics of the cluster" to the channels table.
- **Why:** The `perf` channel is a real, documented telemetry channel and omitting it gives an incomplete picture of available channels.

### 2. Incorrect default telemetry endpoint URL
- **What was wrong:** The post stated the default endpoint is `https://telemetry.ceph.com`. The actual default URL configured in the module is `https://telemetry.ceph.com/report` (with a separate device endpoint at `https://telemetry.ceph.com/device`).
- **What was changed:** Updated the URL from `https://telemetry.ceph.com` to `https://telemetry.ceph.com/report`.
- **Why:** Accuracy matters for users who may need to allowlist the endpoint URL in firewall rules or proxy configurations.

### 3. Misleading `ceph mgr module enable telemetry` instruction
- **What was wrong:** The post instructed users to run `ceph mgr module enable telemetry` without noting that since Ceph Octopus (15.x), the telemetry module is an always-on manager module that is enabled by default and cannot be disabled.
- **What was changed:** Added a parenthetical note clarifying that since Ceph Octopus, telemetry is an always-on module enabled by default.
- **Why:** Without this context, users on modern Ceph versions may be confused about why the command appears to have no effect, or may incorrectly believe telemetry was previously disabled on their cluster.

## Review Notes
- The post does not mention the dedicated channel management commands (`ceph telemetry enable channel <name>`, `ceph telemetry disable channel <name>`, `ceph telemetry channel ls`) which are more user-friendly alternatives to setting config keys directly. This is not an error but could be a useful addition in the future.
- Additional config keys exist (`url`, `device_url`, `organization`, `interval`, `leaderboard`) that are not covered. This is acceptable given the post's introductory scope.
- The `channel_perf` and `channel_ident` config set commands are not shown in the "Enable or disable individual channels" section, though the channels are now listed in the table. This is a minor gap but not an error since the pattern is clear.
