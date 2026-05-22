# Validation Summary: How to Use the template_file Data Source in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `template_file` data source
- Terraform `templatefile()` function
- Terraform string templates
- AWS IAM policies for Amazon S3
- Docker Compose
- systemd service files
- Nginx configuration

## Sources Consulted
- HashiCorp Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Template provider `template_file` data source documentation: https://registry.terraform.io/providers/hashicorp/template/latest/docs/data-sources/file
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- AWS S3 policy condition keys documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- AWS S3 IAM action/resource documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html

## Issues Found
- `template_file` variable type wording was too strict. The post said `template_file` vars must be strings and that numbers cause errors. The official provider documentation describes `vars` as primitive values, with lists and maps rejected. Updated the comparison table, explanatory paragraph, and gotcha to say primitive values rather than strings.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. Docker's current Compose Specification keeps the field only for backward compatibility and warns that it is obsolete. Removed the field from the example.
- The IAM policy template attempted to restrict `s3:PutObject` and `s3:DeleteObject` with the `s3:prefix` condition key. AWS documents `s3:prefix` for listing bucket contents, not for object write/delete operations. Updated the template to restrict write/delete access by using a prefix-specific object ARN when `restrict_prefix` is set.
- The escaping section said literal dollar signs must be escaped and used `$${HOME}` for a literal `$HOME`. Terraform only requires `$${` to escape a literal `${` interpolation opener; a bare `$HOME` does not need escaping. Updated the example and heading.
- The post claimed an empty template file causes an error. The official Terraform docs state that `templatefile()` reads the file and renders its content as a string, with documented errors for missing/generated files and invalid UTF-8, not for empty content. Replaced this gotcha with the accurate requirement that template files must exist at the beginning of the Terraform run.

## Review Notes
- The examples remain illustrative and omit surrounding variable/resource definitions, which is normal for a focused tutorial.
- HashiCorp recommends the `*.tftpl` naming pattern for Terraform template files. The post uses `.tpl`, which still works but could be modernized in a future style update.
- Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
