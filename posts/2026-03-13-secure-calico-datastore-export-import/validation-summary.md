# Validation Summary: How to Secure Calico Datastore Export and Import

## Status
validated

## Post Type
Guide / Operational reference

## Technologies Covered
- Calico (calicoctl)
- Kubernetes
- etcdv3 datastore
- Mermaid (flowchart diagram)
- Bash

## Sources Consulted
- Calico calicoctl datastore migrate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/
- Calico calicoctl datastore migrate export: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico calicoctl datastore migrate import: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import

## Issues Found
No technical issues found.

All commands shown in the post match the official Calico documentation:
- `calicoctl datastore migrate export` writes to stdout (redirected to a file in the example), which is the documented behavior.
- `calicoctl datastore migrate import -f <file>` matches the documented `-f`/`--filename` flag.
- `calicoctl datastore migrate lock` is a valid subcommand for locking the source datastore during migration.
- `calicoctl get felixconfiguration` and `calicoctl get globalnetworkpolicy` are valid resource get commands.
- The description of export contents (network policies, BGP configurations, IP pool definitions) aligns with the documented 13 resource types exported (IPPools, BGPPeers, GlobalNetworkPolicies, etc., excluding WorkloadEndpoints and Profiles).

## Review Notes
- The `calicoctl datastore migrate` family of commands is specifically designed for migrating from an etcdv3 datastore to a Kubernetes datastore (KDD). The post frames the export as suitable for either backup or migration; this is reasonable in practice for etcdv3-backed installations, but readers using the Kubernetes datastore (KDD) directly would not use these migrate commands and would instead rely on standard Kubernetes resource backup tooling. This nuance is not incorrect but could be worth a small clarifying note in future revisions.
- The `grep -c '^kind:'` count assumes each exported resource serializes its `kind:` at column zero. This is consistent with calicoctl's YAML output, but if an item is part of a List wrapper, the inner `kind:` would be indented. The current export format used by `datastore migrate export` produces top-level `kind:` lines, so the heuristic works as written.
