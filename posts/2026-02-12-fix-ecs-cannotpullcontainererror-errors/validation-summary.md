# Validation Summary: How to Fix ECS 'CannotPullContainerError' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon ECR
- AWS IAM
- Amazon VPC networking and VPC endpoints
- AWS CLI
- Docker and Docker Hub
- AWS CloudFormation

## Sources Consulted
- Amazon ECR: Using Amazon ECR images with Amazon ECS - https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html
- Amazon ECS: Task execution IAM role - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECR: Private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR: Interface VPC endpoints (AWS PrivateLink) - https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon ECR: Identity-based policy examples - https://docs.aws.amazon.com/AmazonECR/latest/userguide/security_iam_id-based-policy-examples.html
- AWS CLI: ecr describe-images command reference - https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-images.html
- AWS CLI: ec2 describe-route-tables command reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CloudFormation: ECS AwsVpcConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-service-awsvpcconfiguration.html
- Docker Docs: Docker Hub pull usage and limits - https://docs.docker.com/docker-hub/usage/pulls/

## Issues Found
- The post implied that Fargate only needed generally correct IAM permissions. Changed this to specify that Fargate uses the task execution role, while EC2 launch type uses the container instance IAM role for ECR pulls.
- The debugging checklist only mentioned the task execution role. Updated it to distinguish Fargate from EC2 launch type.
- The NAT Gateway route-table command did not mention that `association.subnet-id` only finds explicit subnet route table associations. Added a note to also check the VPC main route table when the command returns nothing.
- The VPC endpoint section said all Fargate tasks need `ecr.api`, `ecr.dkr`, and `s3`. Updated it to match AWS documentation: ECS on EC2 and Fargate platform version `1.4.0` or later need both ECR endpoints plus S3, while Fargate platform version `1.3.0` or earlier needs only `ecr.dkr` plus S3.
- The summary said the checklist resolves the issue every time. Changed this to "most cases" because other registry, DNS, service, or environment-specific failures can also produce image pull errors.

## Review Notes
The remaining AWS CLI commands, IAM action names, ECR login command, ECR image URI format, security group guidance, cross-account repository policy example, Docker Hub unauthenticated rate limit, and internal OneUptime link were reviewed and found technically sound. For private subnet tasks that also use the `awslogs` log driver without internet access, a CloudWatch Logs VPC endpoint may also be required, but that is adjacent to image pulling rather than an ECR pull requirement.
