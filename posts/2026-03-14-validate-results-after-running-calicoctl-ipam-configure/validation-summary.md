# Validation Summary: Validating Results After Running calicoctl ipam configure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico Open Source documentation: calicoctl ipam configure, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico Open Source documentation: IPAMConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post used `calicoctl ipam configure show`, which is not a documented `calicoctl ipam configure` form. Changed it to `calicoctl ipam show --show-configuration`, which is the documented command for displaying current Calico IPAM configuration.
- The validation script parsed `StrictAffinity` from the old command using `awk '{print $2}'`, which would not parse the documented table output. Updated it to parse the value column from `calicoctl ipam show --show-configuration`.
- The cleanup commands used `--grace-period=0` without `--force`. Current kubectl help states that a zero grace period can only be set with force deletion, so the examples now use normal deletion.
- The test-pod cleanup used the broad selector `-l run`, which could match unrelated pods created by `kubectl run`. Added a specific `app=ipam-test` label and used that label for listing and cleanup.
- The cross-node connectivity test did not force pods onto different nodes, so it could test same-node connectivity. Updated the example to place sender and receiver on the first two nodes.
- The block-affinity section implied that `calicoctl ipam show --show-blocks` shows borrowing. Added `calicoctl ipam show --show-borrowed` and adjusted the explanation to match Calico's documented strict-affinity behavior.

## Review Notes
The examples assume a namespace with at least two schedulable nodes for the cross-node connectivity test. In a single-node cluster, that specific test should be skipped or adapted.
