# Validation Summary: How to Troubleshoot Authentication Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes / `kubectl`
- LDAP / Active Directory
- SAML 2.0
- OpenID Connect (OIDC)
- Azure AD / Microsoft Entra ID
- Microsoft Graph
- TLS / X.509 / OpenSSL
- DNS and proxy configuration

## Sources Consulted
- Rancher: Configuring Authentication - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher: Local Authentication - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/create-local-users
- Rancher: Configure Generic OIDC - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-generic-oidc
- Rancher: Configure Keycloak (SAML) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-keycloak-saml
- Rancher: Configure Azure AD - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-azure-ad
- Rancher: Technical FAQ - https://ranchermanager.docs.rancher.com/v2.12/faq/technical-items
- Rancher: HTTP Proxy Configuration - https://ranchermanager.docs.rancher.com/reference-guides/single-node-rancher-in-docker/http-proxy-configuration
- Rancher: API Keys - https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher: Kubeconfigs - https://ranchermanager.docs.rancher.com/api/workflows/kubeconfigs
- Rancher: Global Resources - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Kubernetes: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Microsoft Graph: Get a user - https://learn.microsoft.com/en-us/graph/api/user-get?source=docs&tabs=http&view=graph-rest-1.0
- Microsoft Learn: NoPermissionsInAccessToken when calling `/me` endpoint - https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/users-groups-entra-apis/error-call-me-endpoint-microsoft-graph
- Microsoft Learn: Error AADSTS50011 redirect URI mismatch - https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50011-redirect-uri-mismatch

## Issues Found
- The OIDC JWKS example used a Keycloak-specific `/protocol/openid-connect/certs` path even though the section was written as a generic OIDC workflow. I changed it to read `jwks_uri` from the discovery document and query that value directly.
- The LDAP TLS section mislabeled the presented server certificate as a CA certificate and used an invalid `openssl verify` example. I corrected it to export the server certificate and verify it against an explicit CA file.
- One LDAP example placed `ldapsearch -s base` after the filter, and the troubleshooting table did the same with `-s sub`. I moved the scope flag before the filter to match standard `ldapsearch` usage.
- The LDAP group-membership row implied that missing `memberOf` overlay was the only likely cause of missing groups. I widened that guidance to also cover incorrect group membership attribute mapping, which is relevant for Active Directory and other LDAP servers.
- The SAML metadata example used a Keycloak-specific Rancher SP metadata path while the section claimed to apply across SAML providers. I generalized it to `/v1-saml/<provider-name>/saml/metadata`.
- The Azure AD section requested a client-credentials token but then tried to call Microsoft Graph `/me`, which Microsoft documents as unsupported for application tokens, and it never assigned `$TOKEN` before using it. I fixed the flow to capture the token and test a `users/{user}/memberOf` lookup instead.
- The Azure AD redirect URI guidance did not include Rancher’s Azure-specific callback path. I updated the AADSTS50011 note to `https://rancher.example.com/verify-auth-azure`.
- The “Reset Authentication to Local” section was not technically correct. `reset-password` resets the Rancher admin password, not the auth provider; the `authconfig` examples used namespace flags on cluster-scoped resources; and the Rancher API example incorrectly used a Kubernetes service account token as Rancher API auth. I replaced this section with documented local-admin recovery commands: `reset-password` and `ensure-default-admin`.
- The diagnostic script used namespace/all-namespace flags on Rancher management resources that are cluster-scoped. I updated the examples to `settings.management.cattle.io` and `authconfigs.management.cattle.io`.
- The proxy guidance was too narrow and missed Rancher-specific internal entries such as `0.0.0.0` and `cattle-system.svc`. I corrected the example and noted that service CIDR and pod CIDR may also need to be added.
- The Step 2 connectivity comment said “SAML/OIDC provider connectivity” while the example actually queried an OIDC discovery endpoint. I narrowed the wording to OIDC for accuracy.

## Review Notes
- Rancher’s current documentation still refers to this provider as Azure AD, even though Microsoft now brands the platform as Microsoft Entra ID.
- The post’s command examples assume tools such as `curl`, `jq`, `ldapsearch`, `openssl`, `xmllint`, and `nslookup` are available wherever the commands are run.
