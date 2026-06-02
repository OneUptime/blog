# Validation Summary: How to Set Up Private EKS Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EKS
- eksctl
- Kubernetes
- AWS VPC networking
- AWS PrivateLink and VPC endpoints
- Amazon ECR
- AWS CLI
- AWS Systems Manager Session Manager

## Sources Consulted
- Amazon EKS eksctl fully-private cluster documentation: https://docs.aws.amazon.com/eks/latest/eksctl/eks-private-cluster.html
- Amazon EKS private clusters with limited internet access documentation: https://docs.aws.amazon.com/eks/latest/userguide/private-clusters.html
- Amazon EKS cluster API server endpoint documentation: https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon ECR VPC endpoints documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon ECR pull-through cache documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html
- Amazon ECR pull-through cache rule creation documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- AWS CLI create-vpc-endpoint command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI authorize-security-group-ingress command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
- The eksctl sample mixed `privateCluster.enabled: true` with explicit `vpc.clusterEndpoints` settings. eksctl documentation says fully private clusters do not support setting `clusterEndpoints` during cluster creation, so those fields were removed.
- The eksctl sample used Kubernetes version `1.29`, which is no longer listed as available in EKS standard or extended support as of June 2, 2026. Updated the sample to `1.35`, the latest standard-support version in the AWS documentation.
- The post described a fully private cluster as using NAT gateways or no internet access. Clarified the distinction between private-with-NAT and fully private clusters so the text matches AWS and eksctl terminology.
- The AWS CLI VPC endpoint examples used a comma-separated `SUBNET_IDS` string for `--subnet-ids`. AWS CLI list parameters use separate values, so this was changed to a Bash array with `"${SUBNET_IDS[@]}"`.
- The endpoint examples referenced a security group before explaining that it must exist. Updated the security group section to state that the endpoint security group must be created before the endpoint commands if it does not already exist.
- The manual endpoint list omitted common conditional endpoints for EKS management API calls from inside the VPC, EKS Pod Identity, and Cluster Autoscaler. Added EKS, EKS Auth, and Auto Scaling endpoint examples and changed the section label from "Required endpoints" to "Common endpoints."
- The Docker Hub ECR pull-through cache command omitted `--credential-arn`. Docker Hub pull-through cache rules require a Secrets Manager credential ARN, so the command was corrected.
- The ECR pull-through cache section implied it works in a no-internet environment for first pulls. Added the AWS-documented caveat that first pulls through a pull-through cache rule need internet access to the upstream registry; subsequent cached pulls do not.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI syntax was verified against the official AWS CLI command reference instead of local `--help` output.
