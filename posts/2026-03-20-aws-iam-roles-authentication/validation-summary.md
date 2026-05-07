# Validation Summary: How to Authenticate with AWS Using IAM Roles

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS IAM roles
- Amazon EC2
- AWS CLI
- EC2 Instance Metadata Service (IMDS)
- OpenTofu
- HCL
- AWS Lambda
- Amazon ECS

## Sources Consulted
- AWS CLI `create-role` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS CLI `attach-role-policy` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/attach-role-policy.html
- AWS CLI `create-instance-profile` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-instance-profile.html
- AWS CLI `run-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- IAM User Guide, `Use instance profiles`: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html
- IAM User Guide, `Use an IAM role to grant permissions to applications running on Amazon EC2 instances`: https://docs.aws.amazon.com/IAM/latest/UserGuide/roles-usingrole-ec2instance.html
- EC2 User Guide, `Retrieve security credentials from instance metadata`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html
- EC2 User Guide, `Access instance metadata for an EC2 instance`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- EC2 User Guide, `Use the Instance Metadata Service to access instance metadata`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS CLI User Guide, `Using Amazon EC2 instance metadata as credentials in the AWS CLI`: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-metadata.html
- AWS Lambda Developer Guide, `Defining Lambda function permissions with an execution role`: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- Amazon ECS Developer Guide, `Amazon ECS environment variables`: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-environment-variables.html
- Amazon ECS Developer Guide, `Amazon ECS task IAM role`: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- AWS managed policy reference, `AmazonS3ReadOnlyAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonS3ReadOnlyAccess.html
- OpenTofu resource syntax: https://opentofu.org/docs/language/resources/syntax/
- Terraform Registry, `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform Registry, `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The introduction said EC2, Lambda, and ECS assume roles automatically through instance metadata. That is only accurate for EC2. I changed the wording so IMDS is scoped to EC2, while Lambda and ECS are described more generally as receiving role credentials automatically.
- The EC2 launch example used a specific AMI ID without any region caveat. AMIs are region-specific, so I replaced it with a documented placeholder-style AMI ID and added a note to use an AMI that exists in the target Region.
- The OpenTofu example referenced `data.aws_ami.amazon_linux.id` without defining that data source, so the snippet was not self-contained. I replaced it with the same placeholder-style AMI value and added a note to swap it for a Region-valid AMI.
- The instance verification example used a plain metadata `curl` request that assumes IMDSv1 is available. AWS now documents IMDSv2 token usage explicitly, so I updated the snippet to request a token first and then call the metadata endpoint with the required header.
- The summary implied IAM-role credentials are delivered through instance metadata in general. I corrected that explanation so instance metadata is described specifically as the EC2 delivery mechanism.

## Review Notes
- The `run-instances` example remains a minimal example and assumes EC2 launch defaults such as a usable default subnet in the selected Region, which matches AWS CLI documentation examples.
- The post is still primarily an EC2-focused guide; Lambda and ECS are mentioned conceptually rather than demonstrated with their own code examples.
- The review was documentation-based. No live AWS account execution was performed in this environment.
