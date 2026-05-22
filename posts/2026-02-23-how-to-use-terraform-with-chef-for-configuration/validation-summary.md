# Validation Summary: How to Use Terraform with Chef for Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform provisioners
- AWS EC2 user data
- Chef Infra Client
- Chef Infra Server
- Chef Policyfiles
- cloud-init shell bootstrap scripts

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform resource block and connection documentation: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform v1.x compatibility promises: https://developer.hashicorp.com/terraform/language/v1-compatibility-promises
- HashiCorp Terraform templatefile documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Chef Terraform integration documentation: https://docs.chef.io/client/18/integrations/terraform/
- Chef Infra Client install documentation: https://docs.chef.io/client/19/install/
- Chef Infra Client bootstrap documentation: https://docs.chef.io/client/19/install/bootstrap/
- Chef Policyfile documentation: https://docs.chef.io/policyfile/
- Chef install script documentation: https://docs.chef.io/chef_install_script/
- Chef Infra Client command reference: https://docs.chef.io/client/18/reference/ctl_chef_client/
- Chef chef_client_systemd_timer resource documentation: https://docs.chef.io/client/19.1/resources/bundled/chef_client_systemd_timer/

## Issues Found
- Terraform 1.x no longer includes the old vendor-specific Chef provisioner. Replaced the `provisioner "chef"` example with a `remote-exec` bootstrap example that is compatible with Terraform 1.x built-in provisioners.
- The user-data example generated invalid first-boot JSON by joining run-list entries without JSON string quoting. Changed the Terraform side to pass `jsonencode(var.chef_run_list)` and changed the template to render `"run_list": ${chef_run_list}`.
- The bootstrap scripts wrote a validation key but did not configure `validation_client_name` or `validation_key` in `client.rb`. Added those settings and restricted the validation key file permissions.
- The Policyfile bootstrap used `use_policyfile true` unnecessarily and assumed a `chef-client` systemd service existed after package installation. Removed the unnecessary setting and switched periodic runs to the same cron approach used elsewhere in the post.
- The reusable module referenced `var.subnet_id`, `var.validation_key`, and `var.tags` without declaring them, and the module usage omitted required inputs. Added the missing variable declarations and supplied the missing module arguments in the usage examples.

## Review Notes
Terraform was not installed in the workspace, so I could not run `terraform validate`. The examples remain partial tutorial snippets and assume surrounding variables, data sources, security groups, key pairs, AMIs, and Chef server artifacts exist. Chef's current documentation recommends validatorless bootstrapping by default; these examples still use legacy validator-based registration because the original post already centered on validation keys.
