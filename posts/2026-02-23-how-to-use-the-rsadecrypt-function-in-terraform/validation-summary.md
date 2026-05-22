# Validation Summary: How to Use the rsadecrypt Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform configuration language
- Terraform `rsadecrypt` function
- HashiCorp AWS provider
- HashiCorp TLS provider
- AWS EC2 Windows password retrieval
- AWS Secrets Manager
- Terraform S3 backend

## Sources Consulted
- Terraform `rsadecrypt` function documentation: https://developer.hashicorp.com/terraform/language/functions/rsadecrypt
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS EC2 `GetPasswordData` API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetPasswordData.html
- Terraform TLS provider `tls_private_key` documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key.html
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/block/output
- Terraform AWS provider `aws_secretsmanager_secret_version` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version

## Issues Found
- The introductory `rsadecrypt` example used bare placeholder identifiers (`base64_encoded_ciphertext`, `private_key_pem`) that are not valid Terraform variable references. Updated the example to use `var.base64_encoded_ciphertext` and `file(var.private_key_path)`.
- The description of `rsadecrypt` did not state that the PEM private key must be unencrypted, which is required by Terraform. Updated the description and syntax notes.
- The post described PKCS#1 v1.5 padding as "the standard RSA encryption scheme." Updated this to the more precise official requirement that the ciphertext must use PKCS#1 v1.5 padding.
- The waiting guidance implied Terraform may need a separate wait even though the AWS provider waits for password data when `get_password_data = true`. Clarified that the create timeout should allow enough time for that wait.
- The AWS Secrets Manager section could imply that storing the decrypted password in Secrets Manager avoids Terraform state exposure. Added a note that `secret_string` is still stored in Terraform state and the state backend must remain secured.
- The key format troubleshooting section implied only `BEGIN RSA PRIVATE KEY` is correct. Changed this to "one valid PEM format" and clarified that the key must be unencrypted.

## Review Notes
- Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than validated with `terraform validate`.
- The AWS provider example pins `~> 5.0`; AWS provider 6.x is the current latest major version, but the attributes used in the post are still valid for the documented 5.x constraint.
