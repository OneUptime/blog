# Validation Summary: How to Create App Runner with Custom VPC in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS App Runner
- AWS VPC
- AWS NAT Gateway and route tables
- AWS IAM
- Amazon ECR
- AWS Secrets Manager
- Amazon RDS for PostgreSQL
- Amazon ElastiCache for Redis

## Sources Consulted
- AWS App Runner Developer Guide: Enabling VPC access for outgoing traffic: https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html
- AWS App Runner Developer Guide: Referencing environment variables: https://docs.aws.amazon.com/apprunner/latest/dg/env-variable.html
- Terraform AWS Provider: aws_apprunner_service: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_service
- Terraform AWS Provider: aws_apprunner_vpc_connector: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_vpc_connector
- Terraform AWS Provider: aws_apprunner_auto_scaling_configuration_version: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apprunner_auto_scaling_configuration_version
- Terraform AWS Provider: aws_elasticache_cluster: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- AWS VPC User Guide: Subnet route tables: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- AWS VPC User Guide: Connect to the internet or other networks using NAT devices: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat.html
- Amazon RDS User Guide: Settings for DB instances: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.Settings.html
- Terraform AWS Provider: aws_db_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The VPC snippet referenced `data.aws_availability_zones.available.names` without declaring the `aws_availability_zones` data source. Added the missing data source so the subnet examples are syntactically complete.
- The NAT gateway was placed in a public subnet, but the public subnets did not have a route table with a default route to the internet gateway. Added a public route table and route table associations so the NAT gateway subnet is actually public.
- The NAT gateway did not explicitly depend on the internet gateway. Added `depends_on = [aws_internet_gateway.main]` to avoid ordering issues during creation.
- The App Runner `ingress_configuration` comment said it configured private access while `is_publicly_accessible = true` makes the service public. Updated the comment to match the configuration.
- The subnet comment said at least two AZs were recommended for the VPC connector. AWS documentation recommends using multiple AZs and specifically recommends three where available, so the wording was changed to avoid an inaccurate fixed recommendation.

## Review Notes
- The App Runner VPC connector configuration is for outbound traffic from the service to the VPC. AWS documents that inbound traffic and App Runner-managed traffic such as image pulls, logs, and secret retrieval are not routed through the VPC connector.
- The Terraform snippets still assume supporting resources such as the ECR repository, Secrets Manager secrets, and `var.db_password` are defined elsewhere.
- For higher availability, production VPC designs commonly use private subnets and NAT gateways across more Availability Zones than this compact example shows.
