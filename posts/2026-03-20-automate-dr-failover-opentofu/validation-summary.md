# Validation Summary: How to Automate DR Failover with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Amazon CloudWatch
- Amazon SNS
- AWS Lambda
- AWS Step Functions
- Amazon RDS
- Amazon EC2 Auto Scaling
- Amazon Route 53
- Application Load Balancer (ALB)

## Sources Consulted
- OpenTofu docs: Strings and Templates - https://opentofu.org/docs/language/expressions/strings/
- Elastic Load Balancing docs: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS Lambda docs: Invoking Lambda functions with Amazon SNS notifications - https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Amazon SNS docs: Subscribing a Lambda function to an Amazon SNS topic - https://docs.aws.amazon.com/sns/latest/dg/lambda-console.html
- Amazon Route 53 API Reference: ChangeResourceRecordSets - https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- Amazon Route 53 API Reference: GetChange - https://docs.aws.amazon.com/Route53/latest/APIReference/API_GetChange.html
- Amazon Route 53 Service Authorization Reference - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- Amazon RDS API Reference: PromoteReadReplica - https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_PromoteReadReplica.html
- Amazon RDS Service Authorization Reference - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html
- Amazon EC2 Auto Scaling API Reference: SetDesiredCapacity - https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_SetDesiredCapacity.html
- Amazon EC2 Auto Scaling Service Authorization Reference - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2autoscaling.html
- AWS Step Functions docs: Invoke an AWS Lambda function with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions docs: Handling errors in Step Functions workflows - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html

## Issues Found
- The post metadata and Step 1 heading referred to EventBridge, but the implementation shown used a CloudWatch alarm and an SNS-triggered Lambda. I updated the metadata and heading so the prose matches the code.
- The CloudWatch alarm used `GreaterThanThreshold` with a threshold of `0`, which would not alarm when healthy hosts dropped to zero. I changed it to `LessThanOrEqualToThreshold` and used the `Maximum` statistic so the example matches the stated intent of alarming only when no healthy hosts remain. The `Maximum` choice is an inference from the ALB metric semantics in the AWS documentation.
- The SNS subscription could race the Lambda permission during apply because the subscription did not depend on the resource-based policy that authorizes `sns.amazonaws.com` to invoke the function. I added an explicit `depends_on`.
- The Route 53 IAM statement incorrectly scoped `route53:GetChange` to a hosted zone ARN. I split the permissions so `ChangeResourceRecordSets` uses the hosted zone ARN and `GetChange` uses the Route 53 change ARN pattern.
- The Step Functions section read like the same end-to-end path as the earlier direct-Lambda example, but it actually modeled an alternative orchestration approach with task-specific Lambdas. I clarified that it is an optional runbook pattern.
- The summary claimed the Step Functions runbook handled retry logic, but the state machine definition had no `Retry` blocks. I added explicit retries to the Lambda task states so the code matches the explanation.

## Review Notes
- The ALB failover threshold is workload-specific. Using `HealthyHostCount` with the `Maximum` statistic is reasonable if the intent is to fail over only when no load balancer node reports a healthy target, but some teams may prefer `UnHealthyHostCount` or the ALB routing or DNS health metrics depending on how aggressively they want to trigger DR.
- The Step Functions example assumes the task-specific Lambda functions and the state machine execution role are defined elsewhere in the configuration with the permissions required to invoke those functions.
