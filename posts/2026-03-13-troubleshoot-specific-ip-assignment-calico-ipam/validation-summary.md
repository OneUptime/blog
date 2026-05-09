# Validation Summary: How to Troubleshoot Specific IP Assignment with Calico IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- calicoctl
- IPPool resources

## Sources Consulted
- Calico Open Source documentation: Use a specific IP address with a pod, https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico Open Source documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The verification command used `calicoctl ipam check -o ipam-report.json`. Current Calico Open Source documentation lists `calicoctl ipam show`, `release`, and `configure` for IPAM operations, while `ipam check` is documented in Calico Enterprise. I changed the command to `calicoctl ipam show --ip=<requested-ip>`, which is documented for checking whether a specific IP address is in use and directly fits troubleshooting a requested pod IP.

## Review Notes
- The IPPool example uses valid `projectcalico.org/v3` syntax. The `cidr`, `blockSize`, and `natOutgoing` fields match the current IPPool resource reference.
- Calico documentation says specific pod IP assignment requires Calico IPAM and a requested address within a configured Calico IP pool. The post's prerequisites and IP pool checks are consistent with that requirement.
