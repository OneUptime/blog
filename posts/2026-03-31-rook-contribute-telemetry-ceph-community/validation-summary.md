# Validation Summary: How to Contribute Telemetry Data to the Ceph Community

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (telemetry module)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph telemetry module source code (`src/pybind/mgr/telemetry/module.py` on the Ceph `main` branch) — verified command definitions, config option names, license identifier, and send behavior
- Ceph `MonCommands.h` — verified `ceph log last`, `ceph config set`, `ceph config dump`, and `ceph mgr module enable` command signatures
- Ceph official documentation on telemetry: https://docs.ceph.com/en/latest/mgr/telemetry/

## Issues Found
- **`ceph telemetry send` output on success (line 85)**: The post claimed "If the send is successful, no output is produced." This is incorrect. On success, the command returns messages such as `Ceph report sent to <url>` and device report summaries. Fixed to state that a confirmation message is displayed on success.

## Review Notes
- All CLI commands (`ceph telemetry show`, `ceph telemetry on --license sharing-1-0`, `ceph telemetry status`, `ceph telemetry send`, `ceph log last 20`, `ceph config set mgr`, `ceph config dump`, `ceph mgr module enable telemetry`) are syntactically correct and use valid flags/parameters.
- The license identifier `sharing-1-0` matches the hardcoded `LICENSE` constant in the telemetry module source.
- All telemetry config keys (`channel_basic`, `channel_crash`, `channel_device`, `channel_ident`, `organization`, `contact`, `description`) are valid `MODULE_OPTIONS` in the telemetry module.
- The `channel_perf` channel exists but is not mentioned in the post; this is acceptable since the post focuses on common channels.
- `https://telemetry.ceph.com/` resolves (HTTP 200), but it primarily serves as the API endpoint for telemetry report collection. The post describes it as a "public dashboard" showing aggregate data — this characterization may be somewhat misleading, though the domain does exist and is the official telemetry endpoint. Future revisions may want to clarify the distinction between the collection endpoint and any separate public dashboard.
- The `ceph telemetry show` command works when telemetry is already enabled; when telemetry is off, Ceph may suggest using `ceph telemetry preview` instead. The blog shows this command in the "Opting In" section before enabling, so some users may see a prompt to use `preview` instead. This is a minor UX note, not a technical error.
- The Rook toolbox command correctly uses `deploy/rook-ceph-tools` and the `rook-ceph` namespace, which are the Rook defaults.
