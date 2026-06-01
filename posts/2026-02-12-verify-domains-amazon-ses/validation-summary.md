# Validation Summary: How to Verify Domains in Amazon SES

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SES
- Amazon SES v2 API
- AWS CLI
- Amazon Route 53 DNS records
- SPF
- DKIM
- DMARC

## Sources Consulted
- AWS CLI Command Reference: `aws ses verify-domain-identity` - https://docs.aws.amazon.com/cli/v1/reference/ses/verify-domain-identity.html
- AWS CLI Command Reference: `aws sesv2 create-email-identity` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-email-identity.html
- AWS SES Developer Guide: Verified identities in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html
- AWS SES Developer Guide: Creating and verifying identities in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- AWS SES Developer Guide: Authenticating Email with SPF in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html
- AWS SES Developer Guide: Using a custom MAIL FROM domain - https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- AWS SES Developer Guide: Complying with DMARC authentication protocol in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html
- AWS SES Developer Guide: Authenticating Email with DKIM in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html
- Amazon Route 53 Developer Guide: Supported DNS record types - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- AWS CLI Command Reference: `aws route53 change-resource-record-sets` - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The SPF section incorrectly implied that SES requires an SPF TXT record on the root sending domain. AWS documents SPF for SES as applying to the MAIL FROM domain: the default SES MAIL FROM domain uses `amazonses.com`, and a custom MAIL FROM domain requires its own SPF TXT record. Updated the explanation and Route 53 example to use `bounce.example.com`.
- The SPF propagation check queried `example.com`, which no longer matched the corrected custom MAIL FROM SPF example. Updated it to query `bounce.example.com`.
- The SES v2 section said DKIM is automatically set up. `create-email-identity` starts Easy DKIM setup and returns tokens, but verification completes only after the DNS CNAME records are added. Updated the wording to reflect that.
- The troubleshooting section said SPF and SES verification TXT records could both exist on the root domain. The SES verification TXT record belongs at `_amazonses.example.com`, while SPF belongs on the MAIL FROM domain. Updated the explanation.
- The troubleshooting section described verification as "expired" and said removing the TXT record would revoke verification. AWS documents the initial undetected state as changing to "Failed" after 72 hours. Updated the heading and explanation.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and AWS service documentation.
- The SES v1 `verify-domain-identity` flow remains documented and usable, but current SES console/domain identity guidance emphasizes Easy DKIM through SES v2 identity creation.
