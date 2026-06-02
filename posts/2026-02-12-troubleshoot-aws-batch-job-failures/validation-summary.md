# Validation Summary: How to Troubleshoot AWS Batch Job Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Batch
- AWS CLI
- Amazon CloudWatch Logs
- Amazon EC2
- Amazon ECR
- Amazon ECS
- IAM
- Docker containers
- Linux process exit codes

## Sources Consulted
- AWS CLI Command Reference: `batch describe-jobs` - https://docs.aws.amazon.com/cli/latest/reference/batch/describe-jobs.html
- AWS CLI Command Reference: `batch describe-compute-environments` - https://docs.aws.amazon.com/cli/latest/reference/batch/describe-compute-environments.html
- AWS CLI Command Reference: `batch register-job-definition` - https://docs.aws.amazon.com/cli/latest/reference/batch/register-job-definition.html
- AWS Batch User Guide: Jobs stuck in a RUNNABLE status - https://docs.aws.amazon.com/batch/latest/userguide/job_stuck_in_runnable.html
- AWS Batch User Guide: Common errors and troubleshooting - https://docs.aws.amazon.com/batch/latest/userguide/bestpractice7.html
- AWS Batch User Guide: AWS Batch IAM execution role - https://docs.aws.amazon.com/batch/latest/userguide/execution-IAM-role.html
- AWS Batch API Reference: ContainerProperties - https://docs.aws.amazon.com/batch/latest/APIReference/API_ContainerProperties.html
- Amazon ECR User Guide: Using Amazon ECR images with Amazon ECS - https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html
- Amazon ECR User Guide: Amazon ECR interface VPC endpoints - https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon EC2 User Guide: Amazon EC2 service quotas - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html

## Issues Found
- The Service Quotas example used quota code `L-1216C47A` but described it generically as an instance-family limit. Updated the text to identify it as the On-Demand Standard EC2 vCPU quota and clarified that Batch is constrained by the relevant EC2 vCPU quota for the instance class being used.
- The exit code 137 section stated that 137 always means an OOM kill. Updated it to state that 137 means SIGKILL and that OOM is a common cause in Batch jobs.
- The ECR permissions section said only the instance role needs ECR pull permissions. Updated it to distinguish EC2 jobs, where the container instance role is used, from Fargate jobs, where the execution role is used.
- The ECR IAM snippet omitted `ecr:BatchCheckLayerAvailability`, which is included in AWS's task execution role policy for pulling ECR images. Added the missing action.
- The private subnet section implied a NAT Gateway is the only way to reach ECR. Updated it to also account for the required VPC endpoints.
- The timeout section said Batch does not have a built-in timeout. Updated it to say Batch has a built-in timeout for job attempts, matching the `--timeout` example already shown.

## Review Notes
The remaining AWS CLI commands and queried response fields match current AWS CLI and AWS Batch documentation. The post primarily covers AWS Batch jobs on ECS/EC2 resources; some behavior can differ for EKS or Fargate jobs, especially around log fields, roles, networking, and resource constraints.
