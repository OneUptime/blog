# Validation Summary: How to Configure argocd-dex Server Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Dex
- Kubernetes
- OIDC
- LDAP
- SAML
- GitHub OAuth
- GitLab OAuth
- Microsoft Entra ID
- Argo CD RBAC

## Sources Consulted
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-dex rundex` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-dex_rundex/
- Argo CD TLS configuration for `argocd-dex-server`: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD bundled Dex config generation source: https://github.com/argoproj/argo-cd/blob/stable/util/dex/config.go
- Argo CD stable install manifest for Dex server environment variables: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Dex connector overview: https://dexidp.io/docs/connectors/
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex GitLab connector documentation: https://dexidp.io/docs/connectors/gitlab/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex Microsoft connector documentation: https://dexidp.io/docs/connectors/microsoft/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex SAML connector documentation: https://dexidp.io/docs/connectors/saml/

## Issues Found
- The post described `argocd-dex-server` as a sidecar service. Argo CD installs it as a bundled Dex server deployment/service, so the wording was corrected.
- The authentication flow diagram showed Dex returning a JWT directly to Argo CD after the identity provider callback. In the authorization-code flow, Dex returns an authorization code and Argo CD exchanges that code for tokens. The sequence diagram was corrected.
- The log configuration examples used environment variables directly while current Argo CD documentation exposes these through `argocd-cmd-params-cm` keys. Updated the examples to use `dexserver.log.level` and `dexserver.log.format`.
- The Microsoft connector example used `includeAllGroups`, which is not a documented Dex Microsoft connector field. Replaced it with `onlySecurityGroups: false`, which matches Dex's documented group filtering option.
- The Dex storage section claimed Argo CD uses Kubernetes custom resources for Dex storage and that it can be overridden in `dex.config`. Current Argo CD generates bundled Dex storage as `type: memory`, so the section and snippet were corrected.
- The session timeout example used `timeout.session`, which is not the current documented Argo CD setting. Replaced it with `users.session.duration`.
- The internal OIDC discovery test used `http://argocd-dex-server:5556/dex/.well-known/openid-configuration`. Current bundled Dex defaults to TLS and Argo CD's Dex issuer path is `/api/dex`, so the command now uses `https://argocd-dex-server:5556/api/dex/.well-known/openid-configuration` with `-k` for the default self-signed internal certificate.

## Review Notes
- Argo CD automatically sets `redirectURI` for Dex OAuth2-style connectors, so manually including it in connector examples is usually unnecessary when it matches `/api/dex/callback`.
- Dex's SAML connector documentation currently notes important maintenance and security caveats. The SAML configuration shown is syntactically aligned with Dex, but OIDC or LDAP should generally be preferred when available.
