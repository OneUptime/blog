# Validation Summary: How to Avoid Common Mistakes with Calico IPPool Design

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl IPAM check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
No technical issues found.

## Review Notes
The IPPool example uses valid `projectcalico.org/v3` fields. `nodeSelector` is omitted, which is technically valid because Calico defaults it to `all()`, but future revisions could mention explicit selectors when discussing multi-pool or topology-specific designs. Current Calico documentation also recommends using the Calico API server and `kubectl` for most Calico resources, while `calicoctl` remains required for IPAM subcommands.
