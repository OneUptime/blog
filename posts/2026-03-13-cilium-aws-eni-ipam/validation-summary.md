# Validation Summary: Cilium AWS ENI IPAM: Configure, Troubleshoot, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium AWS ENI IPAM
- Kubernetes and CiliumNode CRDs
- Amazon EKS and EC2 Elastic Network Interfaces
- Helm
- AWS CLI
- Prometheus Operator rules
- jq

## Sources Consulted
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium Helm installation documentation for EKS: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium monitoring and IPAM metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CRD-backed IPAM and CiliumNode field documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium v1.19.4 CiliumNode CRD schema: https://raw.githubusercontent.com/cilium/cilium/v1.19.4/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumnodes.yaml
- Cilium v1.15.6 chart values and metric docs for version comparison: https://raw.githubusercontent.com/cilium/cilium/v1.15.6/install/kubernetes/cilium/values.yaml and https://raw.githubusercontent.com/cilium/cilium/v1.15.6/Documentation/observability/metrics.rst
- AWS CLI describe-subnets documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- AWS EC2 instance type discovery documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-discovery.html
- Amazon VPC IPAM CloudWatch metrics documentation: https://docs.aws.amazon.com/vpc/latest/ipam/cloudwatch-ipam-ip-address-usage.html

## Issues Found
- The IAM policy omitted required/conditional Cilium ENI permissions and included IPv6 ENI permissions that are not part of Cilium ENI IPAM's required privilege set. Added `ec2:DescribeRouteTables`, `ec2:CreateTags`, and `ec2:DescribeTags`; removed `ec2:AssignIpv6Addresses` and `ec2:UnassignIpv6Addresses`.
- The install example pinned Cilium `1.15.6` while using newer ENI-related concepts and outdated/deprecated Helm values. Updated the example to Cilium `1.19.4` and changed `tunnel=disabled` to `routingMode=native`.
- The prefix delegation tuning example used non-existent Helm values `ipam.operator.eniMinAllocate` and `ipam.operator.eniMaxAllocate`. Replaced them with `ipam.nodeSpec.ipamMinAllocate` and `ipam.nodeSpec.ipamMaxAllocate`.
- The ENI tag example used the wrong Helm value path `eni.tags`. Replaced it with `eni.eniTags`.
- The CiliumNode jq examples used incorrect JSON paths such as `.spec.eni.instance_id`, `.status.eni[]`, and `.status.ipam.available`. Updated them to use `.spec.eni["instance-id"]`, `.status.eni.enis`, `.spec.ipam.pool`, and `.status.ipam.used`.
- The CiliumNode "ENI errors" example inferred errors from missing ENI tags. Replaced it with the operator-reported IPAM error at `.status.ipam["operator-status"].error`.
- The Prometheus metric names used the wrong namespace prefix. Updated `cilium_ipam_available_ips` and `cilium_ipam_allocated_ips` to `cilium_operator_ipam_available_ips` and `cilium_operator_ipam_used_ips`.
- The CloudWatch subnet monitoring note incorrectly identified `AvailableIpAddressCount` as an `AWS/EC2` CloudWatch metric. Updated it to use EC2 `DescribeSubnets`, or `AWS/IPAM` `SubnetIPUsage` when VPC IPAM is enabled.

## Review Notes
The post is now technically accurate for current Cilium documentation. Operationally, production EKS installs should also account for Cilium's documented EKS prerequisites, including preventing the AWS VPC CNI `aws-node` DaemonSet from managing ENIs when Cilium is taking over ENI IPAM.
