# Validation Summary: How to Build an Invoice Processing System with AWS Textract

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Textract AnalyzeExpense
- AWS Lambda
- AWS Step Functions
- Amazon S3 event notifications
- AWS CloudFormation
- Amazon DynamoDB
- Python

## Sources Consulted
- Amazon Textract AnalyzeExpense API Reference: https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html
- Amazon Textract Analyzing Invoices and Receipts: https://docs.aws.amazon.com/textract/latest/dg/invoices-receipts.html
- Amazon Textract Invoice and Receipt Response Objects: https://docs.aws.amazon.com/textract/latest/dg/expensedocuments.html
- Amazon Textract Processing Documents Synchronously: https://docs.aws.amazon.com/textract/latest/dg/sync.html
- Boto3 Textract analyze_expense reference: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/analyze_expense.html
- AWS CloudFormation AWS::S3::Bucket LambdaConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lambdaconfiguration.html
- AWS CloudFormation AWS::S3::Bucket NotificationConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-notificationconfiguration.html
- AWS Step Functions Choice workflow state: https://docs.aws.amazon.com/step-functions/latest/dg/awl-ref-states-choice.html
- OneUptime homepage: https://oneuptime.com/

## Issues Found
- The CloudFormation S3 notification example referenced an undefined `InvoiceTriggerLambda` resource and used a fixed bucket name that would not be globally unique. I changed it to accept an existing Lambda ARN as a parameter, added the required `AWS::Lambda::Permission`, added `DependsOn`, and made the bucket name account/region-scoped with `!Sub`.
- The normalization example used `EXPENSE_ROW_AMOUNT`, which is not a documented AnalyzeExpense line-item normalized field. I changed line-item amount extraction to use `PRICE`, which AWS documents as the line item total price.
- The Step Functions example compared `validationErrors` to the string `"[]"`, but `validationErrors` is produced as an array. I added a boolean `hasValidationErrors` in the normalization output and updated the Choice state to use `BooleanEquals`.
- The Step Functions workflow checked for duplicates after auto-approving and storing the invoice. I moved duplicate detection before the confidence/approval decision and included its result in the approval Choice state.
- The sample Lambda ARNs used a 9-digit account id. I changed them to a 12-digit placeholder account id.
- The duplicate detection Lambda called `abs_date_diff` without defining it. I added a small ISO date helper so the example runs as shown.
- The OneUptime link pointed to an unrelated resume parser article. I changed it to the OneUptime homepage, which matches the monitoring claim in the sentence.

## Review Notes
- The Textract `AnalyzeExpense` API usage and response traversal are consistent with AWS documentation for synchronous invoice and receipt analysis. For multi-page or larger document workflows, AWS documents the asynchronous `StartExpenseAnalysis` and `GetExpenseAnalysis` APIs as the appropriate path.
- The Python examples were syntax-checked locally, and the Step Functions definition was parsed as valid JSON after the fixes.
