# Validation Summary: How to Configure Dex Connector for SAML in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Dex
- SAML 2.0
- Kubernetes
- AD FS
- Argo CD RBAC

## Sources Consulted
- Dex SAML connector documentation: https://dexidp.io/docs/connectors/saml/
- Dex connector overview: https://dexidp.io/docs/connectors/
- Dex SAML connector source: https://raw.githubusercontent.com/dexidp/dex/master/connector/saml/saml.go
- Argo CD user management and Dex SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/rbac/
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Microsoft AD FS claim rules documentation: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/operations/configure-claim-rules
- Microsoft AD FS Send LDAP Attributes as Claims documentation: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/technical-reference/when-to-use-a-send-ldap-attributes-as-claims-rule

## Issues Found
- The Dex SAML connector example used `caData` with a mounted certificate file path. Dex expects `ca` for a certificate file path and `caData` for inline PEM bytes, so the example was changed to `ca: /etc/dex/saml/idp-ca.pem`.
- The inline certificate example showed a PEM block under `ca`. Dex treats `ca` as a file path, so the example was changed to show base64-encoded `caData`.
- The post claimed that an IdP metadata endpoint could be referenced directly, but the official Dex SAML connector does not support metadata discovery. The section was changed to describe the supported inline `caData` option instead.
- The ADFS certificate note said Dex does not sign requests by default. Dex documentation states the SAML connector does not support signed AuthnRequests, so the wording was corrected.
- The `insecureSkipSignatureValidation` comment described unencrypted assertions. The setting skips signature validation, so the comment was corrected.
- The troubleshooting section suggested an `allowedClockSkew` parameter. Dex uses a built-in 30-second drift tolerance and does not expose that SAML connector option, so the note was corrected.

## Review Notes
The Dex SAML connector is currently documented by Dex as unmaintained and potentially vulnerable, with a recommendation to prefer OIDC, OAuth2, or LDAP where possible. The tutorial remains technically relevant for environments that still require SAML through Dex, but future revisions should consider highlighting that caveat more prominently.
