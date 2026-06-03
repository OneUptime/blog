# Validation Summary: How to Handle CodeDeploy Deployment Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS CodeDeploy
- AWS CLI
- CodeDeploy AppSpec files
- EC2 instance profiles and IAM roles
- Amazon S3 deployment artifacts
- CloudWatch alarms and CodeDeploy rollbacks
- Bash hook scripts

## Sources Consulted
- AWS CLI Command Reference: get-deployment - https://docs.aws.amazon.com/cli/latest/reference/deploy/get-deployment.html
- AWS CLI Command Reference: list-deployment-targets - https://docs.aws.amazon.com/cli/latest/reference/deploy/list-deployment-targets.html
- AWS CLI Command Reference: get-deployment-target - https://docs.aws.amazon.com/cli/latest/reference/deploy/get-deployment-target.html
- AWS CLI Command Reference: create-deployment - https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment.html
- AWS CLI Command Reference: update-deployment-group - https://docs.aws.amazon.com/cli/latest/reference/deploy/update-deployment-group.html
- AWS CLI Command Reference: stop-deployment - https://docs.aws.amazon.com/cli/latest/reference/deploy/stop-deployment.html
- AWS CodeDeploy User Guide: AppSpec file reference - https://docs.aws.amazon.com/codedeploy/latest/userguide/app-spec-ref.html
- AWS CodeDeploy User Guide: AppSpec file structure - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure.html
- AWS CodeDeploy User Guide: AppSpec hooks section - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CodeDeploy User Guide: AppSpec files section - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-files.html
- AWS CodeDeploy User Guide: Working with the CodeDeploy agent - https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent.html
- AWS CodeDeploy User Guide: View deployment details - https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-view-details.html
- Amazon EC2 User Guide: Retrieve security credentials from instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html

## Issues Found
- The deployment status list was incomplete. Added `Queued`, `Baking`, and `Ready` to match the current CodeDeploy deployment status values documented by AWS.
- The hook timeout example said the default was 5 minutes. For EC2/On-Premises CodeDeploy hooks, AWS documents the default as 3600 seconds, with 3600 seconds also being the maximum per lifecycle event. Updated the comment.
- The "file already exists" explanation was too broad. CodeDeploy's default `DISALLOW` behavior applies to files that already exist in the target location but were not part of the previous successful deployment. Updated the wording.
- The EC2 metadata command used an IMDSv1-only request. Updated it to use an IMDSv2 token so it works when IMDSv2 is required.

## Review Notes
The AWS CLI command structures, AppSpec examples, hook log paths, CodeDeploy agent log paths, rollback options, IAM role checks, and linked OneUptime URLs were otherwise consistent with current documentation. The local workspace did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference rather than local `aws help` output.
