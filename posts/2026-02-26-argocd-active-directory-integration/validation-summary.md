# Validation Summary: How to Integrate ArgoCD with Active Directory

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Dex LDAP connector
- Kubernetes ConfigMaps and Secrets
- Microsoft Active Directory / LDAP / LDAPS
- Argo CD RBAC
- Argo CD CLI
- OpenLDAP ldapsearch
- OpenSSL

## Sources Consulted
- Argo CD User Management / Dex SSO configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Microsoft Learn: LDAP Matching Rules: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/4e638665-f466-4597-93c4-12f2ebfabab5
- Microsoft Learn: LDAP_MATCHING_RULE_TRANSITIVE_EVAL: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/1e889adc-b503-4423-8985-c28d5c7d4887
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The initial service-account password command created an `argocd-dex-ad-credentials` Secret, but the shown Dex config references `$dex.ldap.bindPW`, which Argo CD resolves from `argocd-secret` by default. Updated the command to patch `dex.ldap.bindPW` into `argocd-secret`.
- The CA certificate command created an `ad-ca-cert` Secret that was not mounted or referenced by the Dex config. Updated the instruction to base64 encode the CA certificate for the existing `rootCAData` field.
- The RBAC example described `policy.default: role:readonly` as "no access unless mapped." Argo CD grants `policy.default` to authenticated users as baseline access, so the comment was corrected.
- The nested-group troubleshooting text said to add the Active Directory matching-rule OID to the group filter, while the snippet applies it to `groupAttr`. Updated the wording to match the actual Dex LDAP matcher configuration.

## Review Notes
- The Dex LDAP connector fields (`host`, `rootCAData`, `bindDN`, `bindPW`, `userSearch`, `groupSearch`, `userMatchers`, and `nameAttr`) match the official Dex LDAP connector documentation.
- The Active Directory matching-rule OIDs used in the examples are correct: `1.2.840.113556.1.4.803` for bitwise AND filtering of disabled accounts and `1.2.840.113556.1.4.1941` for transitive nested membership evaluation.
- The Argo CD CLI commands are documented, but `argocd` and `kubectl` were not installed in this local environment, so command validation was performed against official command references rather than local `--help` output.
