# Validation Summary: How to Use String Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu input variables
- OpenTofu string expressions and functions
- AWS provider resource examples
- Amazon EC2 user data

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Type Constraints: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu Strings and Templates: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu Built-in Functions: https://opentofu.org/docs/language/functions/
- OpenTofu `contains` function: https://opentofu.org/docs/language/functions/contains/
- OpenTofu `strcontains` function: https://opentofu.org/docs/language/functions/strcontains/
- OpenTofu `regex` function: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `can` function: https://opentofu.org/docs/language/functions/can/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- AWS EC2 User Data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Issues Found
- The first HCL snippet declared `variable "environment"` twice in the same module. OpenTofu requires variable names to be unique within a module, so the basic example was changed to `variable "project_name"`.
- The heredoc example used `apt-get` user data with a hard-coded AMI ID. AMI IDs are region-specific and can become stale, and the script assumes an Ubuntu/Debian package manager. The example now uses a string variable named `ubuntu_ami_id` for the AMI.
- The sensitive variable comment said the value would not appear in logs or plan output. OpenTofu documents `sensitive` as suppressing values in regular plan/apply output, while sensitive values can still be stored in state. The comment and conclusion were updated to reflect that.

## Review Notes
The examples are syntactically consistent with OpenTofu language documentation. Applying the AWS resource snippets still requires normal provider setup, credentials, valid regional AMI input, and globally unique S3 bucket names. The local environment did not have the `tofu` CLI installed, so validation was performed against official documentation rather than by running `tofu validate`.
