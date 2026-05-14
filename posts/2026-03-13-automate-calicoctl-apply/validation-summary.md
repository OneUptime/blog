# Validation Summary: calicoctl Command Guide

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Calico resource management
- Calico diagnostics and IPAM commands

## Sources Consulted
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Open Source calicoctl configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico Open Source calicoctl replace reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico Open Source calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Open Source calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Open Source calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The introduction described `calicoctl` as the primary CLI for managing Calico resources. Current Calico documentation says newer releases can use the Calico API server with `kubectl` for most resource operations, while `calicoctl` remains required for `node`, `ipam`, `convert`, and `version` commands. Updated the introduction to reflect that current guidance.
- The conclusion recommended `calicoctl apply` as the default for declarative management without that version-specific caveat. Updated the wording to scope the recommendation to file-based resource changes made with `calicoctl`, and to describe Calico resource changes rather than calicoctl itself as the GitOps integration target.

## Review Notes
The listed calicoctl commands, resource kinds, flags, and FelixConfiguration `logSeverityScreen` field were verified against current Calico Open Source documentation. The backup workflow is technically reasonable, but production teams should ensure exported backups are complete for the specific resource names and datastores they manage.
