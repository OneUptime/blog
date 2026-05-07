# Validation Summary: How to Configure Okta SSO with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Okta
- SAML 2.0
- Kubernetes
- `kubectl`
- `curl`
- `openssl`

## Sources Consulted
- Rancher: Configure Okta (SAML) — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-okta-saml
- Rancher: Global Permissions — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher: Adding Users to Clusters — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/add-users-to-clusters
- Rancher: Users and Groups — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/manage-users-and-groups
- Rancher: Using API Tokens — https://ranchermanager.docs.rancher.com/v2.13/api/api-tokens
- Rancher: Previous v3 Rancher API Guide — https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Okta: Create SAML app integrations — https://help.okta.com/oie/en-us/Content/Topics/Apps/Apps_App_Integration_Wizard_SAML.htm
- Okta: Application Integration Wizard SAML field reference — https://help.okta.com/oie/en-us/Content/Topics/Apps/aiw-saml-reference.htm
- Okta: Add a private SSO integration — https://developer.okta.com/docs/guides/add-private-app/saml2/main/
- Kubernetes: `kubectl logs` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post omitted Rancher's documented limitation that Okta SAML supports only service provider-initiated logins. I added that caveat near the introduction so the flow does not imply Okta dashboard launch is the normal login path.
- Step 6 listed an undocumented `Entity ID` field and a manual IdP entry block, while omitting Rancher's documented `Private Key / Certificate` and `Metadata XML` inputs. I removed the unsupported fields, added the documented fields, and added the Rancher-documented `openssl` example for generating the key/certificate pair.
- Steps 7 and 8 described a separate `Test` button followed by a later `Enable` step. Rancher documentation shows that clicking `Enable` is the validation step that redirects the user to Okta, so I merged the flow accordingly.
- The troubleshooting command used `grep -i "saml\\|okta"`. I updated it to `grep -Ei "saml|okta"` for standard extended-regex usage while keeping the same intent.
- The group-to-role section described `User-Base` as read-only and did not account for Rancher's `New User Default` permissions for external users. I corrected the explanation, replaced the misleading example with a custom read-only role example, and updated the cluster membership navigation to the current documented Rancher flow.
- The session duration example targeted `auth-token-max-ttl-minutes`, which controls API and kubeconfig token maximum TTL rather than Rancher UI user-session lifetime. I replaced it with `auth-user-session-ttl-minutes` and added a version-scoped note for `auth-user-session-idle-ttl-minutes`.

## Review Notes
- The ACS URL, audience URI, attribute statement pattern, group attribute statement pattern, metadata retrieval flow, and Okta assignment flow were consistent with the current Rancher and Okta documentation.
- Rancher UI navigation differs slightly across releases, especially in older 2.6.x versions. The post now follows the current Rancher Manager documentation paths.
- `kubectl` was not installed in the local workspace, so the log command flags were validated against the official Kubernetes command reference instead of local `--help` output.
