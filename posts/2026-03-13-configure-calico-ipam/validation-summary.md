# Validation Summary: How to Configure Calico IPAM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico IPAM
- Calico IP pools
- Tigera Operator Installation resource
- Kubernetes custom resources
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: IP pool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Block affinity resource - https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico Open Source documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico Open Source documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api

## Issues Found
- The command described as checking IP pool utilization used `calicoctl ipam show --show-configuration`, which shows global IPAM configuration rather than utilization. Changed it to `calicoctl ipam show`.
- The command described as viewing node block assignments used `kubectl get ipamhandles -A`, but Calico block assignments are represented by BlockAffinity resources. Changed it to `kubectl get blockaffinities.crd.projectcalico.org`.
- The orphaned allocation check repeated `calicoctl ipam check --show-all-ips`, which lists all checked IPs. Changed it to `calicoctl ipam check --show-problem-ips` to show leaked or incorrectly allocated IPs.
- The conclusion implied IPAM consistency checks directly catch pool exhaustion. Revised it to distinguish consistency checks from utilization checks.

## Review Notes
The Tigera Operator `Installation` IP pool snippet is valid for operator-managed default pools, but Calico documentation notes that IP pool changes made in the `Installation` resource after installation may not be applied in all workflows. Existing pools should generally be managed with the IPPool resource or the documented migration procedure.
