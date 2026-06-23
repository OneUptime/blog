# Validation Summary: How to Fix JSON Parsing Errors in AWS Step Functions

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- AWS Step Functions
- Amazon States Language (ASL)
- Terraform HCL
- Terraform `jsonencode()`
- AWS CLI
- JSONPath

## Sources Consulted
- AWS Step Functions Developer Guide: Amazon States Language overview: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html
- AWS Step Functions Developer Guide: State machine structure: https://docs.aws.amazon.com/step-functions/latest/dg/statemachine-structure.html
- AWS Step Functions Developer Guide: Map state in Inline mode: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions Developer Guide: Choice state: https://docs.aws.amazon.com/step-functions/latest/dg/state-choice.html
- AWS Step Functions Developer Guide: JSONPath paths: https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-paths.html
- AWS Step Functions API Reference: ValidateStateMachineDefinition: https://docs.aws.amazon.com/step-functions/latest/apireference/API_ValidateStateMachineDefinition.html
- AWS CLI Command Reference: `validate-state-machine-definition`: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/validate-state-machine-definition.html
- Terraform documentation: `jsonencode` function: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform documentation: strings and templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform documentation: `timestamp` function: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform AWS Provider documentation: `aws_sfn_state_machine`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sfn_state_machine
- Amazon States Language specification: https://states-language.net/

## Issues Found
- Corrected the JSONPath section comment that said to use `$$` for a literal `$`. In Step Functions, `.$` marks dynamic JSONPath-valued fields, and `$$` is used for the Step Functions context object.
- Replaced `timestamp()` in a state machine definition example with a fixed RFC 3339 timestamp. Terraform documents that `timestamp()` changes on every run and is not recommended directly in resource attributes.
- Updated the Map state example from deprecated `Iterator` to `ItemProcessor` with `ProcessorConfig.Mode = "INLINE"`, matching current Step Functions guidance.
- Clarified the Wait state timestamp comment to show the RFC 3339-style timestamp format expected by Step Functions.
- Replaced outdated AWS CLI validation guidance with `aws stepfunctions validate-state-machine-definition`, which validates an ASL definition without creating a state machine.
- Corrected the common validation error note for state names. ASL state names must be unique and no more than 80 Unicode characters; the stricter special-character limits apply to Step Functions resource names, not ASL state names.
- Corrected the "End or Next" validation note to account for Choice, Succeed, and Fail state exceptions.

## Review Notes
Terraform and AWS CLI were not installed in the local environment, so command behavior was verified against official documentation rather than local CLI help. The examples remain illustrative and rely on placeholder Lambda, IAM role, and state machine resources being defined elsewhere.
