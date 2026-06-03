# Validation Summary: How to Build a Three-Tier Web Application on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS VPC
- AWS CloudFormation
- Amazon S3
- Amazon CloudFront
- Application Load Balancer
- Amazon ECS Fargate
- Amazon ECR
- AWS Systems Manager Parameter Store
- Amazon RDS for PostgreSQL
- Amazon ElastiCache for Redis OSS
- Application Auto Scaling
- Amazon CloudWatch

## Sources Consulted
- AWS CloudFormation `AWS::EC2::Subnet` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
- Amazon VPC internet gateway and subnet routing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC route table documentation: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html
- AWS CloudFormation `AWS::EC2::NatGateway` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
- AWS CLI `authorize-security-group-ingress` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS `awslogs` logging documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- AWS CLI `create-db-instance` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI `create-replication-group` documentation: https://docs.aws.amazon.com/cli/v1/reference/elasticache/create-replication-group.html
- AWS CLI `put-scaling-policy` documentation: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- Amazon ECS service auto scaling documentation: https://docs.aws.amazon.com/AmazonECS/latest/userguide/service-auto-scaling.html

## Issues Found
- The CloudFormation VPC snippet created public, private, and data subnets but did not define route tables, default routes, or subnet route table associations. Without a route to the internet gateway, the public subnets would not actually be public, and without a NAT route, the private ECS subnets would not have outbound internet access. Added public, private, and data route tables with the correct route table associations and default routes.
- The ECS Fargate task definition used a private ECR image, the `awslogs` log driver, and SSM Parameter Store secrets but did not specify an execution role. Added `executionRoleArn` and noted that the role must be able to pull the ECR image, write logs, and read the SSM parameters. Also noted that the `/ecs/app-tier` CloudWatch Logs log group should exist before the task runs.
- The RDS `create-db-instance` command specified `--storage-type gp3` without `--iops`. Current AWS CLI documentation states that `gp3` storage requires an IOPS value when explicitly specified, so `--iops 3000` was added.

## Review Notes
- The AWS CLI is not installed in this workspace, so command verification was done against official AWS CLI documentation rather than local `aws --help` output.
- The VPC template still uses one NAT gateway in one Availability Zone for simplicity. For a stricter production high-availability setup, use a NAT gateway per AZ and route each private subnet through the NAT gateway in the same AZ.
