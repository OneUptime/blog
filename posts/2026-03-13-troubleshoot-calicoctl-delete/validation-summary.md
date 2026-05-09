# Validation Summary: calicoctl Command Guide - Troubleshoot Delete

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
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico calicoctl replace reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/
- Calico calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico calicoctl installation guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The Mermaid command reference described `calicoctl apply` as "create or update". Calico documents `apply` as creating a resource if it does not exist, or replacing the existing resource specification in its entirety if it does exist. Changed the wording to "create or replace" to avoid implying a partial update.

## Review Notes
The listed commands and flags are valid in the current Calico Open Source 3.32 documentation. `calicoctl --all-namespaces` is supported for namespaced resources, and node-related subcommands may require running from a suitable host or environment with node access.
