# Validation Summary: How to Use the local-exec Provisioner in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS EC2 examples
- `local-exec` provisioner
- `terraform_data`
- Ansible
- PowerShell
- Python

## Sources Consulted
- OpenTofu `local-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu provisioners overview and lifecycle behavior: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `terraform_data` resource documentation: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu source for `local-exec` default interpreter behavior: https://raw.githubusercontent.com/opentofu/opentofu/v1.11.6/internal/builtin/provisioners/local-exec/resource_provisioner.go

## Issues Found
- The post used `null_resource` as the recommended OpenTofu pattern for provisioners without a real managed resource. I changed those examples and the related best-practice guidance to use `terraform_data` with `triggers_replace`, which is the current OpenTofu-documented approach.
- The environment-variable example referenced `self.tags["Name"]` without defining a `Name` tag on the instance. I added a `tags` block so the example no longer depends on an undefined map key.
- The interpreter section said Unix defaults to `/bin/sh`. I corrected this to `/bin/sh -c` to match OpenTofu's actual implementation.

## Review Notes
- AWS snippets remain illustrative and still require a valid AWS provider configuration and a region-appropriate AMI value to run unchanged.
- OpenTofu still supports provisioners in v1.11.x, but the official docs continue to position them as a last resort.
