# Validation Summary: How to Create SSH Keys in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp TLS provider
- HashiCorp local provider
- AWS EC2 key pairs
- AWS Secrets Manager
- AWS CloudTrail
- Azure Linux virtual machines
- Azure Key Vault
- Google Compute Engine
- Google Secret Manager
- SSH RSA and ED25519 keys

## Sources Consulted
- HashiCorp Terraform TLS provider `tls_private_key` documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- HashiCorp Terraform lifecycle `replace_triggered_by` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform `terraform_data` documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp Terraform AWS provider `aws_key_pair` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- AWS EC2 key pair documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
- AWS Secrets Manager with Terraform guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/secure-sensitive-data-secrets-manager-terraform/using-secrets-manager-and-terraform.html
- AWS Secrets Manager CloudTrail logging documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html
- AWS CloudTrail `DataResource` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- HashiCorp Terraform AzureRM provider `azurerm_linux_virtual_machine` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine.html
- HashiCorp Terraform Google provider `google_secret_manager_secret` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret.html
- Google Compute Engine SSH key documentation: https://docs.cloud.google.com/compute/docs/connect/add-ssh-keys

## Issues Found
- The post implied that storing generated private keys in a secret manager avoids state exposure. Updated the introduction, private key output comment, local file note, and conclusion to state that `tls_private_key` private key material is still stored in Terraform state and that state must be protected.
- The CloudTrail example used a basic `event_selector.data_resource` with `AWS::SecretsManager::Secret`. Basic CloudTrail data resources support only S3 objects, Lambda functions, and DynamoDB tables; Secrets Manager API calls are management events. Removed the invalid `data_resource` block and clarified that the example logs Secrets Manager API access through management events.
- The reusable module section was described as a complete multi-cloud module, but the code only implemented AWS resources. Updated the wording and inline comment to describe it as a module skeleton with AWS shown and Azure/GCP left to extend.

## Review Notes
The Terraform snippets are intentionally partial in places and depend on surrounding variables and resources such as VPC, subnet, Key Vault, resource group, and network interface definitions. The ED25519 AWS example is valid for Linux EC2 key pairs, but RSA remains the portable choice for Windows EC2 key pairs.
