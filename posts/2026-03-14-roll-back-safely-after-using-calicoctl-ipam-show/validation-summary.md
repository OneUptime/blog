# Validation Summary: Rolling Back Safely After Using calicoctl ipam show

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

## Sources Consulted
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico documentation: calicoctl ipam release, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Kubernetes kubectl reference, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The verification cleanup command used `kubectl delete pod recovery-test --grace-period=0` without `--force`. Current kubectl reference documents that `--grace-period=0` can only be used when `--force` is also set, so the command was updated to `kubectl delete pod recovery-test --force --grace-period=0`.
- The recovery guidance said incorrectly released IPs require pods to be restarted. Calico documents that `calicoctl ipam release` does not remove the IP from existing endpoints and should only be used for endpoints that were not cleanly removed, so the wording was changed to specify live endpoints and affected pods that may need to be recreated.
- The restoring section described IPAM state as derived from running pods and IP pool configuration. Calico's IPAM check documentation verifies Calico IPAM datastore structures against Kubernetes, so the wording was revised to mention Calico IPAM datastore records, running endpoints, and IP pool configuration staying consistent.
- The troubleshooting note implied previous IP assignments cannot be exactly restored in all cases. The wording was softened to "cannot generally be exactly restored" and tied successful new allocations to resolving IPAM consistency issues.

## Review Notes
The central claim that `calicoctl ipam show` is read-only is consistent with the command reference, which describes it as printing information about a specific IP address or overall IP usage. The post does not pin a Calico or Kubernetes version, so the review used current official documentation available on 2026-05-08.
