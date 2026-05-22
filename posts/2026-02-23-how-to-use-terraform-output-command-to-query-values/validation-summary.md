# Validation Summary: How to Use terraform output Command to Query Values

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform output blocks
- Shell scripting
- jq
- GitHub Actions
- GitLab CI
- Kubernetes kubeconfig for Amazon EKS

## Sources Consulted
- HashiCorp Terraform CLI `output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform output values guide: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform CLI `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Kubernetes client authentication API reference: https://kubernetes.io/docs/reference/config-api/client-authentication.v1beta1/
- AWS CLI `eks get-token` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Local Terraform CLI check using Terraform v1.14.0 for `terraform output`, `-raw`, sensitive outputs, and no-output behavior.

## Issues Found
- The post said `-raw` only works with string outputs. HashiCorp documents `-raw` as supporting values Terraform can convert to strings, specifically string, number, and boolean values. Updated the text and comparison table.
- The sensitive-output section implied `-raw` or `-json` were required to reveal a sensitive output. Terraform also reveals a sensitive value when that output is explicitly queried by name. Updated the explanation and example while preserving the warning that listing all outputs redacts sensitive values.
- The `-state` option was described generally as reading from a specific state file. HashiCorp documents `-state=path` as a legacy option for the local backend only. Updated the section to clarify local-backend scope.
- The no-outputs section said `terraform output` gives an empty result. Terraform returns a `Warning: No outputs found` message with exit code 0. Updated the example.

## Review Notes
Terraform was not installed in the original workspace, so a standalone Terraform v1.14.0 binary was downloaded to `/tmp` for behavior checks. The official HashiCorp documentation currently identifies v1.15.x as latest, but the checked behaviors match the current command reference.
