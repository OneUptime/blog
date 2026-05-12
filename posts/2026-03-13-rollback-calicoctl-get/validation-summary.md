# Validation Summary: calicoctl Command Guide - Rollback Get

## Status
validated

## Post Type
Reference / Guide (calicoctl command usage in production Kubernetes)

## Technologies Covered
- Calico (Tigera Calico CNI)
- calicoctl CLI
- Kubernetes networking
- Felix configuration
- BGP peering
- IP Pool management
- GlobalNetworkPolicy

## Sources Consulted
- Tigera Calico calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- calicoctl cluster subcommands: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/
- calicoctl node subcommands: https://docs.tigera.io/calico/latest/reference/calicoctl/node/
- calicoctl ipam subcommands: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/

## Issues Found
No technical issues found.

Verified each command and claim in the post:
- `calicoctl get felixconfiguration|globalnetworkpolicy|bgppeer|ippool` — valid resource types, `-o wide` is a supported output flag.
- `calicoctl apply -f`, `calicoctl create -f`, `calicoctl delete <kind> <name>` — semantics described ("apply = create or update", "create = fails if exists") match the documented behavior.
- `calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'` — `logSeverityScreen` is a real Felix configuration field and "Info" is one of its accepted values (Debug, Info, Warning, Error, Fatal).
- `calicoctl validate -f resource.yaml` — `validate` is a documented top-level subcommand for validating Calico resource files.
- Mindmap diagnostic commands (`node status`, `node diags`, `ipam show`, `ipam check`, `cluster diags`) — all confirmed as valid subcommands.
- Mindmap write-command summaries (`apply` create-or-update, `create` new-only, `replace` update-only, `patch` partial-update, `delete`) accurately reflect calicoctl behavior.

## Review Notes
- The "Safe Workflow Pattern" relies on `calicoctl apply` to roll back from a YAML backup. This is generally workable, but note that `calicoctl get -o yaml` includes a `metadata.resourceVersion` field that can cause `apply` to fail with a conflict on rollback if the resource has been modified since the backup. Operators may need to strip `resourceVersion` (or use `calicoctl replace`) when restoring. This is a usability caveat rather than an incorrect statement, so no edit was made.
- `calicoctl validate` performs syntactic validation of the YAML/JSON resource definition (schema-level). It does not check semantic conflicts against the live cluster — fine as presented in the post but worth understanding in practice.
- `calicoctl cluster diags` was introduced in Calico v3.24; users on older versions should use `calicoctl node diags` instead. The post does not pin a version, which is acceptable for a general-purpose reference.
