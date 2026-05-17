# Validation Summary: How to Manage Cluster Resources with pcs on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Pacemaker (cluster resource manager)
- Corosync (cluster communication layer)
- pcs (Pacemaker/Corosync configuration system, CLI tool)
- pcsd (pcs daemon)
- OCF resource agents (heartbeat, pacemaker, linbit providers)
- LSB and systemd resource agent classes
- crm_verify, crm_mon, crm_failcount utilities
- Ubuntu (apt package management, systemctl)
- DRBD (mentioned in promotable clone example)

## Sources Consulted
- Official pcs man page on Ubuntu Jammy: https://manpages.ubuntu.com/manpages/jammy/man8/pcs.8.html
- ClusterLabs pcs project documentation and CHANGELOG: https://github.com/ClusterLabs/pcs
- ClusterLabs Pacemaker "Clusters from Scratch" documentation: https://clusterlabs.org/projects/pacemaker/doc/3.0/Clusters_from_Scratch/
- mankier pcs(8): https://www.mankier.com/8/pcs

## Issues Found

1. **`pcs host status` is not a valid command.** The `pcs host` subcommand only supports `auth` and `deauth`. Replaced with `pcs pcsd status`, which is the correct way to verify pcsd authentication/connectivity between nodes (per the pcs man page: "Show current status of pcsd on nodes specified, or on all nodes configured in the local cluster").

2. **`pcs resource show` is deprecated/removed in pcs 0.11+.** It has been split into `pcs resource status` (for status overview) and `pcs resource config` (for showing configuration). Updated three occurrences:
   - `pcs resource show` (generic) → `pcs resource status`
   - `pcs resource show cluster-vip` → `pcs resource config cluster-vip`
   - `pcs resource show webservice` → `pcs resource config webservice`
   - `pcs resource show apache-web` → `pcs resource config apache-web`

3. **`pcs resource history <resource>` does not exist.** There is no `history` subcommand under `pcs resource` in any current version of pcs. Removed the comment and command line that referenced it rather than inventing a substitute. Operation history is visible in `pcs status` output and via `crm_mon`, which the post already covers elsewhere.

4. **`pcs node attribute show` uses invalid syntax.** The documented syntax is `pcs node attribute` with no arguments — it lists all node attributes by default. The `show` keyword is not recognized here (unlike for constraints). Replaced with `pcs node attribute`.

## Review Notes

- The `pcs constraint location show`, `pcs constraint order show`, and `pcs constraint colocation show` forms are intentionally left as-is. The pcs man page documents both `show` and `config` as valid alternatives (e.g., `location [config | show ...]`), so these are correct.
- The `pcs resource cleanup apache-web node=node1` syntax matches the documented form: `cleanup [<resource id>] [node=<node>] [operation=<operation> [interval=<interval>]] [--strict]`.
- The `pcs resource promotable` command syntax (introduced in pcs 0.10) is correct; `promoted-max`/`promoted-node-max` replaced the older `master-max`/`master-node-max` and the article uses the new terminology correctly.
- The article uses single `#` for the H1 title, `##` for most section headings, but a few section labels (Resource Groups, Resource Clones, Resource Constraints, Resource Operations) are missing the `##` heading prefix and render as plain paragraphs. This is a markdown formatting/structural issue, not a technical error, so it was left untouched per the "do not make stylistic changes" guidance.
- The Apache resource example uses `statusurl="http://localhost/server-status"`, which requires mod_status to be enabled in Apache — a reasonable assumption for this tutorial scope but worth noting for readers.
- `crm_failcount -r apache-web -D` is correct (the `-D` flag deletes the failcount attribute), though `pcs resource cleanup` is the more modern and idiomatic approach (which the article already shows).
