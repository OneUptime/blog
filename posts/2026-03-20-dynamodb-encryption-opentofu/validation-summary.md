# Validation Summary: How to Configure DynamoDB Encryption with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS DynamoDB
- AWS Key Management Service (KMS)
- AWS Identity and Access Management (IAM)
- AWS CLI

## Sources Consulted
- Amazon DynamoDB Developer Guide: Encryption at Rest — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html
- Amazon DynamoDB Developer Guide: Encryption at Rest Usage Notes — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption.usagenotes.html
- Amazon DynamoDB Developer Guide: Managing Encrypted Tables — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption.tutorial.html
- AWS CLI Command Reference: `dynamodb update-table` — https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS KMS Developer Guide: Rotate AWS KMS keys — https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS Developer Guide: Default key policy — https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- Terraform Registry / AWS Provider: `aws_dynamodb_table` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform Registry / AWS Provider: `aws_kms_key` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Terraform Registry / AWS Provider: `aws_iam_role_policy` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy

## Issues Found
- The original KMS key policy example was not aligned with DynamoDB's documented authorization model. It granted an incomplete set of KMS actions directly to the DynamoDB service principal and relied on undeclared values. I removed the custom key policy from the key resource so the default KMS key policy can be used, which is valid as long as the deploying identity has the required IAM KMS permissions.
- The application IAM example granted only `kms:GenerateDataKey`, `kms:Decrypt`, and `kms:DescribeKey`, which is narrower than DynamoDB's documented minimum permission set for customer-managed keys. I updated the policy to include `kms:Encrypt`, `kms:Decrypt`, `kms:ReEncrypt*`, `kms:GenerateDataKey*`, `kms:DescribeKey`, and `kms:CreateGrant`.
- The original application IAM example granted KMS permissions directly on the key without constraining them to DynamoDB usage. I added a `kms:ViaService` condition so the role can use the key only through DynamoDB.
- The post used outdated/inconsistent CMK terminology in several places. I updated the wording to the current AWS terminology: customer-managed key / customer-managed KMS key.
- The conclusion overstated the permission model by saying applications need KMS permissions when using CMKs without clarifying who needs them. I corrected this to state that IAM principals that create or access the table need the DynamoDB and KMS permissions.

## Review Notes
- The `update-table --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=...` command is correct and AWS documents key changes for encrypted tables as seamless and not requiring downtime.
- DynamoDB server-side encryption is transparent to applications, so no application code changes are required to read or write encrypted table data.
- DynamoDB supports only symmetric KMS keys for table encryption. The `aws_kms_key` resource defaults to a symmetric encryption key, so the example remains valid without additional key-spec configuration.
