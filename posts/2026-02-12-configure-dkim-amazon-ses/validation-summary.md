# Validation Summary: How to Configure DKIM for Amazon SES

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SES
- Amazon SES v2 API
- AWS CLI
- Amazon Route 53 DNS records
- DKIM
- BYODKIM
- DMARC alignment
- OpenSSL RSA key generation

## Sources Consulted
- AWS CLI Command Reference: `ses verify-domain-dkim` - https://docs.aws.amazon.com/cli/latest/reference/ses/verify-domain-dkim.html
- AWS CLI Command Reference: `ses get-identity-dkim-attributes` - https://docs.aws.amazon.com/cli/latest/reference/ses/get-identity-dkim-attributes.html
- AWS CLI Command Reference: `ses set-identity-dkim-enabled` - https://docs.aws.amazon.com/cli/latest/reference/ses/set-identity-dkim-enabled.html
- AWS CLI Command Reference: `sesv2 create-email-identity` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-email-identity.html
- AWS CLI Command Reference: `sesv2 put-email-identity-dkim-attributes` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/put-email-identity-dkim-attributes.html
- AWS CLI Command Reference: `sesv2 put-email-identity-dkim-signing-attributes` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/put-email-identity-dkim-signing-attributes.html
- Amazon SES Developer Guide: Easy DKIM in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html
- Amazon SES Developer Guide: Provide your own DKIM authentication token (BYODKIM) - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-bring-your-own.html
- Amazon SES Developer Guide: Authenticating Email with DKIM - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html
- Amazon SES Developer Guide: Managing Easy DKIM and BYODKIM - https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy-managing.html
- Amazon SES Developer Guide: Troubleshooting DKIM problems - https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-dkim.html
- RFC 6376: DomainKeys Identified Mail (DKIM) Signatures - https://www.rfc-editor.org/rfc/rfc6376
- RFC 9989: Domain-Based Message Authentication, Reporting, and Conformance (DMARC) - https://www.rfc-editor.org/rfc/rfc9989

## Issues Found
- The SES v2 Easy DKIM example used BYODKIM-only fields (`DomainSigningSelector` and an empty `DomainSigningPrivateKey`). Replaced it with `NextSigningKeyLength: RSA_2048_BIT`, which is the correct Easy DKIM field for selecting the generated signing key length.
- The post called the SES v2 behavior "Easy DKIM v2", which is not the AWS feature name. Updated the wording to "Easy DKIM" with SES v2 API usage.
- The BYODKIM command passed the full private key PEM including headers and footers. SES requires the private key value without the first and last PEM lines and without line breaks, so the example now extracts `PRIVATE_KEY` with those lines removed.
- The SES v1 DKIM toggle commands used `--dkim-enabled false` and `--dkim-enabled true`. AWS CLI exposes this boolean as paired flags, so the examples now use `--no-dkim-enabled` and `--dkim-enabled`.
- The Easy DKIM key rotation paragraph stated that SES generates new CNAME values during rotation. Adjusted the wording to the supported operational point: Easy DKIM CNAME records point to SES-managed DNS, so DKIM key changes are transparent and do not require DNS updates.

## Review Notes
The local environment did not have the AWS CLI installed, so command syntax was verified against the current official AWS CLI command reference rather than local `aws --help` output.
