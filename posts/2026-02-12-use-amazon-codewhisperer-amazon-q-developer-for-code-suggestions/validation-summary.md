# Validation Summary: How to Use Amazon CodeWhisperer (Amazon Q Developer) for Code Suggestions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Q Developer
- Amazon CodeWhisperer
- AWS Builder ID
- AWS IAM Identity Center
- Visual Studio Code
- JetBrains IDEs
- Eclipse
- Visual Studio
- AWS Cloud9
- Python
- Boto3
- Amazon S3
- AWS Lambda
- Amazon SQS
- Amazon DynamoDB
- AWS CloudFormation
- Amazon Aurora PostgreSQL
- Terraform

## Sources Consulted
- Amazon Q Developer User Guide: Using Amazon Q Developer in the IDE - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE.html
- Amazon Q Developer User Guide: Installing the Amazon Q Developer extension or plugin in your IDE - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE-setup.html
- Amazon Q Developer User Guide: Using shortcut keys - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/actions-and-shortcuts.html
- Amazon Q Developer User Guide: Using code references - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/code-reference.html
- Amazon Q Developer User Guide: Starting a code review with Amazon Q Developer - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/start-review.html
- AWS Amazon Q Developer FAQs - https://aws.amazon.com/q/developer/faqs/
- Visual Studio Marketplace: Amazon Q extension - https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.amazon-q-vscode
- Boto3 documentation: S3 client upload_file - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/upload_file.html
- AWS Lambda Developer Guide: Handling errors for an SQS event source in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS CloudFormation Template Reference: AWS::RDS::DBCluster - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbcluster.html
- Python documentation: datetime - https://docs.python.org/3/library/datetime.html

## Issues Found
- The supported IDE list included Neovim but omitted Eclipse. Current Amazon Q Developer IDE documentation lists VS Code, JetBrains, Eclipse, and Visual Studio as supported IDEs, with inline suggestions also available in AWS coding environments such as Cloud9. Updated the list to include Eclipse and removed Neovim.
- The Lambda example used `datetime.utcnow()`, which is deprecated in Python 3.12+. Changed it to `datetime.now(timezone.utc).isoformat()` and imported `timezone`.
- The customization source list named CodeCommit and GitHub Enterprise via CodeStar connections as specific supported sources. Current Amazon Q Developer guidance describes connecting code repositories through the Amazon Q Developer console and uploaded code in S3, so the example was generalized to those current source categories.

## Review Notes
The examples are illustrative and omit deploy-time prerequisites such as IAM permissions, CloudFormation parameters, and enabling partial batch responses for Lambda SQS event source mappings. Those omissions are acceptable for this post's scope, but a future deep-dive tutorial should call them out explicitly.
