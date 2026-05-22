# Validation Summary: How to Set Up Scheduled Terraform Plans for Drift Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- GitHub Actions scheduled workflows
- GitLab CI scheduled pipelines
- AWS EventBridge
- AWS CodeBuild
- AWS SNS
- AWS S3
- Python with boto3
- Bash

## Sources Consulted
- HashiCorp Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- GitHub Actions workflow syntax and scheduled events documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions events that trigger workflows documentation: https://docs.github.com/actions/reference/events-that-trigger-workflows
- GitHub Actions troubleshooting documentation for delayed scheduled workflows: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows
- GitHub Actions workflow disablement documentation: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
- hashicorp/setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- aws-actions/configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials
- GitLab scheduled pipelines documentation: https://docs.gitlab.com/ci/pipelines/schedules/
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild project source and buildspec documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html
- AWS EventBridge targets documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- Terraform AWS provider `aws_cloudwatch_event_target` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_codebuild_project` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project
- AWS CLI `sns publish` command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/publish.html
- boto3 S3 client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html

## Issues Found
- The post described the AWS option as "EventBridge with Lambda", but the example configures EventBridge to trigger CodeBuild directly. Updated the description, section heading, and intro sentence to match the actual architecture.
- The GitHub Actions quirks section claimed high-load scheduled workflow delays are "up to 15 minutes". GitHub's documentation warns that scheduled events can be delayed during high load but does not document that specific bound. Removed the unsupported limit.
- The keep-alive workflow comment implied that a monthly scheduled workflow alone works around public repository schedule disablement after 60 days of inactivity. GitHub documents the disablement as based on repository activity, so the comment now states that repository activity is still required.
- The GitLab CI example captured `tee`'s exit code instead of Terraform's `-detailed-exitcode` result. Updated the snippet to use Bash and `${PIPESTATUS[0]}`.
- The GitLab CI example used the `hashicorp/terraform` image without clearing its Terraform entrypoint. Added `entrypoint: [""]` so GitLab can run shell scripts normally.
- The GitLab CI example only wrote `drift.env` when drift was found and did not fail on Terraform plan errors. Updated it to initialize the dotenv file, write false on no drift, and exit non-zero on plan errors.
- The GitLab CI dotenv file was created after `cd terraform`, but `artifacts:reports:dotenv` references paths from the project directory. Updated the script to write `../drift.env`.
- The CodeBuild buildspec captured `tee`'s exit code instead of Terraform's detailed exit code. Added `env.shell: bash`, used `${PIPESTATUS[0]}`, and made non-zero non-drift plan errors fail the build.
- The Python dashboard divided by zero when no drift result objects were found. Added an empty-result guard.
- The noise-filtering example implied that grepping plan text filters expected drift. Terraform would still return exit code 2 for changes, and the original pipeline also lost Terraform's exit code. Updated the wording and command to filter notification text while preserving Terraform's exit code.

## Review Notes
- The examples pin Terraform 1.7.0 and older major versions of some GitHub Actions. They remain valid examples, but teams should periodically update pinned versions after testing.
- The AWS CodeBuild example assumes the referenced IAM roles, SNS topic, S3 bucket, and GitHub source connection already exist and have appropriate permissions.
