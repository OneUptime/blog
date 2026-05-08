# Validation Summary: How to Prevent CIDRNotAvailable Errors with Calico and kubeadm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-controller-manager
- Calico
- Calico IPAM
- calicoctl
- Kubernetes CronJob

## Sources Consulted
- Kubernetes kubeadm v1beta4 configuration API: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kube-controller-manager flags: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IP pool configuration guidance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-ip-pools
- Calico IP pool block size guidance: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico calicoctl IPAM check reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Project Calico v3.27.0 calicoctl ipam check source: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/calicoctl/calicoctl/commands/ipam/check.go
- Project Calico v3.27.0 calicoctl ipam release source: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/calicoctl/calicoctl/commands/ipam/release.go

## Issues Found
- The introduction described CIDRNotAvailable and Calico pod IP allocation as if Calico IPAM depended on Kubernetes `Node.spec.podCIDR`. Updated the explanation to clarify that Calico IPAM does not use Kubernetes node CIDR allocations for pod IP assignment, while Calico IPPools should still remain within the Kubernetes pod CIDR.
- The Calico IPPool guidance required an exact CIDR match. Updated it to allow the Calico pool to be the same CIDR or a subset of the Kubernetes pod CIDR, matching Calico guidance.
- The IPAM section described `calicoctl ipam check` as garbage collection. Updated it to leak detection and added the documented lock, report, release, and unlock workflow for cleanup.
- The IPAM utilization scripts parsed nonexistent `Total` and `In use` lines. Updated the scripts to parse the documented `calicoctl ipam show` table columns for `IP Pool`, `IPS TOTAL`, and `IPS IN USE`.
- The kubeadm configuration example used `kubeadm.k8s.io/v1beta3` and map-style `controllerManager.extraArgs`. Updated it to `kubeadm.k8s.io/v1beta4` and the current list-of-name/value form.
- The verification wording assumed all nodes must have `spec.podCIDR`. Updated it to report node CIDR allocation status, because Calico IPAM can run without Kubernetes node CIDR allocation.

## Review Notes
- `calicoctl ipam check` exists in the Project Calico v3.27.0 source and is documented in Tigera's Calico Enterprise CLI reference, but the latest Calico Open Source IPAM command overview only lists `release`, `show`, and `configure`. Operators should verify command availability in their installed `calicoctl` version.
- The CronJob example assumes the `calico-node` service account has sufficient RBAC in the selected installation namespace. Operator-based and manifest-based Calico installs may use different namespaces and permissions.
