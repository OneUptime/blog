# Validation Summary: How to Create AWS SES Email Identities with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS SES
- Amazon Route 53
- HCL
- DNS

## Sources Consulted
- OpenTofu: `tofu init` - https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu: `tofu apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry: `aws_ses_email_identity` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_email_identity
- Terraform Registry: `aws_ses_domain_identity` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity
- Terraform Registry: `aws_ses_domain_dkim` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_dkim
- Terraform Registry: `aws_ses_domain_identity_verification` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity_verification
- Terraform Registry: `aws_ses_domain_mail_from` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_mail_from
- Amazon SES Developer Guide: Creating and verifying identities - https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- Amazon SES Developer Guide: Using a custom MAIL FROM domain - https://docs.aws.amazon.com/ses/latest/dg/mail-from.html

## Issues Found
- The original domain-verification example created the SES identity and TXT record, but it did not wait for SES to confirm the identity. I added `aws_ses_domain_identity_verification` so the OpenTofu workflow now matches the post's claim that verification is handled in the configuration.
- The original "Checking Verification Status" section said verification status could be checked from data sources or outputs, but the example outputs only exposed the verification token and DKIM tokens. I corrected the explanation and added an output tied to `aws_ses_domain_identity_verification` so the section now reflects what the configuration actually proves.

## Review Notes
- SES identities are region-specific. If you send from multiple AWS Regions, the same domain or email address must be verified separately in each region.
- SES may take up to 72 hours to detect DNS changes for domain verification, DKIM, and custom MAIL FROM setup.
