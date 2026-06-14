# Validation Summary: How to Use Cilium with AWS EKS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Cilium
- AWS EKS
- eksctl
- Kubernetes CNI
- AWS VPC CNI
- eBPF networking
- Helm
- Hubble
- WireGuard
- Prometheus metrics
- Kubernetes NetworkPolicy and CiliumNetworkPolicy

## Sources Consulted
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Prometheus metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Amazon EKS VPC CNI documentation: https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- Amazon EKS add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Amazon EKS VPC CNI add-on creation documentation: https://docs.aws.amazon.com/eks/latest/userguide/vpc-add-on-create.html
- eksctl add-ons documentation: https://docs.aws.amazon.com/eks/latest/eksctl/addons.html
- eksctl managed node group documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The cluster config claimed `attachPolicyARNs: []` disables the VPC CNI add-on. Replaced it with `addonsConfig.disableDefaultAddons: true` and explicitly kept CoreDNS, matching eksctl's documented default add-on opt-out.
- The examples used EKS Kubernetes `1.28`, which is stale for the review date. Updated the examples to `1.29`, which is still listed in current AWS EKS add-on compatibility documentation.
- The standard-cluster removal steps only deleted the `aws-node` DaemonSet and ConfigMap. Added managed add-on deletion commands and kube-proxy removal when Cilium kube-proxy replacement is enabled.
- The Cilium Helm values used obsolete or incorrectly nested keys: top-level `awsEnablePrefixDelegation`, top-level `awsReleaseExcessIPs`, `tunnel: disabled`, nested `cilium.image`, `nodeinit.removeCbrBridge`, `nodeinit.reconfigureKubelet`, and `kubeProxyReplacement: strict`. Updated them to the current chart structure: `eni.awsEnablePrefixDelegation`, `eni.awsReleaseExcessIPs`, `routingMode: native`, top-level `image`, `kubeProxyReplacement: "true"`, and removed unsupported nodeinit fields.
- The guide enabled ENI mode without giving the Cilium operator AWS EC2 permissions. Added an IAM policy and IRSA role setup, plus the matching Helm service account annotation.
- The kube-proxy-free install lacked explicit Kubernetes API server connection settings. Added `k8sServiceHost` and `k8sServicePort` placeholders.
- The Hubble CLI install used the old `master` branch URL for `stable.txt`. Updated it to `main`.
- The WireGuard values snippet repeated the `encryption` key and nested `wireguard` incorrectly. Fixed the YAML structure.
- The LoadBalancer example used an unsupported per-Service Maglev annotation. Removed the annotation and kept the example as a standard Kubernetes Service using Cilium's datapath.
- The metrics list included stale/nonexistent names. Updated `cilium_endpoint_count` to `cilium_endpoint` and replaced `cilium_policy_verdict_total` with `cilium_policy_endpoint_enforcement_status`.
- The cleanup section restored AWS VPC CNI using an old raw GitHub manifest. Replaced it with EKS add-on creation commands for VPC CNI and kube-proxy.

## Review Notes
The guide is now technically valid as a Cilium ENI-mode EKS walkthrough, but production deployments should further tailor IAM scope, subnet/security group selection, node AMI family, API endpoint discovery, and observability metrics to the target environment.
