# Validation Summary: calicoctl Command Guide - Standardize Create

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Calico
- calicoctl (Calico CLI)
- Kubernetes
- Calico resources (FelixConfiguration, GlobalNetworkPolicy, BGPPeer, IPPool)

## Sources Consulted
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags

## Issues Found
No technical issues found.

All commands and flags in the post were verified against the official Calico documentation:

- `calicoctl get felixconfiguration|globalnetworkpolicy|bgppeer|ippool` — all valid resource kinds.
- `calicoctl get ippool -o wide` — `-o wide` is a documented output format.
- `calicoctl get -o yaml` — `yaml` is a documented output format.
- `calicoctl get --all-namespaces` — documented flag (short form `-A`).
- `calicoctl apply -f`, `calicoctl create -f`, `calicoctl delete <kind> <name>` — all correct.
- `calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'` — matches the documented `calicoctl patch <KIND> <NAME> --patch=<PATCH>` syntax; default patch type is strategic merge.
- `calicoctl validate -f resource.yaml` — documented command; `-f` is the short form of `--filename`.
- `calicoctl node status`, `calicoctl node diags` — both documented node subcommands.
- `calicoctl ipam show`, `calicoctl ipam check` — both documented ipam subcommands.
- `calicoctl cluster diags` — documented cluster subcommand for collecting cluster-wide diagnostics.

The semantic distinctions in the mindmap (`apply` = create-or-update, `create` = new-only, `replace` = update-only, `patch` = partial update) match the documented behavior of each command.

## Review Notes
- The post's "Step 5: Rollback" via `calicoctl apply` on a backed-up YAML is a reasonable rollback pattern for most resources, but readers should be aware that some fields (e.g., status fields, resourceVersion) in the backup may need cleanup before reapply. This is a general kubectl/calicoctl caveat rather than an error in the post.
- The post does not pin a specific calicoctl version. All commands shown are supported in current Calico releases (v3.x line, including v3.27+), so the content is broadly applicable.
