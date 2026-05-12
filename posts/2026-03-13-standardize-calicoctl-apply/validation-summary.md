# Validation Summary: calicoctl Command Guide - Standardize Apply

## Status
validated

## Post Type
Reference / Guide — practical command reference and safe-workflow guide for calicoctl in production.

## Technologies Covered
- Calico (open source) and Calico Enterprise
- calicoctl CLI (top-level commands and subcommand groups)
- Kubernetes resource management (declarative apply, patch, replace)
- Mermaid diagrams (mindmap)

## Sources Consulted
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl reference index: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node diags: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico Enterprise calicoctl cluster diags: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/cluster/diags
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
No technical issues found.

Verifications performed:
- `calicoctl get felixconfiguration|globalnetworkpolicy|bgppeer|ippool` — valid resource kinds.
- `calicoctl get -o wide` — confirmed supported output format.
- `calicoctl get --all-namespaces` (and `-A`) — confirmed supported on namespaced resources.
- `calicoctl apply -f`, `create -f`, `replace -f`, `delete <kind> <name>` — all correct semantics (apply = create/update, create = new only, replace = update only).
- `calicoctl patch felixconfiguration default -p '<json>'` — valid usage; `-p` is the short form of `--patch`.
- `calicoctl validate -f resource.yaml` — confirmed as a real top-level subcommand for validating resource files without applying.
- `calicoctl convert`, `label`, `version`, `datastore` — listed correctly as available command groups.
- `calicoctl node status` and `calicoctl node diags` — both real subcommands of `node`.
- `calicoctl ipam show` and `calicoctl ipam check` — both real subcommands of `ipam`.
- `calicoctl cluster diags` — exists in Calico Enterprise; appropriate to list under diagnostics in a calicoctl mindmap.

## Review Notes
- `calicoctl cluster diags` is a Calico Enterprise feature. In open-source Calico, the closest equivalent is `calicoctl node diags`. Both are accurately presented in the diagnostics section, but readers on open-source Calico may not have `cluster diags` available — a future revision could note this distinction explicitly.
- The "rollback by re-applying the backup" step is correct for most resources but won't recover from a `delete` of a resource whose status/UID matters (e.g., WorkloadEndpoint); apply will recreate with a new UID. Acceptable as a general pattern for configuration resources (felixconfiguration, globalnetworkpolicy, bgppeer, ippool) which are the focus of the post.
- Post is concise and accurate; no changes required.
