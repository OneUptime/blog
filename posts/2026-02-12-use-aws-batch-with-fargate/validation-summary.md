# Validation Summary: How to Use AWS Batch with Fargate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch
- AWS Fargate
- AWS Fargate Spot
- AWS IAM roles
- AWS CLI
- Amazon ECR
- Amazon CloudWatch Logs
- Amazon VPC endpoints
- Amazon S3

## Sources Consulted
- AWS Batch User Guide: Compute environments on Fargate - https://docs.aws.amazon.com/batch/latest/userguide/fargate-compute-environments.html
- AWS Batch User Guide: Job definitions on Fargate - https://docs.aws.amazon.com/batch/latest/userguide/fargate-job-definitions.html
- AWS Batch User Guide: Job queues on Fargate - https://docs.aws.amazon.com/batch/latest/userguide/fargate-job-queues.html
- AWS Batch User Guide: Job definition parameters for ContainerProperties - https://docs.aws.amazon.com/batch/latest/userguide/job_definition_parameters.html
- AWS Batch API Reference: EphemeralStorage - https://docs.aws.amazon.com/batch/latest/APIReference/API_EphemeralStorage.html
- AWS CLI Command Reference: aws batch create-compute-environment - https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
- AWS CLI Command Reference: aws batch register-job-definition - https://docs.aws.amazon.com/cli/latest/reference/batch/register-job-definition.html
- AWS Batch User Guide: Considerations for AWS Batch VPC endpoints - https://docs.aws.amazon.com/batch/latest/userguide/vpc-endpoint-considerations.html
- Amazon ECR User Guide: Amazon ECR interface VPC endpoints - https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html

## Issues Found
- The post implied EC2 is better whenever you want Spot cost savings, even though AWS Batch supports Fargate Spot. Changed the wording to refer specifically to EC2 Spot Instances or more direct Spot capacity control.
- The CloudWatch Logs example configured an `awslogs` log group but did not create the log group or enable automatic log group creation. Added an `aws logs create-log-group` command before registering the job definition.
- The Fargate CPU and memory table used broad ranges that could imply invalid values, such as unsupported intermediate memory sizes. Updated the table to show the supported memory increments for each vCPU size.
- The ephemeral storage section said 20 GB by default and up to 200 GB. Updated it to use GiB and state that configurable increased ephemeral storage is 21 GiB through 200 GiB.
- The private networking example created only the ECR Docker endpoint and S3 gateway endpoint. For current Fargate platform versions and `awslogs`, private subnets also need the ECR API endpoint and CloudWatch Logs endpoint. Added both endpoint commands.

## Review Notes
The remaining examples are intentionally placeholder-based and require real subnet IDs, security group IDs, account IDs, repository names, route table IDs, and bucket names. For production use, users should also ensure endpoint security groups allow inbound HTTPS from the task subnets and should tailor IAM permissions to the exact services their job containers access.
