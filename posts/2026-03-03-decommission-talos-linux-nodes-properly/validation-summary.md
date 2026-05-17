# Validation Summary: How to Decommission Talos Linux Nodes Properly

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (talosctl CLI)
- Kubernetes (kubectl)
- etcd
- jq
- Terraform (talos provider, `talos_machine_configuration_apply` resource)
- AWS CLI (`aws ec2`)
- Azure CLI (`az vm`, `az disk`)
- Google Cloud CLI (`gcloud compute`)
- Bash scripting

## Sources Consulted
- [Talos CLI reference (v1.7)](https://docs.siderolabs.com/talos/v1.7/reference/cli/) — verified `talosctl etcd` subcommands (alarm, defrag, forfeit-leadership, leave, members, remove-member, snapshot, status) and `talosctl reset` flags (`--graceful`, `--reboot`, `--system-labels-to-wipe`, `--user-disks-to-wipe`)
- [Talos `etcd remove-member` reference](https://docs.siderolabs.com/talos/v1.7/reference/cli/#talosctl-etcd-remove-member) — verified the command takes a member ID argument
- Kubernetes documentation for `kubectl drain` flags (`--ignore-daemonsets`, `--delete-emptydir-data`, `--force`, `--timeout`) and the `node-role.kubernetes.io/control-plane` label convention

## Issues Found
No technical issues found.

All commands, flags, and subcommands verified:
- `talosctl reset` flags (`--graceful=false`, `--reboot=false`, `--system-labels-to-wipe STATE/EPHEMERAL`, `--user-disks-to-wipe` as stringArray) are correct
- `talosctl etcd members`, `remove-member <member-id>`, `status`, and `snapshot <path>` all exist with the documented syntax
- `kubectl cordon`, `drain`, `delete node`, `delete pod --force --grace-period=0`, and `--field-selector spec.nodeName=` usage is correct
- `--delete-emptydir-data` is the current flag (the older `--delete-local-data` is deprecated)
- jq expressions for filtering PVs by `nodeAffinity.required.nodeSelectorTerms[].matchExpressions[].values[]` and pods by `spec.nodeName` are syntactically valid
- Terraform `talos_machine_configuration_apply` is a valid resource in the official Talos provider
- AWS, Azure, and GCP instance termination commands are correct
- The bash decommission script's `awk '{print $2}'` correctly targets the ID column of `talosctl etcd members` output (NODE, ID, HOSTNAME, PEER URLS, CLIENT URLS, LEARNER)

## Review Notes
- The post uses `talosctl etcd remove-member` for removal. The official docs note that `talosctl etcd leave` (executed on the node being removed) is preferred when the node is still reachable, and `remove-member` is recommended for nodes in a broken state. For decommissioning where the node is going away regardless, the post's choice of `remove-member` from a healthy control-plane node is a defensible and common pattern, but readers with healthy nodes could alternatively use `etcd leave`.
- `--reboot=false` in `talosctl reset` is redundant in recent versions where the default behavior is to shut down (the `--reboot` flag means "reboot instead of shutting down"), but explicit usage is harmless and makes intent clear.
- `kubectl run --overrides` still works but is increasingly considered legacy; a YAML manifest applied via `kubectl apply -f` is the more modern equivalent. Not an error.
- The script's `grep "${NODE_IP}"` on `talosctl etcd members` output could in theory match multiple rows if the IP appears in another column (e.g., the queried NODE column); since the script filters `HEALTHY_CP` to be different from the decommissioned node, this is safe in practice.
