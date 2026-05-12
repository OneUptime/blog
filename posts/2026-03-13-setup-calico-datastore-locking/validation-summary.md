# Validation Summary: How to Set Up Calico Datastore Locking Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step operations guide

## Technologies Covered
- Calico (Project Calico / Tigera Calico)
- `calicoctl` (specifically the `datastore migrate` subcommand family: `lock`, `export`, `import`, `unlock`)
- Kubernetes (`kubectl`, DaemonSets)
- etcdv3 as a Calico backing datastore
- Kubernetes API datastore (KDD) as a Calico backing datastore
- Felix, BGP, and IPAM concepts within Calico

## Sources Consulted
- Calico operations guide: Migrate Calico data from etcdv3 to a Kubernetes datastore — https://docs.tigera.io/calico/latest/operations/datastore-migration
- `calicoctl datastore migrate` reference index — https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/
- `calicoctl datastore migrate lock` reference — https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- `calicoctl datastore migrate export` reference — https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- `calicoctl datastore migrate import` reference — https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import

## Issues Found

1. **Wrong order of operations.** The original post sequenced the migration as export → lock → import. The official Tigera procedure is **lock → export → import → unlock**. Fixed the bash block in "Step 2: Execute the Lock During Migration" and the mermaid sequence diagram to match the documented order.

2. **Missing `unlock` step.** The original procedure never ran `calicoctl datastore migrate unlock`, which is required to complete the migration. Added it as the final command in the Step 2 bash block and referenced it in the conclusion.

3. **`calicoctl datastore migrate import` invoked with shell stdin redirection (`< file.yaml`).** The official `import` command does not read from a redirected stdin; it requires the `-f` flag (or `-f -` for explicit stdin). Changed `< calico-migration-backup.yaml` to `-f calico-migration-backup.yaml` and added an inline note.

4. **Overstated lock semantics in the Introduction and Step 1.** The post claimed the lock "prevents Felix from making any writes," puts Felix in a "read-only mode," and stops IPAM allocations and BGP writes. Per the official lock reference, the lock "prevents any new Calico resources from affecting the cluster but does not prevent updating or creating new Calico resources," and per the migration guide "new pods will not be started until after the migration." The lock is a control-plane / propagation barrier; existing dataplane state (iptables, established BGP sessions) keeps operating. Rewrote the intro paragraph, the "What Locking Does" list, and the prerequisite bullet to reflect the correct behavior.

5. **Incorrect lock-status check.** Step 3 suggested running `calicoctl datastore migrate lock` again and inferring lock state from the error. This behavior is not documented and should not be relied on. Replaced with the documented signals (calico-node logs and new-pod-startup behavior) and a note that `calicoctl` does not expose a dedicated lock-status query.

6. **Verify step used only `felixconfiguration`.** The official verify step in the migration guide checks `networkpolicy` (and other resources). Added `calicoctl get networkpolicy --all-namespaces` alongside the existing `felixconfiguration` check.

7. **Conclusion phrasing.** Tweaked the conclusion to drop the "no new network policies will be enforced" line (which conflated lock behavior with policy enforcement) in favor of "new pods cannot start and new Calico resources will not take effect," and added the explicit sequence (lock, export, import, verify, unlock).

## Review Notes
- The official migration guide reconfigures `calicoctl` via the config file at `/etc/calico/calicoctl.cfg` rather than via the `DATASTORE_TYPE` environment variable. Both approaches work — `DATASTORE_TYPE` is a supported override — so the post's use of env vars is acceptable, but readers using the official procedure should be aware they may also need matching `ETCD_ENDPOINTS`/`KUBECONFIG` configuration depending on their setup.
- The post does not mention the Calico operator workflow. On clusters managed by `tigera-operator` (e.g., the `calico-system` namespace referenced in Step 3's `kubectl logs` command), the migration steps and namespace layout differ from a self-managed manifest install. The post mixes both worlds (manifest-style `kubectl apply -f calico.yaml` plus operator-style `calico-system` namespace). Readers on operator-managed installs should consult the operator migration documentation.
- The post does not call out that, once `unlock` is run, the migration cannot be rolled back (per the official `unlock` reference). Worth mentioning in a future revision.
- The 2–5 minute lock-duration figure is a planning heuristic and is not specified in the official docs; actual duration depends on cluster size and number of Calico resources to export/import.
