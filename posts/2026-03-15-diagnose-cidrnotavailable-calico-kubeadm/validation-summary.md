# Validation Summary: How to Diagnose CIDRNotAvailable Errors with Calico and kubeadm

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-controller-manager
- Calico
- Calico IPAM
- calicoctl
- kubectl
- CIDR and IPPool configuration

## Sources Consulted
- Kubernetes kubeadm configuration API, `networking.podSubnet` and `networking.serviceSubnet`: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- Kubernetes kubeadm init reference, `--pod-network-cidr`: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kube-controller-manager reference, `--allocate-node-cidrs` and `--cluster-cidr`: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Calico IPAM overview, including Calico IPAM behavior with `Node.spec.podCIDR`: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool configuration guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-ip-pools
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release

## Issues Found
- The introduction described `CIDRNotAvailable` as a Calico IPAM allocation error. Updated it to clarify that `CIDRNotAvailable` is a Kubernetes node CIDR allocation event, while Calico IPAM failures are related but separate pod IP allocation failures.
- The post said nodes without Kubernetes pod CIDR assignments cannot schedule pods with Calico. Updated this because official Calico documentation states Calico IPAM does not use `Node.spec.podCIDR`.
- The missing node CIDR troubleshooting guidance implied `--allocate-node-cidrs=true` is always required. Updated it to explain that node CIDR allocation is required only when a cluster component depends on Kubernetes node CIDRs, and Calico IPAM can run without it.
- The stale IPAM cleanup note suggested `calicoctl ipam release` could clean up stale blocks directly. Updated the wording to stale IPAM allocations and added the documented `--ip=<IP>` and `--from-report=<REPORT>` options.
- The prerequisites omitted `jq` even though a diagnostic command uses it. Added `jq` to the prerequisites.

## Review Notes
The commands are broadly valid, but Calico component namespaces vary by installation method. Operator-managed installations commonly use `calico-system`, while older manifest-based installations may use `kube-system`; users may need to adjust the namespace in log commands.
