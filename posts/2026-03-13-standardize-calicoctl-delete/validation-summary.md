# Validation Summary: calicoctl Command Guide - Standardize Delete

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Calico
- calicoctl CLI
- Kubernetes networking
- BGP (BGPPeer resource)
- Felix configuration
- Global network policies
- IP pools

## Sources Consulted
- [calicoctl overview](https://docs.tigera.io/calico/latest/reference/calicoctl/overview)
- [calicoctl get reference](https://docs.tigera.io/calico/latest/reference/calicoctl/get)
- [calicoctl node reference](https://docs.tigera.io/calico/latest/reference/calicoctl/node/)
- [calicoctl ipam reference](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/)
- [calicoctl cluster reference](https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/)

## Issues Found
No technical issues found.

All calicoctl commands, subcommands, flags, and resource types in the post were verified against the official Tigera/Calico documentation:

- Top-level subcommands `get`, `apply`, `create`, `replace`, `delete`, `patch`, `validate` are valid.
- `calicoctl get` flags `-o yaml`, `-o wide`, and `--all-namespaces` are documented.
- Resource kinds referenced (`felixconfiguration`, `globalnetworkpolicy`, `bgppeer`, `ippool`) are valid kinds accepted by `calicoctl get`.
- `calicoctl delete <kind> <name>` form is correct.
- `calicoctl patch` JSON patch syntax (`-p '{"spec":{...}}'`) is correct.
- `calicoctl node status`, `calicoctl node diags`, `calicoctl ipam show`, `calicoctl ipam check`, and `calicoctl cluster diags` all exist as documented subcommands.

## Review Notes
- The mindmap describes `apply` as "create or update", `create` as "new only", and `replace` as "update only", which matches Calico's documented declarative-vs-imperative behavior.
- The post uses `latest`-style command behavior and does not pin a specific calicoctl version; this is appropriate for a general guide but readers on much older versions (pre v3.20) should note that `cluster diags` was introduced later — not an error in the post since no version is claimed.
- The backup workflow uses `calicoctl apply` to restore a YAML backup, which works for resources captured via `calicoctl get -o yaml`, though readers should be aware that resourceVersion fields in the backup may need to be stripped on restore if conflicts arise.
