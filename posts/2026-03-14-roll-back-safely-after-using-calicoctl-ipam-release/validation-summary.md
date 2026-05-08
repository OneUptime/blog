# Validation Summary: Rolling Back Safely After Using calicoctl ipam release

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl

## Sources Consulted
- Calico Open Source documentation: calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: IP pool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post implied that incorrectly released IPs simply require restarting non-running pods. The Calico documentation states that `calicoctl ipam release` releases an address in Calico IPAM but does not remove the IP from an existing endpoint. Updated the guidance to identify the affected pod or workload endpoint first, then restart it only when appropriate.
- The post stated that IPAM state is derived from running pods and IP pool configuration. Calico IPAM also stores allocation data, and `calicoctl ipam check` checks IPAM data structures against Kubernetes. Updated the wording to describe consistency between Calico IPAM allocation data, Kubernetes endpoints, and IP pool configuration.
- The post stated that previous IP assignments cannot be exactly restored. This is too absolute because specific IP assignment may be possible in some Calico/Kubernetes configurations, while normal pod IP allocation is dynamic. Updated the wording to say previous assignments are not generally guaranteed.
- The cleanup command used `kubectl delete pod recovery-test --grace-period=0`. Current kubectl documentation says a zero grace period can only be used with `--force`. Updated the command to `kubectl delete pod recovery-test --now` for immediate cleanup without force deletion.

## Review Notes
The command syntax used in the post is current for the referenced Calico and Kubernetes CLIs after the fixes above.
