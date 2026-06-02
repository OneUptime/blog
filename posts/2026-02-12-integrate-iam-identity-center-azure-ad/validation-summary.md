# Validation Summary: How to Integrate IAM Identity Center with Azure AD

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- AWS IAM Identity Center
- Microsoft Entra ID / Azure AD
- SAML 2.0 federation
- SCIM 2.0 provisioning
- AWS CLI
- AWS CloudTrail
- Microsoft Entra Conditional Access

## Sources Consulted
- AWS IAM Identity Center User Guide: Configure SAML and SCIM with Microsoft Entra ID and IAM Identity Center: https://docs.aws.amazon.com/singlesignon/latest/userguide/idp-microsoft-entra.html
- AWS IAM Identity Center User Guide: Enable automatic provisioning: https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-with-scim.html
- AWS IAM Identity Center User Guide: Understanding IAM Identity Center sign-in events: https://docs.aws.amazon.com/singlesignon/latest/userguide/understanding-sign-in-events.html
- Microsoft Learn: Configure AWS IAM Identity Center for Single sign-on with Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/saas-apps/aws-single-sign-on-tutorial
- Microsoft Learn: Configure AWS IAM Identity Center for automatic user provisioning with Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/saas-apps/aws-single-sign-on-provisioning-tutorial
- AWS CLI Command Reference: sso-admin create-account-assignment: https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-account-assignment.html
- AWS CLI Command Reference: sso-admin list-instances: https://docs.aws.amazon.com/cli/latest/reference/sso-admin/list-instances.html
- AWS CLI Command Reference: identitystore list-users: https://docs.aws.amazon.com/cli/latest/reference/identitystore/list-users.html
- AWS CLI Command Reference: identitystore list-groups: https://docs.aws.amazon.com/cli/latest/reference/identitystore/list-groups.html

## Issues Found
- The original SAML Entity ID and ACS examples used the generic IAM SAML endpoint `https://us-east-1.signin.aws.amazon.com/saml`. For IAM Identity Center, the Microsoft Entra gallery app should use the service provider metadata values from IAM Identity Center, with endpoint patterns such as `https://us-east-1.signin.aws.amazon.com/platform/saml/EXAMPLE` and `https://us-east-1.signin.aws.amazon.com/platform/saml/acs/EXAMPLE`. Updated the examples and instructions to use IAM Identity Center metadata values.
- The post advised adding the `https://aws.amazon.com/SAML/Attributes/SessionDuration` SAML claim. IAM Identity Center AWS account session duration is controlled by permission set session duration, not by adding this direct IAM federation claim in the Entra SAML app. Replaced that guidance with keeping the default gallery claims unless attributes for access control are needed.
- The post overstated that disabling a Microsoft Entra user immediately revokes AWS access. Updated the wording to say disabling prevents new sign-ins and provisioning can remove access, because existing sessions may continue until their configured expiration.
- The provisioning scope wording implied nested group membership would be provisioned. Updated it to say assigned users and direct members of assigned groups, matching Microsoft Entra provisioning limitations.
- The CloudTrail monitoring example searched for `Federate` while describing failed SSO authentication. IAM Identity Center sign-in events use `UserAuthentication` for completed sign-ins, and failed external IdP sign-ins should also be monitored in Microsoft Entra sign-in logs. Updated the command and surrounding text accordingly.

## Review Notes
The remaining AWS CLI examples use current command names and required parameters. The guide should continue to prefer downloading and uploading metadata files rather than hand-entering SAML URLs, because IAM Identity Center endpoint IDs are environment-specific and can change when the identity source configuration changes.
