# Validation Summary: calicoctl Command Guide - Use Get

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes networking
- Calico resources including FelixConfiguration, GlobalNetworkPolicy, BGPPeer, IPPool, and NetworkPolicy

## Sources Consulted
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico Open Source calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Open Source calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Open Source calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico Open Source calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source calicoctl configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The introduction called calicoctl the primary CLI for managing Calico resources. Current Calico documentation recommends using `kubectl` for most resource operations when the Calico API server is installed, while calicoctl remains required for specific subcommands such as `node`, `ipam`, `convert`, and `version`. I updated the wording to reflect that current guidance.
- The Mermaid reference listed `get --all-namespaces`, which is incomplete because `calicoctl get` requires a resource kind or filename. I changed it to `get networkpolicy --all-namespaces`.
- The Mermaid reference described `apply` as "create or update." Calico documents `apply` as creating a resource if it does not exist and replacing the resource spec if it does. I changed this to "create or replace."
- The conclusion described calicoctl commands as the foundation of Calico resource management and recommended `calicoctl apply` as the default for declarative management. I adjusted the wording so it remains accurate for clusters where calicoctl is the right resource-management tool while acknowledging current Calico guidance.

## Review Notes
The remaining command examples match the current Calico Open Source reference syntax. `calicoctl get` YAML/JSON output is documented as valid input for resource management commands, so the backup and rollback pattern is technically valid. For named resources, `calicoctl get <resource type> <resource name> -o yaml --export` can be preferable when preparing editable configuration because `--export` strips cluster-specific information.
