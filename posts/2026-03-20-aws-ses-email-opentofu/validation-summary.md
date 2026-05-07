# Validation Summary: How to Set Up AWS SES for Email with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS SES
- Amazon Route 53
- Amazon SNS
- AWS IAM and SES identity policies
- DKIM
- SPF
- DMARC

## Sources Consulted
- AWS provider docs for `aws_ses_domain_identity`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity
- AWS provider docs for `aws_ses_domain_dkim`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_dkim
- AWS provider docs for `aws_ses_domain_identity_verification`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity_verification
- AWS provider docs for `aws_ses_domain_mail_from`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_mail_from
- AWS provider docs for `aws_ses_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_template
- AWS provider docs for `aws_ses_identity_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_identity_policy
- AWS provider docs for `aws_ses_identity_notification_topic`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_identity_notification_topic
- AWS provider docs for `aws_sns_topic_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Verified identities in Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html
- Authenticating Email with SPF in Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html
- Using a custom MAIL FROM domain: https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- Complying with DMARC authentication protocol in Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html
- Overview of Amazon SES sending authorization: https://docs.aws.amazon.com/ses/latest/dg/sending-authorization-overview.html
- Sending policy examples: https://docs.aws.amazon.com/ses/latest/dg/sending-authorization-policy-examples.html
- Getting information from the delegate sender for Amazon SES sending authorization: https://docs.aws.amazon.com/ses/latest/dg/sending-authorization-identity-owner-tasks-information.html
- Configuring Amazon SNS notifications for Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/configure-sns-notifications.html
- Using the Amazon SES account-level suppression list: https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html
- Email program success metrics: https://docs.aws.amazon.com/ses/latest/dg/success-metrics.html

## Issues Found
- The post pinned the AWS provider to `~> 5.30`, which is outdated relative to the current 6.x provider documentation. I updated the snippet to `~> 6.0` after confirming the SES resources and arguments still match current docs.
- The SPF example published `v=spf1 include:amazonses.com ~all` at the root domain. In SES, SPF is implicitly handled when you use the default `amazonses.com` MAIL FROM domain; publishing SPF for DMARC alignment requires a custom MAIL FROM subdomain plus MX and TXT records. I replaced the root-domain SPF example with `aws_ses_domain_mail_from` and matching Route 53 MX/TXT records.
- The DMARC example started at `p=quarantine`. AWS recommends rolling DMARC out gradually, starting with `p=none` and tightening later after reviewing reports. I updated the record and the related best-practice guidance.
- The verification example used `aws_ses_domain_identity.main.id`. This resolves to the domain name, but the documented argument for `aws_ses_domain_identity_verification` is the domain itself. I changed it to `aws_ses_domain_identity.main.domain` to match the current provider docs.
- The “IAM Policy for SES Sending” example used `aws_iam_policy` without attaching it to a principal and described it as sending authorization. SES sending authorization is implemented by attaching a policy to the SES identity itself. I replaced the example with `aws_ses_identity_policy` backed by `aws_iam_policy_document` and an explicit delegate principal.
- The SNS notification example referenced undefined SNS topics and omitted the topic policy that allows `ses.amazonaws.com` to publish. I added a self-contained SNS topic plus `aws_sns_topic_policy`.
- The best-practices bullets overstated SPF/DKIM/DMARC requirements and oversimplified sandbox and suppression behavior. I corrected them to reflect AWS documentation: DMARC can align through DKIM or SPF, the mailbox simulator is exempt in sandbox mode, and suppression guidance should focus on the account-level suppression list plus list hygiene.

## Review Notes
- The SNS topic used for SES feedback notifications must be in the same AWS Region as SES. The updated example keeps both under the same provider region.
- `aws_ses_template` is still supported in the current AWS provider, and the template placeholder syntax used in the post is valid.
