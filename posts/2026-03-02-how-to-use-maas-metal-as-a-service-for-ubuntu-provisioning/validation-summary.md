# Validation Summary: How to Use MAAS (Metal as a Service) for Ubuntu Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MAAS (Metal as a Service) 3.x (snap distribution)
- Ubuntu (24.04 "noble" referenced)
- PostgreSQL (MAAS database backend)
- PXE boot / TFTP / DHCP
- IPMI / Redfish / BMC power control
- cloud-init
- snap (packaging)

## Sources Consulted
- MAAS official documentation: https://canonical.com/maas/docs
- MAAS "How to manage machines" guide: https://canonical.com/maas/docs/how-to-manage-machines
- MAAS "How to install MAAS": https://canonical.com/maas/docs/how-to-install-maas
- MAAS "How to set up power drivers": https://canonical.com/maas/docs/how-to-set-up-power-drivers
- cloud-init documentation (cloud-config schema for `users`, `packages`, `runcmd`)

## Issues Found
1. **Incorrect commission CLI syntax** — `maas admin machine commission system_id=abc123` was using a keyword argument for the system_id. Per the MAAS docs, the system_id is a positional URL path parameter. Changed to `maas admin machine commission abc123`.

2. **Incorrect `power_parameters` syntax** — The post passed `power_parameters` as a single JSON string (`power_parameters='{"power_address": ..., ...}'`). The MAAS CLI does not accept this; each power parameter must be passed individually with the `power_parameters_` prefix (e.g., `power_parameters_power_address=...`). Updated the IPMI example to use the individual-key form.

3. **Misleading VLAN comment** — A comment said "VLAN ID 5001 in this example" while the command actually targeted the `untagged` VLAN of fabric 1 (no VID 5001 is involved). Rewrote the comment to accurately describe what the command does: "Enable DHCP on the untagged VLAN of fabric 1".

## Review Notes
- The post mixes `sudo maas status` (legacy/deb-style status command) early on and `sudo snap services maas` later in the Monitoring section. `sudo snap services maas` is the canonical way to check service status on a snap install, but `maas status` is still documented in some MAAS guides and may work on certain installs, so it was left as-is rather than removed.
- The `hwe_kernel=hwe-24.04` value is valid only once the HWE kernel for 24.04 has been published (it typically appears with 24.04.1+). For the initial 24.04 LTS GA, users may need `ga-24.04`. Considered acceptable since the post is dated 2026 and HWE for 24.04 should be available by then.
- `--ssh-import=lp:your-launchpad-id` is correct; MAAS supports importing SSH keys from Launchpad (`lp:`) and GitHub (`gh:`) shortcuts.
- The `maas admin vlan update <fabric_id> <vid> ...` positional syntax used (fabric_id `1`, vid `untagged`) matches the documented CLI shape.
- The cloud-init YAML uses correct keys (`package_update`, `package_upgrade`, `packages`, `users`, `runcmd`) and a valid `#cloud-config` header.
- The `maas admin tags create` (collection) vs `maas admin tag update-nodes` (single-resource action) usage matches the MAAS CLI's plural-collection / singular-resource convention.
