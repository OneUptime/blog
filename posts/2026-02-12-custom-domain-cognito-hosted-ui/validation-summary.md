# Validation Summary: How to Use a Custom Domain for Cognito Hosted UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito User Pools and hosted UI
- AWS Certificate Manager (ACM)
- Amazon Route 53 and DNS CNAME/alias records
- Amazon CloudFront
- AWS CLI
- Terraform AWS provider
- AWS Amplify JavaScript Auth
- OAuth and SAML identity provider callback endpoints

## Sources Consulted
- Amazon Cognito Developer Guide: Using your own domain for managed login - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html
- Amazon Cognito Developer Guide: Using social identity providers with a user pool - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
- Amazon Cognito Developer Guide: Add a SAML 2.0 identity provider - https://docs.aws.amazon.com/cognito/latest/developerguide/tutorial-create-user-pool-saml-idp.html
- Amazon Cognito API Reference: DescribeUserPoolDomain - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_DescribeUserPoolDomain.html
- AWS CLI Command Reference: acm request-certificate - https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS CLI examples: cognito-idp create-user-pool-domain - https://docs.aws.amazon.com/cli/latest/userguide/cli_cognito-identity-provider_code_examples.html
- Amazon Route 53 Developer Guide: Alias records for CloudFront distributions - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias-common.html
- Terraform Registry: aws_cognito_user_pool_domain - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_domain
- Terraform Registry: aws_acm_certificate_validation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- AWS Amplify JavaScript documentation: Configure Amplify categories - https://docs.amplify.aws/gen1/javascript/tools/libraries/configure-categories/

## Issues Found
- Added the Cognito prerequisite that the parent domain must have a valid DNS A record. Amazon Cognito verifies the parent domain before creating a custom domain, and an SOA record alone is not sufficient.
- Clarified Step 5 so it says to verify the app client's callback and logout URLs against the application's redirect URLs. The hosted UI custom domain is not itself the app callback URL unless the application is actually hosted there.
- Added the Google OAuth authorized JavaScript origin update. AWS Cognito's Google setup requires both the user pool domain origin and the `/oauth2/idpresponse` redirect URI.
- Updated the SSL troubleshooting note to work for both Route 53 alias A records and CNAME records instead of referring only to CNAME resolution.

## Review Notes
The Terraform snippets and AWS CLI commands use current resource names, arguments, and command options. The Route 53 alias example uses the standard CloudFront hosted zone ID, though the Terraform provider also exposes `cloudfront_distribution_zone_id`, which would be a more portable attribute in future examples.
