# Validation Summary: How to Enable Kernel Livepatch on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Ubuntu Pro Client (`pro`)
- Canonical Livepatch
- Linux kernel updates
- Snap packages
- Shell scripting
- Prometheus text format

## Sources Consulted
- Ubuntu Pro Client documentation: How to manage Livepatch: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/enable_livepatch/
- Ubuntu Livepatch documentation: https://ubuntu.com/security/livepatch/docs
- Ubuntu Livepatch client status documentation: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/status
- Ubuntu Livepatch kernel support matrix: https://ubuntu.com/security/livepatch/docs/kernels
- Ubuntu Livepatch firewall configuration: https://ubuntu.com/security/livepatch/docs/livepatch/reference/firewall
- Ubuntu Livepatch proxy configuration: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/proxy
- Ubuntu Livepatch reboot requirement explanation: https://ubuntu.com/security/livepatch/docs/livepatch/explanation/reboot_requirement
- Ubuntu Livepatch unsupported kernel explanation: https://ubuntu.com/security/livepatch/docs/livepatch/explanation/client_not_working
- Local `pro --help`, `pro enable --help`, and `pro status --help` output.

## Issues Found
- The prerequisites were too narrow and stale. Livepatch support is based on Canonical-supported kernel entries in the Livepatch support matrix, not just 64-bit x86 generic/lowlatency kernels. Updated the prerequisites to point readers to the support matrix.
- The example `canonical-livepatch status` output used older field names such as `Fully patched`, `Patches`, and `Machine token`. Updated the example and explanatory bullets to current fields such as `kernel state`, `patch state`, `patch version`, `tier`, and `machine id`.
- The patch verification command searched for `Patches`, which does not match current documented status output. Updated it to search case-insensitively for CVE details in verbose output.
- The monitoring and Prometheus examples checked for `Fully patched: true`, which is no longer the documented status wording. Updated the checks to use current `patch state` values and to handle the no-livepatches-available state as healthy.
- The Prometheus example counted `Applied` lines, which is brittle against current output. Replaced it with a metric based on the current `patch version` field.
- The tier explanation overstated what `updates`, `stable`, and `beta` mean for all subscriptions. Reworded it to describe tiers as rollout channels and note that availability depends on subscription/token configuration.
- The network troubleshooting section listed only `livepatch.canonical.com` and used an undocumented ping endpoint. Updated it to include both `livepatch.canonical.com` and `livepatch-files.canonical.com`, matching Canonical's firewall documentation.
- The systemd service commands used `canonical-livepatchd`, but the snap service unit is documented as `snap.canonical-livepatch.canonical-livepatchd`. Updated status, log, and restart commands accordingly.

## Review Notes
The standalone token path is legacy but still documented through Canonical's Livepatch token flow and terms. Ubuntu Pro remains the preferred path for classic Ubuntu systems. Livepatch does not replace normal APT security updates or the need to reboot into newer kernels during maintenance windows, which the post correctly states.
