# Validation Summary: calicoctl Command Guide - Rollback Delete

## Status
validated

## Post Type
Reference / Guide (calicoctl command reference and safe workflow guidance)

## Technologies Covered
- Calico (Project Calico / Tigera)
- calicoctl CLI
- Kubernetes networking
- Felix configuration
- BGP peering (Calico)
- Calico IPAM

## Sources Consulted
- [calicoctl overview - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/overview)
- [calicoctl get - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/get)
- [calicoctl patch - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/patch)
- [calicoctl ipam overview - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview)
- [calicoctl ipam show - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show)
- [calicoctl ipam check - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check)
- [calicoctl node diags - Calico Documentation](https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags)
- [calicoctl cluster diags - Calico Enterprise Documentation](https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/cluster/diags)

## Issues Found
No technical issues found.

All commands shown in the post were verified against the official Calico documentation:
- `calicoctl get` with `-o yaml`, `-o wide`, and `--all-namespaces` are all documented flags.
- `calicoctl apply`, `create`, `replace`, `delete`, `patch`, and `validate` are all valid top-level subcommands.
- `calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'` is syntactically valid — `-p`/`--patch` is the correct flag, `felixconfiguration` is a patchable resource type, and `logSeverityScreen` with value `Info` is a valid FelixConfiguration spec field/value.
- `calicoctl node status`, `calicoctl node diags`, `calicoctl ipam show`, `calicoctl ipam check`, and `calicoctl cluster diags` are all valid diagnostic subcommands.

## Review Notes
- The post describes `calicoctl create` as "fails if exists" and `calicoctl replace` as "update only" — both are accurate per the docs.
- `calicoctl cluster diags` is documented under the Calico Enterprise reference; the open-source Calico documentation primarily surfaces `calicoctl node diags`. Users on community Calico builds should confirm `cluster diags` availability for their installed version.
- The default patch type for `calicoctl patch` is strategic merge patch; JSON Patch (RFC 6902) and JSON Merge Patch (RFC 7386) are noted as "not yet implemented." The example in the post relies on the strategic-merge default, which is correct.
- The backup workflow uses `calicoctl apply -f backup-...yaml` to roll back. This works for resources that existed and were backed up before the change, but it will not delete resources that were *added* by the new config — readers managing additive changes may also need explicit `calicoctl delete` calls during rollback.
