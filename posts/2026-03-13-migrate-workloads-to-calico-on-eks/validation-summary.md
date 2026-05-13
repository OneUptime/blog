# Validation Summary: Migrate Workloads to Calico on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon VPC CNI
- Calico Open Source
- Tigera Operator
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- kubectl
- calicoctl
- AWS CLI

## Sources Consulted
- Calico Open Source documentation: Installing on EKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico Open Source documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: Network policy behavior - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Open Source documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico Open Source documentation: eBPF installation requirements - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Amazon EKS documentation: Restrict Pod network traffic with Kubernetes network policies - https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html
- Amazon EKS documentation: Limit Pod traffic with Kubernetes network policies - https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- Amazon VPC CNI GitHub documentation - https://github.com/aws/amazon-vpc-cni-k8s

## Issues Found
- The post described "replacing the default AWS CNI network policy." AWS VPC CNI network policy is an optional feature, not simply the default policy engine in all clusters. Updated the description to say the guide disables AWS VPC CNI network policy and uses Calico.
- The post called the AWS VPC CNI plus Calico policy-only pattern "the recommended pattern" and said Calico uses iptables or eBPF without replacing the data plane. Adjusted the wording to "supported pattern" and removed the over-specific enforcement claim, because Calico eBPF mode has additional setup and kube-proxy/API endpoint requirements.
- The AWS network policy disable command used a non-documented `ENABLE_NETWORK_POLICY_CONTROLLER` environment variable. Replaced it with the documented EKS add-on configuration key and the self-managed VPC CNI ConfigMap / `aws-network-policy-agent` argument path.
- The Calico install command used v3.27 and omitted the required `v1_crd_projectcalico_org.yaml` CRDs. Updated the commands and prerequisite to Calico v3.32 and added the CRD install step.
- The EKS policy-only install omitted the AWS VPC CNI `ANNOTATE_POD_IP=true` configuration and the required `patch` permission for the `aws-node` ClusterRole. Added the documented configuration.
- The verification command used `calicoctl get installation`, but `Installation` is an operator resource. Changed it to `kubectl get installation.operator.tigera.io default`.
- The DNS egress policy used pod selectors and port 53 directly. Replaced it with Calico's documented Kubernetes Service rule for `kube-dns` in `kube-system`.
- The workload validation commands used namespaces that were never created. Added `kubectl create namespace` commands.
- The allowed connectivity test implied it would pass with only the global default-deny policies. Clarified that the test should be run after application allow policies are in place.
- The best-practice bullet said to enable Calico eBPF mode on EKS for performance. Revised it to evaluate eBPF separately because Calico documents additional prerequisites and migration considerations.

## Review Notes
The remaining validation commands assume an existing `backend-service` in `app-ns` and corresponding application allow policies. That is acceptable for a migration guide, but a future revision could add a complete throwaway test deployment and allow policy to make the validation section fully self-contained.
