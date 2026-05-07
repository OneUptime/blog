# Validation Summary: How to Configure Active Directory Authentication in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager external authentication
- Microsoft Active Directory
- LDAP / LDAPS
- Kubernetes RBAC and cluster membership
- `ldapsearch`
- `kubectl`
- OpenSSL

## Sources Consulted
- Rancher: Configure Active Directory (AD) — https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-active-directory
- Rancher: Configuring Authentication — https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher: Global Permissions — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher: Users and Groups — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/manage-users-and-groups
- Rancher: Adding Users to Clusters — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/add-users-to-clusters
- Kubernetes: `kubectl logs` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: `kubectl exec` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- OpenSSL: `openssl s_client` — https://docs.openssl.org/master/man1/openssl-s_client/
- Ubuntu manpage: `ldapsearch` — https://manpages.ubuntu.com/manpages/stonking/man1/ldapsearch.1.html

## Issues Found
1. **The post described Rancher’s service account field as a bind DN / distinguished name.** Rancher’s AD configuration expects a `Service Account Username`, typically in `DOMAIN\\username` or UPN format. I updated the prerequisites, example connection details, LDAP test commands, and troubleshooting guidance to use the correct field and format.

2. **Several schema field names and example values did not match Rancher’s AD schema mapping.** `Username Attribute` was incorrectly set to `sAMAccountName`, `User Login Attribute` and `User Name Attribute` were not the current field labels, and the disabled-account field name was inaccurate. I corrected the block to match Rancher’s documented AD schema fields and values: `Object Class`, `Username Attribute: name`, `Login Attribute: sAMAccountName`, `Disabled Status Bitmask: 2`, and the corresponding group schema labels.

3. **The enable/test flow was incorrect.** The draft said to click `Test` before saving and then click `Enable` twice. Rancher’s documented flow is to click `Enable`, authenticate with the AD account that should be mapped to the local principal account, and let successful authentication enable AD automatically. I rewrote Steps 6 and 7 accordingly.

4. **The LDAPS certificate example exported only a single certificate while describing it as the AD CA certificate.** Rancher expects the issuing CA certificate plus any intermediate certificates in PEM format for private PKI deployments. I changed the example to extract the presented PEM certificate chain and updated the surrounding text to describe the certificate requirement accurately.

5. **Some RBAC and troubleshooting guidance was too specific in inaccurate ways.** The draft used an imprecise cluster-member navigation path, cluster role labels that do not match the documented membership flow, and an `ldapsearch` example run inside the Rancher pod that is not documented as a supported troubleshooting method. I updated the group/cluster navigation to match Rancher docs, changed the cluster role examples to `Member` and `Owner`, and replaced the pod-based LDAP test with a host-based `ldapsearch` example.

6. **The failover best-practice wording implied Rancher can directly configure multiple AD controllers in one auth-provider entry.** Rancher’s AD configuration uses a single hostname field. I changed the recommendation to use a highly available AD endpoint, such as a DNS name or load balancer backed by multiple domain controllers.

## Review Notes
- The post’s examples use short logon names with a NetBIOS `Default Login Domain`, which is valid. If an environment uses UPN logins such as `user@example.com`, Rancher’s documentation says `Default Login Domain` should be left blank and `Login Attribute` should usually be `userPrincipalName`.
- Rancher’s official AD documentation notes a version-specific LDAPS caveat for upgrades to v2.6.0 and later: certificates that rely only on the legacy Common Name and do not include SAN attributes can fail TLS validation.
