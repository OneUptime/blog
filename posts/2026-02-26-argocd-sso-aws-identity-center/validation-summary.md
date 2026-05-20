# Validation Summary: How to Configure SSO with AWS Identity Center in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Dex
- SAML 2.0
- OpenID Connect
- AWS IAM Identity Center
- Kubernetes
- Amazon EKS

## Sources Consulted
- AWS IAM Identity Center: Customer managed applications: https://docs.aws.amazon.com/singlesignon/latest/userguide/customermanagedapps.html
- AWS IAM Identity Center: Single sign-on access to SAML 2.0 and OAuth 2.0 applications: https://docs.aws.amazon.com/singlesignon/latest/userguide/customermanagedapps-saml2-oauth2.html
- AWS IAM Identity Center: Set up customer managed OAuth 2.0 applications for trusted identity propagation: https://docs.aws.amazon.com/singlesignon/latest/userguide/customermanagedapps-trusted-identity-propagation-set-up-your-own-app-OAuth2.html
- AWS IAM Identity Center: Set up your own SAML 2.0 application: https://docs.aws.amazon.com/singlesignon/latest/userguide/customermanagedapps-set-up-your-own-app-saml2.html
- AWS IAM Identity Center: Map attributes in your application to IAM Identity Center attributes: https://docs.aws.amazon.com/singlesignon/latest/userguide/mapawsssoattributestoapp.html
- Argo CD User Management and SSO documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Dex SAML connector documentation: https://dexidp.io/docs/connectors/saml/
- Dex connector overview: https://dexidp.io/docs/connectors/
- AWS PrivateLink supported AWS services: https://docs.aws.amazon.com/vpc/latest/privatelink/aws-services-privatelink-support.html

## Issues Found
- The original post claimed AWS Identity Center could be configured as a custom OIDC provider for ArgoCD. AWS documentation describes customer-managed OAuth 2.0 applications for trusted identity propagation and AWS-supported OAuth flows, not as a generic OIDC relying-party setup for ArgoCD. I changed the primary integration to AWS Identity Center SAML 2.0 through ArgoCD's bundled Dex service.
- The original AWS application setup used OAuth 2.0 fields such as web application, authorization code, redirect URLs, scopes, client ID, and client secret. I replaced these with the supported customer-managed SAML 2.0 application setup, including ACS URL, SAML audience, metadata, certificate, and sign-in URL.
- The ArgoCD `oidc.config` example used an IAM Identity Center issuer URL that is not valid for this integration. I replaced the primary ArgoCD configuration with `dex.config` using Dex's SAML connector fields: `ssoURL`, `caData`, `redirectURI`, `usernameAttr`, `emailAttr`, `groupsAttr`, and `entityIssuer`.
- The original client secret command was presented as required for AWS Identity Center. SAML does not use that client secret, so I limited the secret command to the separate direct-OIDC-provider alternative.
- The original Dex alternative still pointed Dex at AWS Identity Center as a generic OIDC provider. I changed it to an external OIDC provider alternative for organizations that use Okta, Microsoft Entra ID, Amazon Cognito, or another actual OIDC provider.
- The external identity source flow incorrectly showed AWS Identity Center sending OIDC to ArgoCD. I updated it to SAML.
- The EKS access section implied AWS Identity Center maps directly to EKS cluster access. I clarified that Identity Center permission sets produce IAM roles, which can then be mapped through EKS access entries or the legacy `aws-auth` ConfigMap.
- The networking section referred to AWS Identity Center OIDC endpoints and VPC endpoints. I updated it to SAML endpoints and clarified that Identity Store API VPC endpoints do not replace browser or SAML sign-in endpoint access.
- The troubleshooting section focused on OIDC issuer and discovery URL errors. I replaced it with SAML audience, destination, ACS URL, and Dex `redirectURI` checks.
- The token expiry section assumed OIDC refresh behavior. I updated it to note that SAML-based Dex logins do not support refresh tokens.

## Review Notes
Argo CD and Dex support the corrected SAML-based integration pattern, but Dex's SAML connector documentation warns that the connector is unmaintained and may be vulnerable or considered for deprecation. Group claims depend on the SAML attributes AWS IAM Identity Center can emit from the configured identity source and provisioning setup, so production deployments should validate the actual SAML assertion before relying on group-based RBAC.
