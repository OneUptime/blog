# Validation Summary: How to Integrate ArgoCD with SAML 2.0 Providers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Dex
- SAML 2.0
- Kubernetes ConfigMaps and kubectl
- Okta
- Microsoft Entra ID
- OneLogin
- Argo CD RBAC

## Sources Consulted
- Dex SAML connector documentation: https://dexidp.io/docs/connectors/saml/
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Microsoft Entra SAML token claims reference: https://learn.microsoft.com/en-ca/entra/identity-platform/reference-saml-tokens
- Microsoft Entra SAML claims customization documentation: https://learn.microsoft.com/en-us/entra/identity-platform/saml-claims-customization
- Okta SAML app integration documentation: https://help.okta.com/en-us/Content/Topics/Apps/apps_app_integration_wizard_saml.htm
- Okta group attribute statement documentation: https://help.okta.com/en-us/Content/Topics/Apps/define-group-attribute-statements.htm
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- GNU Coreutils base64 manual: https://www.gnu.org/s/coreutils/manual/coreutils.html

## Issues Found
- The generic Dex configuration described an IdP metadata URL as the preferred option, but Dex's SAML connector expects `ssoURL` plus `ca` or `caData`; it does not directly consume IdP metadata. I changed the prerequisite and comments to say that the SSO URL and signing certificate are required, often obtained from metadata.
- The generic Dex configuration labeled `ssoIssuer` and `ssoURL` as a "full metadata URL" option. I changed this to describe `ssoIssuer` as the optional expected issuer value from the SAML response.
- The troubleshooting section said debug logging shows the full SAML assertion and later suggested using debug logs to see the raw assertion. Official Argo CD documentation confirms the Dex log-level setting, but not that raw assertions are logged. I changed the wording to say debug logs show SAML connector errors and claim-mapping details, and to use captured SAML responses for raw attribute inspection.

## Review Notes
The Dex, Argo CD RBAC, Microsoft Entra group claim URI, Kubernetes commands, and GNU `base64 -w0` usage were consistent with the consulted documentation. Provider-specific SAML attribute names can vary by tenant and app configuration, so the article correctly advises checking the raw SAML assertion when troubleshooting attribute mappings.
