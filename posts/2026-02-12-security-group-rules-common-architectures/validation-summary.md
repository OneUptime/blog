# Validation Summary: How to Configure Security Group Rules for Common Architectures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS security groups
- Amazon VPC
- Amazon EC2
- Amazon RDS
- AWS Lambda VPC networking
- Elastic Load Balancing, including Application Load Balancers and Network Load Balancers
- Amazon ECS on AWS Fargate
- AWS CLI
- AWS CloudFormation

## Sources Consulted
- AWS VPC User Guide: Security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS CLI Command Reference: authorize-security-group-ingress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: authorize-security-group-egress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- Amazon ECS API Reference: PortMapping: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html
- AWS CloudFormation Template Reference: AWS::EC2::SecurityGroup: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html
- Elastic Load Balancing documentation: Security groups for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-update-security-groups.html
- Elastic Load Balancing documentation: Security groups for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-security-groups.html
- Elastic Load Balancing API Reference: SetSecurityGroups: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_SetSecurityGroups.html

## Issues Found
- The introduction said every load balancer has at least one security group. This is not true for all Elastic Load Balancing types: Application Load Balancers use security groups, Network Load Balancers can have security groups if associated at creation, and Gateway Load Balancers cannot have security groups. Updated the sentence to refer to Application Load Balancers and Network Load Balancers with associated security groups.
- The fundamentals section described a default rule that denies inbound traffic. AWS documentation describes newly created security groups as having no inbound rules and a default outbound allow rule. Updated the wording to match the documented behavior.
- The microservices section called the security group rules a service mesh. Security group rules create a network-level allow list, not a service mesh in the usual technical sense. Updated the wording.
- The ECS Fargate section said Fargate uses dynamic port mapping and allowed ports 0-65535 from the ALB and self-referenced ECS security group. AWS ECS documentation says Fargate tasks use `awsvpc` networking, where `hostPort` is blank or the same as `containerPort`; dynamic host port assignment applies to bridge networking. Updated the explanation and rules to allow the registered container port, using 8080 as the example.

## Review Notes
The AWS CLI examples use current EC2 security group commands and supported options. The outbound DNS example is generally valid for DNS servers reached over the network, but AWS notes that security groups cannot block DNS requests to the AmazonProvidedDNS/Route 53 Resolver address; that caveat may be worth mentioning in a future broader revision.
