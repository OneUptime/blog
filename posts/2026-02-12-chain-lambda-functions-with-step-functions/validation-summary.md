# Validation Summary: How to Chain Lambda Functions with Step Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- AWS Lambda
- Amazon States Language
- AWS CloudFormation
- AWS IAM
- AWS CLI
- AWS SDK for JavaScript v3
- Node.js Lambda handlers

## Sources Consulted
- AWS Step Functions Developer Guide: state machines and workflow states - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-statemachines.html
- AWS Step Functions Developer Guide: Lambda integration - https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions Developer Guide: error handling with Retry and Catch - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS Step Functions Developer Guide: Inline Map state fields - https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions Developer Guide: input and output processing - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-input-output-filtering.html
- AWS Step Functions Developer Guide: Standard vs Express workflows - https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS CLI Command Reference: stepfunctions start-execution - https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/start-execution.html
- AWS CLI Command Reference: stepfunctions list-executions - https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/list-executions.html
- AWS CloudFormation Template Reference: AWS::StepFunctions::StateMachine - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-stepfunctions-statemachine.html
- AWS SDK for JavaScript v3 Lambda InvokeCommand examples - https://docs.aws.amazon.com/code-library/latest/ug/javascript_3_lambda_code_examples.html

## Issues Found
- The Map state example used the deprecated `Iterator` field. Updated it to the current `ItemProcessor` form with `ProcessorConfig.Mode` set to `INLINE`, matching current Step Functions documentation.
- The `aws stepfunctions list-executions` example used `--max-results 10`, which is not a valid AWS CLI option for this paginated command. Changed it to `--max-items 10`.
- The CloudFormation section called the excerpt a "full CloudFormation template" even though the referenced Lambda function resources are not included. Changed the wording to "CloudFormation snippet" so readers do not expect the excerpt to deploy by itself.

## Review Notes
- The state machine examples use direct Lambda ARNs, which remain valid. The optimized Lambda service integration is also available, but using it would change the task output shape, so the post's examples are internally consistent.
- The JavaScript Lambda examples are illustrative and syntactically valid, but `processPayment` is assumed to be an application-provided helper.
