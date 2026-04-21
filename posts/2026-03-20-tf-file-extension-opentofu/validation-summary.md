# Validation Summary: How to Use the .tf File Extension in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu configuration files
- OpenTofu modules
- OpenTofu provider requirements
- AWS provider resources
- Unix shell commands

## Sources Consulted
- OpenTofu Files and Directories: https://opentofu.org/docs/language/files/
- OpenTofu Override Files: https://opentofu.org/docs/language/files/override/
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Standard Module Structure: https://opentofu.org/docs/language/modules/develop/structure/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Local Values: https://opentofu.org/docs/language/values/locals/
- OpenTofu Resource Blocks: https://opentofu.org/docs/language/resources/syntax/
- AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The post implied that OpenTofu only uses `.tf` files. Updated the introduction and file-loading explanation to note that OpenTofu also supports `.tofu` files, while keeping the post focused on `.tf`.
- The post said OpenTofu reads all `.tf` files in a directory when running any command. Updated this to the more precise behavior for configuration-loading commands such as `tofu plan` and `tofu apply`, and clarified that OpenTofu evaluates top-level files in a module directory.
- The post did not mention `.tofu` extension precedence. Added the official caveat that when same-basename `.tf` and `.tofu` files exist in the same directory, OpenTofu loads the `.tofu` file and ignores the `.tf` file.
- The example directory tree labeled `versions.tf` as containing Terraform and provider versions. Changed this to OpenTofu and provider versions because `required_version` constrains the OpenTofu CLI version.
- The "What NOT to Do" section suggested `.tf.backup` files could confuse OpenTofu. Updated this to warn against backup files that still end in `.tf`, such as `main.backup.tf`, because those are loaded as configuration.
- The cross-file reference example used unresolved references to `data.aws_ami.ubuntu` and `aws_subnet.public`. Replaced it with a self-contained `aws_security_group` example that references the VPC defined in another file.

## Review Notes
The post is now technically accurate for current OpenTofu documentation. Future improvements could mention `.tf.json` and `.tofu.json` files, and could add a short note that override files have special merge ordering, but those details are outside the narrow `.tf` focus of this guide.
