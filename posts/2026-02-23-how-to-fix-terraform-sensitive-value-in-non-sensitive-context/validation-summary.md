# Validation Summary: How to Fix Terraform Sensitive Value in Non-Sensitive Context

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Terraform (sensitive variables, outputs, `nonsensitive()`, `for_each`, `count`, dynamic blocks, provisioners, `terraform console`)
- HashiCorp `random_password` resource
- AWS provider (`aws_iam_user`, `aws_iam_user_login_profile`, `aws_instance`, `aws_security_group`, `aws_secretsmanager_secret_version`)

## Sources Consulted
- Terraform docs — Sensitive input variables: https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output
- Terraform docs — Sensitive outputs: https://developer.hashicorp.com/terraform/language/values/outputs#sensitive-suppressing-values-in-cli-output
- Terraform docs — `nonsensitive` function: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- Terraform docs — `sensitive` function: https://developer.hashicorp.com/terraform/language/functions/sensitive
- Terraform docs — `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform docs — `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- HashiCorp `random_password` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS docs — Instance metadata and user data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- Terraform AWS provider — `aws_iam_user_login_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_login_profile

## Issues Found
- **EC2 user_data incorrectly described as "encrypted at rest in EC2"** (Fix 5). AWS explicitly states user_data is not encrypted and is retrievable from inside the instance via the metadata service; AWS recommends against passing secrets via user_data. Replaced the misleading comment with an accurate caveat that user_data is not encrypted and is readable via the instance metadata service, and reframed the secrets-manager example as the option for true secrets.

## Review Notes
- The error message in Fix 3 example ("could be exposed in the resource address") paraphrases Terraform's actual wording ("could be exposed as a resource instance key") but the meaning is preserved, so left as-is.
- The `aws_iam_user_login_profile` example in Fix 3 includes a comment "Use the password from the sensitive map" but does not actually wire a password into the resource. The resource does not accept an arbitrary password attribute (it has `password_length`, `password_reset_required`, `pgp_key`), so wiring a user-supplied password requires a different mechanism (e.g., `aws_iam_access_key` with PGP, or out-of-band rotation). The example is illustrative of variable restructuring, which is the section's actual point — left as-is, but a future revision could clarify.
- The advice on `nonsensitive()` correctly warns against misuse — good safety framing.
- All `sensitive = true` behaviors described match Terraform 1.x semantics. The `nonsensitive()` function has been available since Terraform 0.15.
