# Validation Summary: How to Troubleshoot K3s Server Start Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Linux systemd and journald
- Linux networking and troubleshooting tools
- SQLite and embedded etcd

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Certificate CLI: https://docs.k3s.io/cli/certificate
- K3s etcd Snapshot CLI: https://docs.k3s.io/cli/etcd-snapshot
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- K3s Architecture: https://docs.k3s.io/architecture
- K3s FAQ: https://docs.k3s.io/faq
- K3s Known Issues: https://docs.k3s.io/known-issues
- Local CLI help output for `journalctl`, `systemctl`, `ss`, and `openssl x509`

## Issues Found
- The port list used obsolete Kubernetes control-plane ports `10251` and `10252`. I replaced them with the current documented K3s local ports and added the missing UDP ports used by Flannel backends.
- The disk-usage example checked `/var/lib/containerd/`, which does not match K3s's default embedded containerd path. I corrected it to `/var/lib/rancher/k3s/agent/containerd/`.
- The stopped-container cleanup command could fail when no containers were present. I changed it to use `xargs -r` so it is safe on an empty result set.
- The datastore section mixed embedded etcd and SQLite recovery guidance and restored only `state.db`. I corrected it to treat the section as datastore recovery, restore the full SQLite DB directory plus the server token, and point embedded etcd users to the documented snapshot restore flow.
- The certificate section recommended deleting `/var/lib/rancher/k3s/server/tls`, which is not the documented recovery path and is unsafe. I replaced it with `k3s certificate check`, documented leaf-certificate rotation, and a note to use `k3s certificate rotate-ca` for CA issues.
- The resource section claimed K3s needs at least `512MB` RAM. Current K3s requirements are `2 GB` RAM for server nodes and `512 MB` for agents, so I corrected the server guidance.
- The iptables guidance unconditionally switched only IPv4 to legacy mode. I updated it to be conditional on affected distro/version combinations and added the corresponding `ip6tables` command.
- The network-interface section hard-coded `eth0`, which is not portable. I replaced it with a placeholder interface name.
- The `"node password rejected"` fix used an outdated path under `/var/lib/rancher/k3s/server/cred/`. I replaced it with the current documented recovery flow: delete the existing Node object so the node-password secret is removed, and remove `/etc/rancher/node` when reprovisioning the host.
- The certificate prose overstated that expired certificates always block startup. I reworded this to "certificate problems" because K3s automatically renews expired or near-expiry leaf certificates on startup.

## Review Notes
- K3s automatically renews expired or near-expiry leaf certificates on startup, but CA certificate problems require the separate `rotate-ca` workflow.
- The `iptables-legacy` workaround is relevant only on distro/version combinations affected by the K3s-known iptables issues; otherwise newer iptables or `--prefer-bundled-bin` may be preferable.
- On older RHEL/CentOS releases, `nm-cloud-setup` can interfere with K3s networking. That caveat is documented upstream but was outside the narrow corrections needed for this post.
