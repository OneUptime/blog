# Validation Summary: How to Optimize EC2 Costs with Instance Scheduler

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Instance Scheduler on AWS
- Amazon EC2
- Amazon EC2 Auto Scaling groups
- Amazon RDS
- AWS Lambda
- Amazon EventBridge
- Amazon DynamoDB
- AWS CloudFormation
- AWS Systems Manager maintenance windows
- Amazon CloudWatch Logs and alarms
- AWS CLI and Instance Scheduler CLI

## Sources Consulted
- AWS Instance Scheduler on AWS solution overview: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/solution-overview.html
- AWS Instance Scheduler on AWS architecture: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/architecture.html
- AWS Instance Scheduler on AWS CloudFormation template guide: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/aws-cloudformation-templates.html
- AWS Instance Scheduler hub stack launch parameters: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/step-1-launch-the-instance-scheduler-hub-stack.html
- AWS Instance Scheduler CLI documentation: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/scheduler-cli-4.html
- AWS Instance Scheduler schedule reference: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/schedule-reference.html
- AWS Instance Scheduler period reference: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/period-reference.html
- AWS Instance Scheduler sample schedules: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/sample-schedules.html
- AWS Instance Scheduler monitoring guide: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/monitor-the-solution.html
- Current AWS Solution CloudFormation template: https://s3.amazonaws.com/solutions-reference/instance-scheduler-on-aws/latest/instance-scheduler-on-aws.template
- Current AWS Solution Scheduler CLI package: https://s3.amazonaws.com/solutions-reference/instance-scheduler-on-aws/latest/instance_scheduler_cli.zip

## Issues Found
- The architecture description was outdated. The current solution uses an EventBridge rule to invoke orchestration and scheduling Lambda functions, stores schedules in a configuration table, and tracks tagged resources through registry/state tables. Updated the description and diagram.
- The deployment options described building the same Lambda logic with CDK/Terraform. AWS documents the solution CloudFormation template and CloudFormation custom resources for schedule management, so the wording was corrected.
- The CloudFormation command included the obsolete `ScheduledServices` parameter, used low memory values, omitted the orchestrator memory parameter, and used `CAPABILITY_IAM` despite named IAM roles in the current template. Updated the parameters and capability flag.
- The Scheduler CLI install command used a plain PyPI package name. AWS currently documents downloading the solution CLI package and installing with `pip install --no-index --find-links=...`, so the install snippet was corrected.
- The always-on schedule command attempted to create a schedule with `--periods "running"`, but the CLI supports built-in override schedules such as `Running`; `running` is not a period. Replaced it with a verification command for the built-in `Running` schedule.
- The verification section used older hard-coded Lambda log group and DynamoDB table names. Updated the log group name for the default current stack layout and changed the DynamoDB scan example to resolve the generated `StateTable` physical name from CloudFormation.
- The SSM Parameter Store maintenance example was nonfunctional because Instance Scheduler schedules do not read an arbitrary Parameter Store flag. Replaced it with the documented Systems Manager maintenance window schedule option.
- The monitoring alarm targeted a hard-coded Lambda function name that does not represent the current scheduling Lambda functions. Replaced it with a CloudWatch Logs metric filter and alarm on the solution scheduling log group.
- The final cost statement said solution overhead was only a few cents per month. AWS currently estimates about $13.15 per month for the default deployment in US East (N. Virginia), so the statement was corrected.

## Review Notes
The cost savings math is internally consistent for the example: 20 instances at $0.20/hour for 730 always-on hours is $2,920/month, and 220 scheduled hours is $880/month. The exact savings still depend on instance pricing, region, scheduler configuration, and whether stopped instances retain billable resources such as EBS volumes.
