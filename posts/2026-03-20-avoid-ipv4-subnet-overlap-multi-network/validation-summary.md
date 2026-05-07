# Validation Summary: How to Avoid IPv4 Subnet Overlap When Connecting Multiple Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting and overlap detection
- Python `ipaddress`
- AWS VPC networking
- Kubernetes / kubeadm networking
- Flannel CNI
- Linux `iptables` NAT
- Site-to-site VPN design

## Sources Consulted
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- Amazon VPC default VPC components: https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc-components.html
- Kubernetes kubeadm kubelet integration docs: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/
- Flannel project documentation: https://github.com/flannel-io/flannel
- `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The section titled "Kubernetes Default CIDR" stated that Kubernetes defaults to `10.244.0.0/16` for pods and `10.96.0.0/12` for services. I corrected this to a common kubeadm + Flannel setup, because `10.96.0.0/12` is a kubeadm service CIDR default while the pod CIDR depends on the selected CNI and cluster configuration.
- The NAT workaround used `DNAT --to-destination 10.100.0.0` and `SNAT --to-source 10.200.0.0` to translate entire `/24` networks. I replaced those commands with `NETMAP`, because the documented `DNAT` and `SNAT` targets map addresses or address ranges, not whole subnet-to-subnet prefix translations.

## Review Notes
- The Python overlap-checking example is syntactically correct and behaves as described with `IPv4Network.overlaps()`.
- The AWS default VPC example is accurate for default VPCs created by AWS, which use `172.31.0.0/16`.
- The NAT workaround remains platform-specific in practice; the corrected example assumes `iptables` support for the `NETMAP` target.
