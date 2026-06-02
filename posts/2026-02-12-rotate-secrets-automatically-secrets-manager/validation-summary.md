# Validation Summary: How to Rotate Secrets Automatically with Secrets Manager

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Secrets Manager
- AWS Lambda rotation functions
- Amazon RDS, Aurora, and Redshift database secret rotation
- AWS Serverless Application Repository
- AWS CLI
- Terraform AWS provider
- Python and boto3
- CloudWatch Logs

## Sources Consulted
- AWS Secrets Manager: Lambda rotation functions - https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager: Rotation by Lambda function - https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda.html
- AWS Secrets Manager: Rotation function templates - https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS Secrets Manager: JSON structure of Secrets Manager secrets - https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html
- AWS Secrets Manager: Network access for Lambda rotation functions - https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotation-function-network-access.html
- AWS CloudFormation: AWS::SecretsManager transform - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-secretsmanager.html
- AWS CloudFormation: HostedRotationLambda property - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-secretsmanager-rotationschedule-hostedrotationlambda.html
- AWS CLI: secretsmanager rotate-secret examples - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/rotate-secret.html
- AWS CLI: serverlessrepo create-cloud-formation-change-set - https://docs.aws.amazon.com/cli/latest/reference/serverlessrepo/create-cloud-formation-change-set.html
- Terraform AWS provider: aws_secretsmanager_secret_rotation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation

## Issues Found
- The introduction overclaimed that automatic rotation happens "without any application downtime." Updated it to say little or no downtime when applications handle the transition, matching the post's later single-user rotation caveat.
- The rotation-label explanation said Secrets Manager maintains only two versions. Updated it to describe staging labels and include `AWSPREVIOUS`, which AWS adds to the previous version after successful rotation.
- The AWS CLI section implied `rotate-secret` automatically creates the rotation Lambda. Updated it to clarify that the CLI attaches an existing Lambda ARN, while hosted functions can be created through the console or CloudFormation.
- The Serverless Application Repository example created only a CloudFormation change set. Added required capabilities for IAM/resource-policy resources and an `execute-change-set` step so the Lambda application is actually deployed.
- The Terraform networking note said the Lambda must be in the same VPC as the database. Updated it to the documented requirement: the rotation function needs network access to both the credential source and Secrets Manager, commonly via the database VPC and a Secrets Manager VPC endpoint for private RDS databases.
- The multi-user rotation CLI examples used `...` inside JSON strings, which made them invalid JSON. Replaced the placeholders with valid database secret JSON including `engine`, `host`, `port`, `dbname`, and `masterarn` where required.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference. The custom Python rotation template is syntactically plausible and follows the AWS four-step contract, but production code should add the confused-deputy checks AWS recommends for `setSecret` before modifying a target service.
