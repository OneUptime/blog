# Validation Summary: How to Upgrade K3s Manually

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- `kubectl`
- Embedded etcd
- SQLite
- Linux / `systemd`

## Sources Consulted
- K3s Manual Upgrades: https://docs.k3s.io/upgrades/manual
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- K3s `etcd-snapshot` CLI: https://docs.k3s.io/cli/etcd-snapshot
- K3s Rolling Back: https://docs.k3s.io/upgrades/roll-back
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The post used `kubectl version --short`, but the current generated Kubernetes reference documents `kubectl version` without a `--short` flag. I updated the command accordingly.
- The SQLite backup example copied only `state.db`. K3s documents backing up and restoring the full `/var/lib/rancher/k3s/server/db/` directory, so I corrected the backup and rollback snippets to use the full directory.
- The backup section omitted `/var/lib/rancher/k3s/server/token`, which K3s requires during restore because confidential data in the datastore is encrypted with that token. I added token backup and restore commands.
- The server and agent upgrade commands re-ran the install script without preserving the original `K3S_` variables or extra arguments. K3s documents that these values are persisted into the service configuration and are lost if omitted on re-run, so I changed both commands to use the documented “same configuration again” pattern.
- The agent installer example used `sh - agent`, which is not the documented install-script form for passing arguments. I corrected it to the `sh -s - ...` pattern and added a wait for the agent node to return to `Ready` before uncordoning.
- The rollback snippet could auto-start the downgraded binary before datastore restoration. I added `INSTALL_K3S_SKIP_START=true`, scoped the file-copy rollback steps to single-server SQLite clusters, and added a note directing embedded-etcd users to the documented snapshot restore workflow.
- The “available versions” comment pointed to a GitHub API call that only returns the latest release. I corrected the wording so it matches what the command actually returns.

## Review Notes
- The post is technically relevant and contains substantial operational command content, so it was reviewed as a code/CLI tutorial rather than marked `not-code-blog`.
- K3s documentation notes that draining before a restart is optional in many cases because pods continue running while K3s is stopped, but the post’s cautious drain-first approach is still valid for controlled maintenance.
- `kubectl` was not installed in the review environment, so command validation relied on the official generated Kubernetes references instead of local `--help` output.
