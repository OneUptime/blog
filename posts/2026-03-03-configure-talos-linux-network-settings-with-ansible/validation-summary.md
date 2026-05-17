# Validation Summary: How to Configure Talos Linux Network Settings with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `machine.network` schema)
- Ansible (playbooks, inventories, group_vars/host_vars, `ansible.builtin.template`, `ansible.builtin.command`, `ansible.builtin.file`, `ansible.builtin.debug`)
- Jinja2 templating
- talosctl CLI (`patch machineconfig`, `health`, `get addresses`, `get routes`, `get resolvers`)
- YAML
- Networking concepts: VLANs, LACP/802.3ad bonding, MTU/jumbo frames, static routes, DNS

## Sources Consulted
- Talos Linux v1.7 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/ (machine.network, interfaces, bond, vlans, routes schema)
- Talos `talosctl` command reference for `patch machineconfig`, `health`, and `get` subcommands (Sidero Labs docs)
- Ansible builtin module documentation for `template`, `command`, `file`, and `debug`

## Issues Found
- **Incorrect bond field name `hashPolicy`.** Talos' machine config schema uses `xmitHashPolicy` (not `hashPolicy`) under `interfaces[].bond`. Applying the patch as originally written would have been rejected by Talos as an unknown field. Fixed in two places:
  - The `worker-2.yml` example host vars (renamed the variable to `xmitHashPolicy` so the YAML key in the rendered patch matches Talos' expected field name).
  - The Jinja2 template snippet under "Network Bond Configuration" (changed both the rendered key and the variable lookup to `xmitHashPolicy`, with the default `'layer2'` preserved).

## Review Notes
- The `talosctl health --nodes ... --wait-timeout 5m` usage is functional, but in stricter setups Talos recommends passing `--control-plane-nodes` / `--worker-nodes` so it can also verify cluster membership; the simpler form used here is fine for "did this single node come back" checks.
- `dhcp: {{ iface.dhcp | default(false) | lower }}` works because Jinja2 coerces the boolean to a string before applying `lower`, producing the YAML-valid `true` / `false`. No change required.
- Some `talosctl patch machineconfig` changes (notably anything affecting the link bringing up the API endpoint) can sever the connection mid-apply; the post correctly notes that "some changes may require a reboot." Worth bearing in mind operationally but not a technical error.
- The post targets a generic recent Talos version (the network schema cited matches v1.6/v1.7+). If readers are on a much older release, field availability for bond options like `xmitHashPolicy` should still hold, but very old releases may differ.
