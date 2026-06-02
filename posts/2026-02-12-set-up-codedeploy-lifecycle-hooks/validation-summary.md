# Validation Summary: How to Set Up CodeDeploy Lifecycle Hooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeDeploy
- CodeDeploy AppSpec files
- EC2/on-premises deployments
- Amazon ECS blue/green deployments
- AWS Lambda lifecycle validation hooks
- AWS CLI for Elastic Load Balancing v2 and Systems Manager Parameter Store
- Bash deployment scripts
- Python Lambda function with boto3

## Sources Consulted
- AWS CodeDeploy User Guide: AppSpec 'hooks' section - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CodeDeploy User Guide: AppSpec file structure - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure.html
- AWS CodeDeploy User Guide: AppSpec file example - https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-example.html
- AWS CodeDeploy User Guide: Deployments on an Amazon ECS Compute Platform - https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-steps-ecs.html
- AWS CodeDeploy User Guide: CodeDeploy application specification files - https://docs.aws.amazon.com/codedeploy/latest/userguide/application-specification-files.html
- AWS CodeDeploy User Guide: Troubleshoot EC2/On-Premises deployment issues - https://docs.aws.amazon.com/codedeploy/latest/userguide/troubleshooting-deployments.html
- AWS CodeDeploy User Guide: Redeploy and roll back a deployment with CodeDeploy - https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html
- AWS CodeDeploy API Reference: PutLifecycleEventHookExecutionStatus - https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_PutLifecycleEventHookExecutionStatus.html
- AWS CLI Command Reference: elbv2 describe-target-health - https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html

## Issues Found
- The post said hook failures stop and roll back deployments unconditionally. AWS documents rollbacks as automatic only when configured, or manual via redeployment, so the wording now says failed hooks can roll back when rollback is configured.
- The EC2/on-premises lifecycle was described as complete but omitted the load-balancer traffic hooks. The lifecycle description now scopes the diagram to a basic in-place deployment and notes the additional `BeforeBlockTraffic`, `AfterBlockTraffic`, `BeforeAllowTraffic`, and `AfterAllowTraffic` hooks.
- The EC2 AppSpec ran scripts that call `systemctl` and write root-owned locations as `appuser`. The AppSpec now runs those hooks as `root`, and the `sudo` calls in the start script were removed to match that execution context.
- The `ApplicationStop` script used `aws elbv2 describe-target-health` without the required `--target-group-arn` argument and queried a field that is not returned by that API. It now reads the target group ARN from the same SSM parameter used by the validation script and passes it to `deregister-targets`.
- The backup cleanup command could fail when no previous backup directories matched the glob. It now suppresses the missing-match error and uses `xargs -r`.
- The scripts referenced `appgroup` in AppSpec permissions and `chown` without creating it. The `BeforeInstall` script now creates the system group before creating `appuser`.
- The `AfterInstall` script unconditionally ran `chmod` on `config/active.json`, which could fail if no environment-specific config was present. It now checks that the file exists first.
- The ECS lifecycle diagram labeled the `Install` event as routing to green, but AWS documents `Install` as setting up the replacement task set; routing happens in `AllowTestTraffic` and `AllowTraffic`. The label now says it creates the green task set.
- The best-practices section implied `ApplicationStop` runs on the first deployment. It now states that CodeDeploy does not run `ApplicationStop` on the first deployment to an instance.

## Review Notes
The examples assume an Amazon Linux or RHEL-style package manager (`yum`), systemd, an instance role that can read the SSM parameter and register/deregister targets, and instance metadata access. In a production hardening pass, the metadata calls could be updated for IMDSv2-only instances.
