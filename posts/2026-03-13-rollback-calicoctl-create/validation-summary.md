# Validation Summary: calicoctl Command Guide - Rollback Create

## Status
validated

## Post Type
Reference / Guide — calicoctl CLI usage patterns and safe workflow for Calico resource management.

## Technologies Covered
- Calico (CNI / network policy)
- calicoctl (Calico CLI)
- Kubernetes
- FelixConfiguration, GlobalNetworkPolicy, BGPPeer, IPPool resources
- Mermaid (mindmap diagram)

## Sources Consulted
- calicoctl overview / subcommands: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- calicoctl apply: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl ipam: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl node: https://docs.tigera.io/calico/latest/reference/calicoctl/node/
- calicoctl cluster: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/
- FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- **`calicoctl apply --dry-run` is not a valid flag.** The `calicoctl apply` command does not accept `--dry-run`; supported flags are `-f/--filename`, `-R/--recursive`, `--skip-empty`, `-c/--config`, `-n/--namespace`, `--context`, and `--allow-version-mismatch`. Replaced the example in the "Key Commands" block with `calicoctl validate -f resource.yaml`, which is the documented subcommand for validating resource files for correctness. Also updated the mindmap's Validate node from `apply --dry-run -f file.yaml` to `validate -f file.yaml` for the same reason.

## Review Notes
- `calicoctl cluster diags` and `calicoctl node diags` are both valid (they target cluster-wide vs single-node diagnostics respectively), so the mindmap entry is correct.
- `calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'` is correct — `-p` is the short form of `--patch`, `logSeverityScreen` is a real FelixConfiguration field, and `Info` is one of the accepted values (Debug, Error, Fatal, Info, Trace, Warning).
- `calicoctl get --all-namespaces` is valid (short form `-A` also works) and applies to namespaced resources such as NetworkPolicy, StagedNetworkPolicy, NetworkSet, and WorkloadEndpoint.
- The rollback step (`calicoctl apply -f backup-...yaml`) will restore resources that existed at backup time but will not delete resources created after the backup was taken. This is a workflow caveat worth noting in a future revision but is not a technical error.
- Title says "Rollback Create" but the post covers the broader calicoctl command set rather than a rollback-specific subcommand; that's a content/scope observation, not a correctness issue.
