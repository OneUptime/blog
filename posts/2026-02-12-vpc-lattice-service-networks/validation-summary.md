# Validation Summary: How to Configure VPC Lattice Service Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Lattice
- VPC Lattice service networks and services
- VPC Lattice auth policies
- VPC Lattice service network VPC associations
- AWS Resource Access Manager (RAM)
- AWS CloudFormation
- Amazon CloudWatch metrics and access logs
- Amazon Route 53 DNS for custom domains
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: `create-service-network` - https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/create-service-network.html
- AWS CLI Command Reference: `create-service-network-vpc-association` - https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/create-service-network-vpc-association.html
- Amazon VPC Lattice User Guide: Auth policies - https://docs.aws.amazon.com/vpc-lattice/latest/ug/auth-policies.html
- Amazon VPC Lattice User Guide: Security groups - https://docs.aws.amazon.com/vpc-lattice/latest/ug/security-groups.html
- Amazon VPC Lattice User Guide: Service network associations - https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html
- Amazon VPC Lattice User Guide: Access logs - https://docs.aws.amazon.com/vpc-lattice/latest/ug/monitoring-access-logs.html
- Amazon VPC Lattice User Guide: CloudWatch metrics - https://docs.aws.amazon.com/vpc-lattice/latest/ug/monitoring-cloudwatch.html
- Amazon VPC Lattice User Guide: Custom domain names - https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-custom-domain-name.html
- Amazon VPC Lattice User Guide: Sharing VPC Lattice entities - https://docs.aws.amazon.com/vpc-lattice/latest/ug/sharing.html
- AWS CloudFormation Template Reference: `AWS::VpcLattice::ServiceNetworkVpcAssociation` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-vpclattice-servicenetworkvpcassociation.html
- AWS CloudFormation Template Reference: `AWS::VpcLattice::AuthPolicy` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-vpclattice-authpolicy.html

## Issues Found
- The service network auth policy explanation said network policies are evaluated before service policies. AWS documents VPC Lattice authorization as evaluating the relevant auth policies together, with both auth policies and IAM identity policies needing explicit allows. Updated the wording.
- The VPC association security group example configured outbound HTTPS to `169.254.171.0/24` on the association security group. AWS documents association security groups as controlling which clients in a VPC can access the service network, with recommended inbound rules from client CIDRs; restrictive client security groups should allow outbound to the AWS-managed VPC Lattice prefix list. Updated the CLI example and explanatory text.
- The CloudFormation template repeated the same association security group egress issue. Replaced it with an ingress rule from a `ClientVpcCidr` parameter.
- The access logging description used informal field names and implied every request is logged only through service network logging. Updated the description to match documented VPC Lattice access log fields such as `sourceVpcId`, `sourceIpPort`, `serviceArn`, `responseCode`, `duration`, and `resolvedUser`.
- The DNS section said VPC Lattice automatically configures Route 53 Resolver rules for service names. Updated this to the more precise behavior: generated VPC Lattice service names resolve through the VPC DNS resolver to the VPC Lattice endpoint, while custom domains still require a DNS record.
- The CloudWatch example queried `ActiveConnectionCount` with a `ServiceNetworkId` dimension. AWS documents VPC Lattice metrics for services and target groups, not a `ServiceNetworkId` dimension; `ActiveConnectionCount` is a target group metric. Replaced the example with the service metric `TotalRequestCount` using the `Service` dimension.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against AWS official CLI and service documentation instead of local `--help` output.
- The custom domain section is broadly correct: VPC Lattice supports custom domains with ACM certificates, and DNS must map the custom domain to the generated VPC Lattice service domain. AWS documentation also notes Route 53 alias records as an option.
