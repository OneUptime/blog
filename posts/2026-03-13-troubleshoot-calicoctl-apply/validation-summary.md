# Validation Summary: calicoctl Command Guide - Troubleshoot Apply

## Status
validated

## Post Type
Technical command guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes networking
- Calico network policy and resource management

## Sources Consulted
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico Open Source calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Open Source calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico Open Source calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico Open Source calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
No technical issues found.

## Review Notes
The commands are valid for current Calico Open Source documentation. `calicoctl apply` creates missing resources and replaces the full spec of existing resources, so future versions of this guide could mention that complete specs are required for updates.
