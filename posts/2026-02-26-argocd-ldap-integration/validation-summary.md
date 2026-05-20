# Validation Summary: How to Integrate ArgoCD with LDAP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Dex LDAP connector
- LDAP, OpenLDAP, FreeIPA, and 389 Directory Server
- Kubernetes ConfigMaps and Secrets
- External Secrets Operator
- Argo CD RBAC
- kubectl, ldapsearch, and OpenSSL CLI commands

## Sources Consulted
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Argo CD user management and Dex configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ownership and deletion policy documentation: https://external-secrets.io/latest/guides/ownership-deletion-policy/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- FreeIPA LDAP documentation: https://www.freeipa.org/page/HowTo/LDAP
- FreeIPA user lifecycle documentation: https://www.freeipa.org/page/V4/User_Life-Cycle_Management

## Issues Found
- The FreeIPA section described the schema as closer to Active Directory than standard OpenLDAP. This was too broad and potentially misleading because FreeIPA has its own LDAP schema and account subtree layout. I changed the sentence to describe the concrete, relevant DN layout instead.
- The ExternalSecret example used `apiVersion: external-secrets.io/v1beta1`. Current External Secrets Operator documentation uses the GA `external-secrets.io/v1` API for ExternalSecret examples. I updated the snippet to `external-secrets.io/v1`.

## Review Notes
The Dex LDAP fields, LDAP group matcher examples, Argo CD RBAC scopes and policy format, `dexserver.log.level` key, `kubectl` commands, `ldapsearch` commands, StartTLS/LDAPS settings, and Kubernetes Secret `stringData` usage were checked against official or authoritative documentation and are technically valid. Some environment-specific values such as LDAP base DNs, object classes, and group filters may still need adjustment for a particular directory deployment.
