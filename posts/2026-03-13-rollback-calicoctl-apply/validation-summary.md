# Validation Summary: calicoctl Command Guide - Rollback Apply

## Status
validated

## Post Type
Reference / Guide — a practical reference for calicoctl commands and a safe backup-change-verify-rollback workflow.

## Technologies Covered
- Calico (CNI / network policy engine for Kubernetes)
- calicoctl CLI
- Kubernetes resources (FelixConfiguration, GlobalNetworkPolicy, BGPPeer, IPPool)

## Sources Consulted
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- calicoctl validate: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl cluster (cluster diags): https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/
- FelixConfiguration resource (logSeverityScreen field and valid values): https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
No technical issues found.

All commands and flags were verified against the official Calico documentation:
- `calicoctl get felixconfiguration | globalnetworkpolicy | bgppeer | ippool` — valid resource kinds and `-o wide` is a supported output format.
- `calicoctl apply -f`, `calicoctl create -f`, `calicoctl delete <kind> <name>` — valid syntax.
- `calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'` — valid syntax; `logSeverityScreen` is a real field on FelixConfiguration and `Info` is a valid value (alongside Debug, Trace, Warning, Error, Fatal).
- `calicoctl validate -f resource.yaml` — confirmed as a real subcommand that performs structural and Calico-specific validation without datastore access; supports `-f`/`--filename`.
- Mindmap diagnostic commands `node status`, `node diags`, `ipam show`, `ipam check`, and `cluster diags` are all real calicoctl subcommands.

## Review Notes
- The post title ("Rollback Apply") is narrower than the content, which is a broad calicoctl command reference plus a generic backup/rollback workflow. This is a content/scope observation, not a technical inaccuracy, so no change was made.
- The "rollback" pattern shown (`calicoctl apply -f backup.yaml`) is the conventional approach but has a caveat the post does not call out: re-applying a captured `get -o yaml` will include server-populated metadata (resourceVersion, uid, creationTimestamp) which `apply` generally tolerates, but for cleaner rollbacks `calicoctl replace -f` may be preferable for cluster-scoped singletons. Worth mentioning in a future revision.
- `calicoctl get -o yaml` of certain resources also embeds defaults that were not in the original manifest; users intending GitOps-style rollback should keep the original source-of-truth manifest in version control rather than relying solely on a live-state dump.
