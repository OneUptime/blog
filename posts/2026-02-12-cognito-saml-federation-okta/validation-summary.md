# Validation Summary: How to Set Up Cognito SAML Federation with Okta

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Cognito User Pools
- SAML 2.0 federation
- Okta SAML app integrations
- AWS CLI
- Terraform AWS provider
- AWS Amplify Auth for JavaScript
- OAuth 2.0 authorization code flow

## Sources Consulted
- Amazon Cognito: Using SAML identity providers with a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp.html
- Amazon Cognito: Configuring your third-party SAML identity provider: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-integrating-3rd-party-saml-providers.html
- Amazon Cognito: Adding and managing SAML identity providers in a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managing-saml-idp.html
- Amazon Cognito: Identity provider and relying party endpoints: https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html
- Amazon Cognito: The redirect and authorization endpoint: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- Amazon Cognito: Signing out SAML users with single sign-out: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp-sign-out.html
- AWS CLI: create-identity-provider command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-identity-provider.html
- Terraform AWS provider: aws_cognito_identity_provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_provider.html
- Terraform AWS provider: aws_cognito_user_pool_client: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client.html
- Okta: Application Integration Wizard SAML field reference: https://help.okta.com/en-us/Content/Topics/Apps/aiw-saml-reference.htm
- AWS Amplify JavaScript: signInWithRedirect: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- AWS Amplify JavaScript: signOut: https://docs.amplify.aws/javascript/frontend/auth/sign-out/

## Issues Found
- The post listed `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/saml-metadata.xml` as a Cognito SAML metadata URL. Amazon Cognito's official endpoint reference lists OIDC discovery and JWKS endpoints at that host, but the SAML IdP setup documentation instructs users to configure the ACS URL and SP entity ID directly. I removed the unsupported metadata URL and renamed the section to "Get Cognito SAML Configuration Values."
- The Terraform `provider_details` example manually set `SLORedirectBindingURI`. AWS documents SAML create/update requests with `MetadataURL` or `MetadataFile` plus options like `IDPSignout`; SLO redirect binding values are derived from the IdP metadata and shown in describe responses. I removed the manual `SLORedirectBindingURI` assignment.
- The Terraform comment described `IDPSignout` as "IdP-initiated sign-out." AWS documents it as the SAML single logout setting for Cognito to send signed logout requests to the IdP. I updated the comment to "Enable SAML single logout."
- The attribute mapping section said the SAML attribute `Name` must match the key in Cognito `attribute_mapping`. Cognito uses the key for the user pool attribute and the value for the SAML assertion attribute name. I changed this to say it must match the value.

## Review Notes
- The manual `/oauth2/authorize` URL is structurally correct for redirecting directly to a configured SAML IdP with `identity_provider=Okta`. For production apps, adding `state` and PKCE parameters is recommended.
- The Okta `Name ID format: EmailAddress` example can work, but Cognito identifies returning SAML users by the case-sensitive `NameID`. A stable immutable identifier is safer when organizations can change user email addresses.
