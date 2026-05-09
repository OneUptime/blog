# Validation Summary: How to Troubleshoot Installation Issues with Calico on Kind

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Calico
- Kubernetes
- Kind
- Docker
- CNI networking
- IP-in-IP and VXLAN encapsulation
- kubectl and calicoctl
- iptables

## Sources Consulted
- Calico Kind installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kubernetes kubectl set env reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env

## Issues Found
- The post described `docker exec ... modprobe ipip` as a check for the `ipip` kernel module. That command loads the module rather than checking it, so it was changed to check with `lsmod` and load with `modprobe` only if needed.
- The post recommended switching an existing Calico installation to VXLAN by setting `CALICO_IPV4POOL_IPIP` and `CALICO_IPV4POOL_VXLAN` on the `calico-node` DaemonSet. Calico documents these environment variables as default IP pool settings that only take effect when the default pool is created. The commands were changed to inspect IP pools and patch the default IPPool with `ipipMode: Never` and `vxlanMode: Always`.
- The node Pod CIDR command printed all node CIDRs without node names or line breaks. It was changed to a jsonpath expression that prints each node name with its Pod CIDR for easier mismatch diagnosis.
- The health-check commands now call `/bin/calico-node`, matching Calico's documented probe path, and the post now notes that the BIRD check only applies when BGP/BIRD is enabled.

## Review Notes
- The guide assumes the default IPPool is named `default-ipv4-ippool`, which is the common Calico default. In clusters with custom IPPool names, readers should patch the name shown by `calicoctl get ippool -o wide`.
- Local `kubectl`, `calicoctl`, and `kind` binaries were not installed in the review environment, so CLI syntax was verified against official documentation rather than local help output.
