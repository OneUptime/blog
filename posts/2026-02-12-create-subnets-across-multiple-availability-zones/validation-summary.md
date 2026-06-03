# Validation Summary: How to Create Subnets Across Multiple Availability Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- AWS Availability Zones
- AWS EC2 subnets
- AWS CLI
- AWS CloudFormation
- Amazon RDS Multi-AZ deployments
- Elastic Load Balancing Application Load Balancers
- Amazon EKS subnet tags and AWS Load Balancer Controller

## Sources Consulted
- AWS Global Infrastructure: AWS Regions and Availability Zones: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html
- Amazon VPC User Guide: Subnets for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- Amazon VPC User Guide: Subnet CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS CLI Command Reference: ec2 describe-availability-zones: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-availability-zones.html
- AWS CLI Command Reference: ec2 describe-subnets: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- AWS CLI Command Reference: ec2 modify-subnet-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CloudFormation Template Reference: Fn::GetAZs: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getavailabilityzones.html
- Elastic Load Balancing User Guide: Application Load Balancer subnets: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- Amazon RDS User Guide: Creating a Multi-AZ DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/create-multi-az-db-cluster.html
- Amazon EKS User Guide: Route application and HTTP traffic with Application Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- AWS Load Balancer Controller documentation: Subnet Discovery: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/

## Issues Found
- The post described Availability Zones as physically separate data centers. AWS documents an Availability Zone as one or more discrete data centers in a physically separate location. Updated the wording to avoid implying every AZ is exactly one data center.
- The post said RDS Multi-AZ deployments, ECS services, and Application Load Balancers all need subnets in at least two AZs. ECS services do not universally require multiple AZs, while RDS Multi-AZ DB clusters require at least three AZs. Updated the claim to distinguish RDS Multi-AZ DB instances, RDS Multi-AZ DB clusters, Application Load Balancers, and ECS services.
- The EKS subnet tagging example only showed `kubernetes.io/role/internal-elb` but said services would not get external endpoints without those tags. Updated the explanation to state that private subnets use `kubernetes.io/role/internal-elb=1`, public subnets for internet-facing load balancers use `kubernetes.io/role/elb=1`, and the cluster tag is mainly required by older AWS Load Balancer Controller versions or useful in shared VPC scenarios.
- The verification command said it sorted subnets by AZ, but the JMESPath query did not sort. Updated the query to use `sort_by(Subnets,&AvailabilityZone)`.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output.
- The CloudFormation example is syntactically aligned with AWS intrinsic function documentation. It creates public and private subnets only, while the earlier AWS CLI example creates public, private, and data subnets.
- The AWS CLI subnet creation script creates subnet resources and tags them, but route table associations and internet gateway/NAT routing still need to be configured separately, as the post notes in the common pitfalls section.
