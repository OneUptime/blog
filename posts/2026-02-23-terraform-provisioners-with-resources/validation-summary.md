# Validation Summary: How to Use Provisioners with Resources in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform provisioners (`local-exec`, `remote-exec`, and `file`)
- Terraform resource and connection blocks
- AWS EC2 resource examples
- HCL configuration syntax

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform dependency management documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on

## Issues Found
- The best-practice note said network issues can cause remote provisioners to hang indefinitely. Terraform connection settings include a `timeout` argument with a default, so this was overstated. Changed the wording to recommend explicit connection timeouts when the default is not appropriate and to say network issues can make applies wait longer than expected.

## Review Notes
- The examples are illustrative snippets and assume supporting Terraform variables, provider configuration, networking, security groups, SSH keys, and AMI/user compatibility are configured elsewhere.
- Terraform could not be run locally because the `terraform` binary is not installed in this environment, so validation was based on the current official HashiCorp documentation rather than local CLI execution.
