# Validation Summary: How to Configure Dex Connector for LDAP in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Dex
- LDAP
- Active Directory
- OpenLDAP
- Kubernetes ConfigMaps and Secrets
- Kubernetes kubectl
- Argo CD RBAC

## Sources Consulted
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex LDAP connector source code: https://github.com/dexidp/dex/blob/master/connector/ldap/ldap.go
- Argo CD user management and Dex SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Alpine Linux openldap-clients package contents: https://pkgs.alpinelinux.org/contents?name=openldap-clients
- Alpine Linux openssl package: https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/openssl
- RFC 4511, LDAPv3 protocol result codes: https://www.rfc-editor.org/rfc/rfc4511
- RFC 4519, LDAP schema for user applications: https://www.rfc-editor.org/rfc/rfc4519

## Issues Found
- The CA certificate ConfigMap command was inside a `yaml` fenced block even though it is a shell command. Changed the fence to `bash`.
- The nested Active Directory group example used the AD matching-rule OID in `groupAttr`. Dex currently documents recursive group lookup through `recursionGroupAttr`, and the connector source confirms that field is supported inside `groupSearch.userMatchers`. Updated the example and explanation to use `recursionGroupAttr: member`.

## Review Notes
The Dex LDAP connector fields, StartTLS settings, secret reference syntax, Argo CD `argocd-cm` / `argocd-rbac-cm` usage, RBAC `scopes: '[groups]'`, LDAP result-code explanations, and `kubectl` command forms were otherwise consistent with current official documentation. The exact LDAP base DNs, filters, and attributes remain environment-specific and must be adjusted for each directory.
