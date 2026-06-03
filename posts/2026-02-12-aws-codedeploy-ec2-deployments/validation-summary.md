# Validation Summary: How to Set Up AWS CodeDeploy for EC2 Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodeDeploy
- Amazon EC2
- AWS IAM roles and instance profiles
- Amazon S3 deployment bundles
- AWS CLI
- CodeDeploy AppSpec files
- CodeDeploy agent on Amazon Linux and Ubuntu
- CloudWatch alarm-triggered rollback

## Sources Consulted
- AWS CodeDeploy User Guide: Create a service role for CodeDeploy - https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-service-role.html
- AWS CodeDeploy User Guide: Create an IAM instance profile for your Amazon EC2 instances - https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html
- AWS CodeDeploy User Guide: Install the CodeDeploy agent for Amazon Linux or RHEL - https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent-operations-install-linux.html
- AWS CodeDeploy User Guide: Install the CodeDeploy agent for Ubuntu Server - https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent-operations-install-ubuntu.html
- AWS CodeDeploy User Guide: CodeDeploy AppSpec file reference - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file.html
- AWS CodeDeploy User Guide: AppSpec hooks section - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CodeDeploy User Guide: AppSpec permissions section - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-permissions.html
- AWS CLI Command Reference: create-deployment-group - https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment-group.html
- AWS CLI Command Reference: list-deployment-targets - https://docs.aws.amazon.com/cli/latest/reference/deploy/list-deployment-targets.html

## Issues Found
- The EC2 role setup referenced `ec2-trust.json` but did not show the trust policy. Added the EC2 assume-role trust policy so the `aws iam create-role` command has a valid input file.
- The EC2 S3 permissions policy was created but not attached to the EC2 role. Replaced the unattached managed-policy creation example with `aws iam put-role-policy`, matching AWS's documented instance-profile flow and ensuring the role actually receives S3 read permissions.
- The monitoring section used `aws deploy list-deployment-instances`, which is superseded by the deployment target API in current CodeDeploy references. Updated the command to `aws deploy list-deployment-targets`.
- The auto-rollback explanation implied generic health checks trigger rollback. Narrowed the statement to configured CloudWatch alarms, which matches the `DEPLOYMENT_STOP_ON_ALARM` rollback event shown in the command.

## Review Notes
The S3 permissions policy uses `"Resource": "*"`, which is valid and appears in AWS getting-started documentation, but a production setup should scope access to the application artifact bucket and the required regional CodeDeploy resource kit bucket. The agent status examples use `service`; AWS documentation currently shows `systemctl`, but `service codedeploy-agent status` remains a common compatibility wrapper on supported Linux distributions.
