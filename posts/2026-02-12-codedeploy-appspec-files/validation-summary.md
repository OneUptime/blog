# Validation Summary: How to Create CodeDeploy AppSpec Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeDeploy
- CodeDeploy AppSpec files
- EC2/On-Premises deployments
- Amazon ECS blue/green deployments
- AWS Lambda deployments
- YAML and JSON configuration
- Bash lifecycle hook scripts

## Sources Consulted
- AWS CodeDeploy AppSpec file reference: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file.html
- AWS CodeDeploy application specification files: https://docs.aws.amazon.com/codedeploy/latest/userguide/application-specification-files.html
- AWS CodeDeploy AppSpec file structure: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure.html
- AWS CodeDeploy AppSpec `files` section: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-files.html
- AWS CodeDeploy AppSpec `permissions` section: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-permissions.html
- AWS CodeDeploy AppSpec `hooks` section: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CodeDeploy AppSpec `resources` section: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-resources.html
- AWS CodeDeploy AppSpec examples: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-example.html
- AWS CodeDeploy deployment logs: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-view-logs.html
- Referenced OneUptime ECS guide: https://oneuptime.com/blog/post/2026-02-12-codedeploy-ecs-deployments/view
- Referenced OneUptime Lambda guide: https://oneuptime.com/blog/post/2026-02-12-codedeploy-lambda-deployments/view
- OneUptime homepage: https://oneuptime.com

## Issues Found
- The post said the AppSpec file can generally be named `appspec.yml` or `appspec.json`. AWS requires EC2/On-Premises AppSpec files to be YAML named `appspec.yml`; ECS and Lambda AppSpec content can be YAML or JSON. Updated the wording to be platform-specific.
- The `files` section said destination files are overwritten during Install. AWS defaults to failing when unmanaged files already exist at a destination unless `file_exists_behavior` or equivalent API/CLI behavior is set. Updated the claim to distinguish managed previous deployment files from unmanaged existing files.
- The lifecycle diagram was described as the full in-place lifecycle, but in-place deployments can include load balancer traffic hooks. Updated the wording to say it is the basic lifecycle without load balancer traffic hooks.
- The hook entry description said each hook script takes three parameters. AWS requires `location`; `timeout` and `runas` are optional. Updated the wording.
- The ECS task definition ARN used `task-definition/myapp:5` with a 9-digit account ID. Updated it to a valid 12-digit-account ARN shape matching AWS examples.
- The JSON section showed an EC2-style AppSpec JSON example, but EC2/On-Premises AppSpec files must be YAML. Replaced it with a Lambda JSON AppSpec example.
- The common mistakes section stated `appspec.yml` as an unconditional filename rule. Updated it to clarify this rule applies to EC2/On-Premises deployments.
- The intro described agent-based file copy, permissions, and scripts as applying to every CodeDeploy deployment. AWS documents that the CodeDeploy agent is not used for Lambda or ECS deployments. Updated the intro to separate EC2/On-Premises behavior from ECS/Lambda behavior.
- The Lambda section said the AppSpec file defines the traffic shifting strategy. AWS CodeDeploy deployment configurations control the rate of traffic shifting; the AppSpec identifies the function versions and validation hooks. Updated that wording.
- The production tips recommended `ValidateService` without platform scope. That hook is an EC2/On-Premises lifecycle hook, so the recommendation now says it applies to EC2/On-Premises deployments.

## Review Notes
The remaining examples are illustrative and assume the target instance already has the required OS users, services, Node.js tooling, and permissions. The bash examples are syntactically valid, but production deployments should also account for environment-specific service names, working directories, dependency installation behavior, and rollback strategy. Referenced OneUptime links resolved successfully during review.
