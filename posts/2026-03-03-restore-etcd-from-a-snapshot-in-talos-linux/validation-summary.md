# Validation Summary: How to Restore etcd from a Snapshot in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- etcd (v3, including v3.5.x)
- Kubernetes (kubectl)
- Docker (for partial-restore workflow)

## Sources Consulted
- Talos disaster recovery documentation: https://www.talos.dev/v1.12/advanced/disaster-recovery/ (redirects to https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery)
- Talos etcd maintenance documentation: https://www.talos.dev/v1.12/advanced/etcd-maintenance/
- Talos `talosctl` CLI reference and resource-type documentation (KubernetesDynamicCerts)
- etcd v3 official docs for `etcdctl snapshot status`/`snapshot restore` semantics: https://etcd.io/docs/v3.5/op-guide/maintenance/

## Issues Found

1. **Invalid `talosctl etcd snapshot restore` command (Scenarios 1, 2, and 3).** Talos does not expose an `etcd snapshot restore` subcommand. Per the official Talos disaster-recovery docs, etcd restores are performed by resetting the node(s) and running `talosctl bootstrap --recover-from=<snapshot>`. I rewrote all three scenarios to use the correct `talosctl bootstrap --recover-from=./etcd-snapshot.db` flow and added a note about the optional `--recover-skip-hash-check` flag for snapshots copied directly from `/var/lib/etcd/member/snap/db`.

2. **Wrong `talosctl reset` flags (Scenario 2).** The post used `talosctl reset --graceful --reboot`, which would not actually wipe etcd's data. The documented recovery procedure requires `--graceful=false --reboot --system-labels-to-wipe=EPHEMERAL` so that the EPHEMERAL partition (where etcd state lives) is wiped. Updated all reset invocations in Scenarios 1 and 2 accordingly.

3. **Incorrect multi-node restore procedure (Scenario 2).** The original post bootstrapped one node and then individually reset the others. The correct procedure is to reset **all** control plane nodes first, wait for etcd to reach the "Preparing" state on each, then `bootstrap --recover-from` on a single node — the remaining members rejoin automatically once the control plane endpoint comes up. Rewrote Scenario 2 to reflect this.

4. **Incorrect Scenario 3 sequence (new cluster).** The original post ran a normal `talosctl bootstrap` first and then attempted to `etcd snapshot restore` afterward, which would have produced an empty etcd that prevented the restore. Replaced with the correct flow: apply configs to all control plane nodes, then directly run `bootstrap --recover-from` on the first node. Added an explicit warning not to run a normal bootstrap first.

5. **Wrong `talosctl get` resource name in the post-restore checks.** `talosctl get certificates` is not a valid Talos resource type. The dynamic Kubernetes certificate resource is `KubernetesDynamicCerts`. Updated the command to `talosctl -n 192.168.1.10 get KubernetesDynamicCerts -o yaml`.

## Review Notes

- The "Partial Restoration" section using Docker + `etcdctl snapshot restore` on `gcr.io/etcd-development/etcd:v3.5.12` is technically valid, though the user must remember that `kube-apiserver` data lives under `/registry/...` which is what the example queries.
- The post-restore Kubernetes checks (`kubectl cluster-info`, `kubectl get pods --field-selector`, `--grace-period=0 --force`) are all current and correct.
- `talosctl logs etcd --tail 50`, `talosctl etcd status`, `talosctl etcd members`, `talosctl gen config`, `talosctl apply-config --insecure --nodes ... --file ...`, and `talosctl health` are all valid `talosctl` commands as of Talos v1.12.
- Future maintenance: the `--recover-from` flag and the `--system-labels-to-wipe=EPHEMERAL` reset pattern have been stable across recent Talos releases (1.8+), but reviewers should re-verify if Talos overhauls its bootstrap UX in a future major version.
