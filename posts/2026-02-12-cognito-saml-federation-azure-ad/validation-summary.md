# Validation Summary: How to Set Up Cognito SAML Federation with Azure AD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Cognito User Pools
- SAML 2.0 federation
- Microsoft Entra ID / Azure Active Directory enterprise applications
- AWS CLI
- Terraform AWS provider
- AWS Amplify Auth
- OAuth 2.0 authorization code flow

## Sources Consulted
- Amazon Cognito Developer Guide: Adding and managing SAML identity providers in a user pool - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managing-saml-idp.html
- Amazon Cognito Developer Guide: Things to know about SAML IdPs in Amazon Cognito user pools - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp-things-to-know.html
- Amazon Cognito Developer Guide: Mapping IdP attributes to profiles and tokens - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html
- Amazon Cognito Developer Guide: Signing out SAML users with single sign-out - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp-sign-out.html
- AWS CLI Command Reference: create-identity-provider - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-identity-provider.html
- AWS Amplify JavaScript Auth documentation: Sign in with redirect and custom providers - https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- Terraform Registry: aws_cognito_identity_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_provider
- Terraform Registry: aws_cognito_user_pool_client - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
- Microsoft Learn: Microsoft Entra federation metadata - https://learn.microsoft.com/en-us/entra/identity-platform/federation-metadata
- Microsoft Learn: Customize SAML token claims - https://learn.microsoft.com/en-us/entra/identity-platform/saml-claims-customization
- Microsoft Learn: SAML 2.0 token claims reference - https://learn.microsoft.com/en-us/entra/identity-platform/reference-saml-tokens
- Microsoft Learn: Manage access to applications - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/what-is-access-management

## Issues Found
- The optional Sign-on URL was shown as the Cognito ACS endpoint. Updated it to an application sign-in URL because the Cognito ACS endpoint belongs in the Reply URL / ACS URL field.
- The Entra claim table used simplified names like `email`, `given_name`, and `family_name`, while the Cognito mappings used full URI claim names. Updated the table to show the full SAML claim names that match the later Cognito attribute mapping.
- The metadata instructions said only to download the XML file even though the recommended Cognito configuration uses `MetadataURL`. Updated the wording to include copying the App Federation Metadata Url or downloading the XML.
- The simplified-claim example mapped Cognito `name` to `name`, but the configured display-name claim becomes `displayname` when the namespace is removed. Updated the mapping to `displayname`.
- The user-assignment section stated that Azure AD requires assignment by default. Updated the wording because Entra enterprise applications can require assignment, but applications are not universally assignment-required by default.

## Review Notes
- The AWS CLI command shape, Cognito SAML provider details (`MetadataURL`, `MetadataFile`, `IDPSignout`), Terraform resource fields, Amplify `signInWithRedirect` custom provider usage, Cognito ACS endpoint, and Cognito SP entity ID format were verified against current official documentation.
- Group claims are technically possible, but large group memberships can hit Cognito custom attribute size limits or Entra group overage behavior. Consider adding that caveat in a future broader revision.
