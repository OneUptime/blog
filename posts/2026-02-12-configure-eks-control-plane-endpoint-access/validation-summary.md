# Validation Summary: How to Configure EKS Control Plane Endpoint Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon EKS
- Kubernetes API server endpoint access
- AWS CLI
- eksctl
- Route 53 private hosted zones
- VPC Flow Logs

## Sources Consulted
- Amazon EKS User Guide: Cluster API server endpoint - https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS User Guide: Configure network access to cluster API server endpoint - https://docs.aws.amazon.com/eks/latest/userguide/config-cluster-endpoint.html
- AWS CLI Command Reference: aws eks update-cluster-config - https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- eksctl User Guide: Cluster Access - https://docs.aws.amazon.com/eks/latest/eksctl/vpc-cluster-access.html
- AWS General Reference: Amazon Elastic Kubernetes Service endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/eks.html
- AWS CLI Command Reference: aws ec2 create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html

## Issues Found
- The public-only endpoint description and diagram said node traffic goes through the internet. AWS documents that traffic to the public endpoint leaves the VPC but does not leave Amazon's network, so the wording was corrected.
- The eksctl command used `eksctl utils update-cluster-endpoints`, but current eksctl documentation uses `eksctl utils update-cluster-vpc-config` for endpoint access updates, so the command was corrected.
- The node communication table described public-only traffic as "Through internet/NAT" with "Higher latency, NAT costs." AWS documents public-only nodes as using the public endpoint via public IP or NAT gateway, with data transfer charges and possible NAT costs, so the table was corrected.
- The NAT cost explanation implied private endpoint access always reduces NAT gateway costs. It only affects clusters where private node-to-API traffic would otherwise use a NAT path, so the wording was narrowed.
- The VPC Flow Logs command for a CloudWatch Logs destination omitted `--deliver-logs-permission-arn`, which AWS CLI documentation marks as required for `cloud-watch-logs` destinations. The command now includes an example IAM role ARN.

## Review Notes
The EKS public access CIDR limit of 40 blocks is current in the AWS General Reference. The post's internal OneUptime links returned HTTP 200 during validation. AWS CLI and eksctl were not installed locally, so command verification was performed against official current documentation rather than local `--help` output.
