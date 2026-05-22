# Validation Summary: How to Use the base64decode Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform `base64decode`, `base64encode`, `jsondecode`, `can`, and `try` functions
- AWS Secrets Manager Terraform data source
- AWS EC2 `aws_instance` Terraform data source
- AWS IAM server certificate Terraform resource
- Terraform Kubernetes provider `kubernetes_secret` data source
- Terraform HTTP provider data source
- Kubernetes Secrets
- RFC 4648 Base64 encoding

## Sources Consulted
- Terraform `base64decode` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64decode
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform AWS provider `aws_secretsmanager_secret_version` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- Terraform AWS provider `aws_instance` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- Terraform AWS provider `aws_iam_server_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_server_certificate
- Terraform Kubernetes provider `kubernetes_secret` data source documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/secret
- Terraform HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Go `encoding/base64` package documentation, used because Terraform calls Go's standard Base64 decoder internally: https://pkg.go.dev/encoding/base64
- RFC 4648 Base64 specification: https://www.rfc-editor.org/rfc/rfc4648

## Issues Found
- The AWS Secrets Manager example incorrectly implied that Secrets Manager returns base64-encoded string secrets by default. Updated the wording to clarify that `secret_string` is returned as the decrypted string value, and `base64decode` is only needed if the stored string value is itself base64 text.
- The Kubernetes Secret section incorrectly stated that values from Terraform data sources come base64-encoded. Updated the explanation to distinguish Kubernetes API/manifest encoding from the Terraform Kubernetes provider's decoded `data` attribute.
- The `aws_instance` data source example used `user_data_base64` without setting `get_user_data = true`. Added `get_user_data = true`, which is required for the attribute to be exported.
- The whitespace note said whitespace is not automatically handled and grouped newlines with spaces. Updated it to state that newlines are accepted while spaces and tabs should be stripped before decoding.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` locally. The HCL snippets were reviewed against the current official Terraform and provider documentation instead.
