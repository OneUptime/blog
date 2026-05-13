# Validation Summary: How to Migrate to Calico IPAM Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPAM
- Kubernetes
- calicoctl
- Tigera Operator Installation resources
- Calico IPPool and BlockAffinity resources

## Sources Consulted
- Calico documentation: Get started with IP address management: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: Migrate from one IP pool to another: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico documentation: Change IP pool block size: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: BlockAffinity resource: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity

## Issues Found
- The command shown for viewing node block assignments used `kubectl get ipamhandles -A`. `IPAMHandle` resources track allocation handles, not node-to-block affinity. Changed it to `kubectl get blockaffinities.crd.projectcalico.org`, which matches Calico's BlockAffinity resource for IPAM block ownership.
- The orphaned allocation check repeated `calicoctl ipam check --show-all-ips`. Changed it to `calicoctl ipam check --show-problem-ips`, which Calico documents for printing leaked or improperly allocated IPs.

## Review Notes
The Installation `ipPools` example is valid for operator-managed default IP pool configuration, but Calico documents that `blockSize` is set when a pool is created and cannot be edited directly afterward. Existing clusters should migrate by adding a new pool, disabling the old pool for new allocations, recreating pods, verifying new addresses, and then deleting the old pool.
