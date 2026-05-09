# Validation Summary: How to Troubleshoot Calico IPPool Design

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source calicoctl IPAM overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Enterprise calicoctl ipam check reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check

## Issues Found
- The verification command used `calicoctl ipam check -o ipam-report.json`. Current Calico Open Source documentation lists `release`, `show`, and `configure` as `calicoctl ipam` subcommands, while `ipam check` is documented in the Calico Enterprise CLI reference. I changed the command to `calicoctl get ippools -o wide`, which is documented for Calico Open Source and directly verifies IPPool configuration.

## Review Notes
The IPPool YAML uses the current `projectcalico.org/v3` API and valid `spec.cidr`, `spec.blockSize`, and `spec.natOutgoing` fields. The `blockSize` value `26` is the documented IPv4 default and is valid, but Calico documents that `blockSize` can only be set when the pool is created.
