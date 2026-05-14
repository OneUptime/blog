# Validation Summary: How to Avoid Common Mistakes with Migrating Calico IP Pools

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico migrate from one IP pool to another: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico change IP pool block size: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show

## Issues Found
No technical issues found.

## Review Notes
The post is technically accurate, but it is very high-level for a migration guide. Future improvements could add the official migration sequence: create the new pool, disable the old pool, recreate pods so they receive addresses from the new pool, verify allocation, and then remove the old pool. Calico documentation also notes that pool CIDRs should remain within the Kubernetes cluster CIDR and that `blockSize` can only be set when an IPPool is created.
