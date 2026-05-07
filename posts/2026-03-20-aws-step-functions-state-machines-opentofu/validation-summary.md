# Validation Summary: How to Create AWS Step Functions State Machines with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Step Functions
- AWS Lambda
- AWS IAM
- Amazon CloudWatch Logs
- Amazon States Language (ASL)
- HCL

## Sources Consulted
- AWS Step Functions: Using CloudWatch Logs to log execution history in Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS Step Functions: Task workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions: Parallel workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/state-parallel.html
- AWS Step Functions: Using Amazon States Language to define Step Functions workflows - https://docs.aws.amazon.com/en_us/step-functions/latest/dg/concepts-amazon-states-language.html
- OpenTofu CLI docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- HashiCorp AWS provider docs: `aws_sfn_state_machine` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sfn_state_machine.html.markdown
- HashiCorp AWS provider docs: `aws_iam_role_policy` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy.html.markdown

## Issues Found
- The IAM policy example for Step Functions logging was incomplete. It originally granted only `logs:CreateLogDelivery`, `logs:PutLogEvents`, and `logs:GetLogDelivery`, which does not match AWS's documented permission set for CloudWatch Logs delivery from Step Functions. I updated the snippet to include the full set documented by AWS: `logs:CreateLogDelivery`, `logs:CreateLogStream`, `logs:GetLogDelivery`, `logs:UpdateLogDelivery`, `logs:DeleteLogDelivery`, `logs:ListLogDeliveries`, `logs:PutLogEvents`, `logs:PutResourcePolicy`, `logs:DescribeResourcePolicies`, and `logs:DescribeLogGroups`.

## Review Notes
- The `aws_sfn_state_machine` example is technically valid with `type = "STANDARD"` and `logging_configuration`; current AWS provider docs allow logging for both `STANDARD` and `EXPRESS` state machines.
- The log destination format is correct as written; the CloudWatch log group ARN must end with `:*`.
- The Lambda task examples are valid using direct Lambda function ARNs in the `Resource` field, although AWS now recommends the optimized `arn:aws:states:::lambda:invoke` integration for many Lambda use cases.
- The `tofu` binary is not installed in the local review environment, so the deploy commands were verified against official OpenTofu documentation rather than local `--help` output.
