# Validation Summary: How to Integrate Active Directory with Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine config patching, kube-apiserver extraArgs)
- Microsoft Active Directory (LDAP, sAMAccountName, userPrincipalName, userAccountControl filters)
- Dex (OIDC bridge, LDAP connector)
- Kubernetes (kube-apiserver OIDC flags, RBAC ClusterRoleBinding/RoleBinding)
- kubelogin / `kubectl oidc-login` (client-go credential exec plugin)
- AD Federation Services (ADFS) as an OIDC provider
- LDAP search filters and Microsoft extensible matching rule OIDs (`1.2.840.113556.1.4.803`, `1.2.840.113556.1.4.1941`)

## Sources Consulted
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex env-var expansion behavior (issue #4212): https://github.com/dexidp/dex/issues/4212
- kubelogin (int128): https://github.com/int128/kubelogin
- Kubernetes authentication reference (OIDC, client-go exec credential plugins): https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Microsoft MS-ADTS LDAP matching rules: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/4e638665-f466-4597-93c4-12f2ebfabab5
- LDAPWiki on LDAP_MATCHING_RULE_IN_CHAIN: https://ldapwiki.com/wiki/Wiki.jsp?page=LDAP_MATCHING_RULE_IN_CHAIN
- Talos Linux configuration patching documentation: https://www.talos.dev/v1.6/talos-guides/configuration/patching/

## Issues Found
- **kubeconfig credential plugin apiVersion was outdated.** The kubeconfig example used `client.authentication.k8s.io/v1beta1`, which was deprecated in Kubernetes 1.22 and removed in Kubernetes 1.30. Current Talos Linux ships Kubernetes versions that no longer accept v1beta1.
  - **Fix:** Updated to `client.authentication.k8s.io/v1` and added the `interactiveMode: IfAvailable` field, which is required (not optional) in the v1 API for exec credential plugins that may need interactive input — without it, the apiserver would reject the plugin spec.

## Review Notes
- Dex env-var expansion (`${AD_BIND_DN}` / `${AD_BIND_PW}`) is reliably supported only inside `storage` and `connectors` sections — the post uses it inside `connectors`, so this is fine.
- `idAttr: sAMAccountName` works but `idAttr: DN` is the more stable identity choice in many AD environments; this is a stylistic call and was left as-is.
- The `member:1.2.840.113556.1.4.1941:` matching-rule trick for nested groups is correct. Dex also exposes a native `recursionGroupAttr` option as a portable alternative; this could be mentioned in a future revision but the current approach is technically valid.
- Tag list at the top of the post says `Window` (likely a typo for `Windows`). This is a content/metadata issue, not a technical correctness issue, and was left untouched per scope guidance.
- The Dex image `ghcr.io/dexidp/dex:v2.39.0` is a valid published tag; newer releases exist but pinning to v2.39.0 is reasonable.
- OIDs used (`1.2.840.113556.1.4.803` for bitwise AND on `userAccountControl` with bit 2 = ACCOUNTDISABLE, and `1.2.840.113556.1.4.1941` for LDAP_MATCHING_RULE_IN_CHAIN) are both correct.
- The Talos `cluster.apiServer.extraArgs` path and the `talosctl patch machineconfig --patch @file.yaml -n NODE` syntax are correct.
