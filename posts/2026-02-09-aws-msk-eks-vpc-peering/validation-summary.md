# Validation Summary: How to Deploy AWS MSK on EKS Using VPC Peering for Kafka Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon MSK
- Amazon EKS
- VPC peering
- AWS CLI
- eksctl
- Kubernetes Deployments
- Apache Kafka TLS clients
- AWS Secrets Manager

## Sources Consulted
- AWS CLI Command Reference: `aws kafka create-cluster` - https://docs.aws.amazon.com/cli/latest/reference/kafka/create-cluster.html
- Amazon MSK Developer Guide: Port information - https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- Amazon MSK Developer Guide: Encryption in transit - https://docs.aws.amazon.com/msk/latest/developerguide/msk-working-with-encryption.html
- Amazon MSK Developer Guide: Supported Apache Kafka versions - https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Amazon VPC Peering Guide: What is VPC peering? - https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- Amazon VPC Peering Guide: How VPC peering connections work - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- Amazon VPC Peering Guide: Enable DNS resolution for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- Amazon EC2 API Reference: ModifyVpcPeeringConnectionOptions - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ModifyVpcPeeringConnectionOptions.html
- Amazon EKS eksctl User Guide: VPC configuration - https://docs.aws.amazon.com/eks/latest/eksctl/vpc-configuration.html
- Amazon EKS eksctl User Guide: Creating and managing clusters - https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- eksctl User Guide: Nodegroups - https://eksctl.io/usage/nodegroups/
- Kubernetes Documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The introduction stated that VPC peering reduces data transfer costs as an unconditional benefit. This was qualified to "in many architectures" because AWS networking charges depend on Region, Availability Zone placement, and the alternative path being compared.
- The VPC setup created new VPCs but did not enable DNS support and DNS hostnames. Added `aws ec2 modify-vpc-attribute` commands because cross-VPC hostname resolution depends on VPC DNS attributes in addition to peering DNS options.
- The subnet setup implied eksctl would handle the rest of the custom VPC networking. Added a note that existing private subnets must already have route tables, NAT gateways or VPC endpoints, and EKS subnet tags because eksctl does not create those resources when using supplied subnets.
- The managed nodegroup command targeted a private-subnet architecture but did not explicitly request private node networking. Added `--node-private-networking`.
- The troubleshooting section referred to "VPC peering metrics" and "route propagation." The listed commands only check peering status and route table entries, so those labels were corrected.

## Review Notes
The MSK cluster JSON uses valid AWS CLI input keys, Kafka version `3.5.1` is still listed as supported by Amazon MSK, and ports `9092`, `9094`, and `2181` match Amazon MSK documented plaintext, TLS, and ZooKeeper access patterns. AWS CLI and eksctl were not installed in the local environment, so command validation was performed against official documentation rather than local `--help` output.
