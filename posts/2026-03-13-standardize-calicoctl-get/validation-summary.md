# Validation Summary: calicoctl Command Guide - Standardize Get

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Calico
- calicoctl (Calico CLI)
- Kubernetes networking
- GlobalNetworkPolicy, FelixConfiguration, BGPPeer, IPPool resources
- Mermaid diagrams

## Sources Consulted
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/
- Calico calicoctl cluster reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/
- Calico calicoctl ipam reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
No technical issues found.

All commands, flags, and resource names are correct and current per the official Calico documentation:
- `calicoctl get` with `felixconfiguration`, `globalnetworkpolicy`, `bgppeer`, `ippool` resources and `-o wide` flag — all valid.
- `calicoctl apply -f`, `calicoctl create -f`, `calicoctl delete`, `calicoctl patch ... -p`, `calicoctl validate -f` — all valid subcommands present in the calicoctl reference.
- `calicoctl node status`, `calicoctl node diags` — both verified as existing node subcommands.
- `calicoctl ipam show`, `calicoctl ipam check` — both verified as existing ipam subcommands.
- `calicoctl cluster diags` — verified as a valid subcommand for retrieving cluster diagnostics.
- `--all-namespaces` flag for `calicoctl get` — verified as supported (also `-A` short form).
- The patch payload format `{"spec":{"logSeverityScreen":"Info"}}` against `felixconfiguration default` matches the FelixConfiguration schema.

## Review Notes
- The post says `calicoctl get` is for "diagnostics" in the conclusion. While `get` is read-only and useful in diagnostic workflows, the dedicated diagnostic subcommands are `node diags`, `cluster diags`, `node status`, `ipam show`, and `ipam check` — which the mindmap correctly groups under Diagnostics. Minor stylistic inconsistency, not a technical error.
- The post does not pin a calicoctl version. The command set verified here reflects the current Calico documentation as of the validation date; users on older Calico releases (notably pre-3.20) may not have `cluster diags` or `validate`.
