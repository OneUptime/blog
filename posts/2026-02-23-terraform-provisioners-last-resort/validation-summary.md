# Validation Summary: How to Understand Why Provisioners Are a Last Resort in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform provisioners
- Terraform `local-exec`, `remote-exec`, and `file` provisioners
- Terraform `terraform_data`, `null_resource`, and provider-managed resources
- AWS EC2 user data and cloud-init
- HashiCorp Packer AMI builds
- AWS Systems Manager documents and Run Command
- AWS Route 53 records
- Configuration management tools such as Ansible, Chef, and Puppet

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- HashiCorp Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_ssm_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_document
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Systems Manager document schema documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/document-schemas-features.html
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/plugins/builders/amazon/ebs

## Issues Found
- Several `remote-exec` snippets showed provisioner blocks without valid connection details. I moved the illustrative provisioners inside `aws_instance` resources where needed and added minimal SSH `connection` blocks, because Terraform provisioners must be declared inside resource blocks and `remote-exec` requires connection settings unless supplied elsewhere.
- The declarative model section said Terraform would not know if nginx failed to start. I changed this to clarify that Terraform can see a nonzero command exit during apply, but it does not model nginx as managed service state afterward.
- The idempotency section implied normal resource recreation reruns the same script against the same machine. I changed the wording to focus on partial execution and retries against a partly configured machine, which is the accurate idempotency risk.
- The notification example used a standalone `local-exec` provisioner. I wrapped it in a `terraform_data` resource, which current Terraform documentation recommends when a provisioner is not logically attached to another managed resource.
- The update example used `connection { ... }`, which is not valid HCL. I replaced it with a concrete minimal SSH connection block.

## Review Notes
The overall guidance matches current Terraform documentation: provisioners are a last resort, cloud-init/user data and custom images are preferred for instance bootstrap, provider resources are preferred for managed infrastructure, and configuration management tools are better suited to ongoing host configuration. Terraform CLI was not installed in the local environment, so validation was based on official documentation rather than local `terraform validate`.
