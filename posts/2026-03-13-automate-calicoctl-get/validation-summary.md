# Validation Summary: calicoctl Command Guide - Automate Get

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes networking
- Calico resource management

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The safe workflow backed up resources with `calicoctl get <resource> -o yaml`, which omits the resource name and does not use `--export`. Calico's official guidance for saving low-level configuration resources for later update uses `calicoctl get <resource type> <resource name> -o yaml --export > config.yaml`, so the backup command was changed to `calicoctl get <resource> <name> -o yaml --export > backup-$(date +%Y%m%d).yaml`. The verification command was also updated to include `<name>` for consistency.

## Review Notes
The listed `get`, `apply`, `create`, `replace`, `patch`, `delete`, `validate`, `node status`, `node diags`, `ipam show`, `ipam check`, and `cluster diags` commands are current in the official Calico calicoctl reference. `--export` applies when a resource name is specified; broad backups of all resources may need a different export strategy per resource type.
