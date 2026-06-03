# Validation Summary: How to Create SES Domain Identity with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SES
- Amazon Route 53
- Terraform
- AWS Terraform provider
- DNS TXT, CNAME, and MX records
- DKIM
- SPF
- DMARC
- CloudWatch event publishing
- Amazon S3 email receiving

## Sources Consulted
- HashiCorp AWS provider documentation for `aws_ses_domain_identity`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity
- HashiCorp AWS provider documentation for `aws_ses_domain_identity_verification`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity_verification
- HashiCorp AWS provider documentation for `aws_ses_domain_dkim`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_dkim
- HashiCorp AWS provider documentation for `aws_ses_domain_mail_from`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_mail_from
- HashiCorp AWS provider documentation for `aws_ses_configuration_set`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_configuration_set
- HashiCorp AWS provider documentation for `aws_ses_event_destination`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_event_destination
- HashiCorp AWS provider documentation for `aws_ses_receipt_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_receipt_rule
- HashiCorp AWS provider documentation for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Amazon SES documentation for creating and verifying identities: https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-domain-procedure.html
- Amazon SES documentation for custom MAIL FROM domains: https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- Amazon SES documentation for SPF authentication: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html
- Amazon SES documentation for email receiving endpoints and regions: https://docs.aws.amazon.com/general/latest/gr/ses.html
- Amazon SES documentation for S3 receipt rule actions and permissions: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-s3.html
- Amazon SES documentation for CloudWatch event destinations: https://docs.aws.amazon.com/ses/latest/dg/event-publishing-add-event-destination-cloudwatch.html
- RFC 9989, DMARC core specification: https://www.rfc-editor.org/info/rfc9989/
- RFC 9990, DMARC aggregate reporting: https://www.rfc-editor.org/info/rfc9990/

## Issues Found
- The SPF section implied that adding an apex SPF TXT record is the normal SES setup for authorizing the visible sending domain. SES uses an amazonses.com MAIL FROM domain by default, so SPF is already handled unless a custom MAIL FROM domain is configured. Updated the wording to clarify that SPF applies to the envelope MAIL FROM domain and adjusted the comment on the Terraform record.
- The optional S3 receiving example referenced `aws_s3_bucket.email_storage` without noting that the bucket and permissions are outside the snippet. Added a concise comment that the bucket must exist and SES must be allowed to write to it.
- The CloudWatch event destination used `value_source = "emailHeader"` with the SES auto-tag dimension `ses:from-domain`. SES auto-tags are message tags, so changed this to `value_source = "messageTag"`.
- The configuration set section implied that events flow to CloudWatch automatically after creating the configuration set. Added a note that messages must be sent with the configuration set, either through the send call or the `X-SES-CONFIGURATION-SET` header.
- The `verification_status` output used a ternary that would not meaningfully report `pending` after a successful apply because `aws_ses_domain_identity_verification` only completes after SES verification succeeds. Changed the output to a fixed `verified` value with a description that reflects the wait behavior.

## Review Notes
- The post uses SES classic Terraform resources (`aws_ses_*`) rather than SES v2 resources. These resources are still documented in the current HashiCorp AWS provider and are not deprecated in the provider documentation consulted.
- DMARC was recently split into RFC 9989, RFC 9990, and RFC 9991 in May 2026, replacing RFC 7489. The post's basic DMARC TXT record remains valid.
