# Validation Summary: How to Configure LDAP Authentication with SSSD on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SSSD
- LDAP and LDAPS
- OpenLDAP client tools
- authselect
- PAM and NSS
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/
- Red Hat Enterprise Linux 9 documentation, OpenLDAP client procedure with SSSD: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_authentication_and_authorization_in_rhel/understanding-sssd-and-its-benefits_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 9 authselect documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- SSSD LDAP provider manual, `sssd-ldap(5)`, from the local system man pages.
- SSSD configuration manual, `sssd.conf(5)`, from the local system man pages.
- SSSD troubleshooting documentation: https://sssd.io/troubleshooting/errors.html

## Issues Found
- The package installation command omitted `oddjob-mkhomedir`, which Red Hat documents as part of the package set when using the `with-mkhomedir` authselect feature. Added it to the `dnf install` command.
- The service startup instructions enabled SSSD but did not start `oddjobd`, which is needed for automatic home directory creation with `oddjob-mkhomedir`. Added `sudo systemctl enable --now oddjobd`.
- The `ldap_id_use_start_tls = false` option was incorrectly described as enabling ID mapping. That option controls STARTTLS for LDAP identity-provider connections, while ID mapping is controlled by `ldap_id_mapping`. Updated the comment to explain why it is false for an `ldaps://` URI.
- The offline-login explanation was too broad. SSSD cached credentials only allow offline authentication after credentials have already been cached by a prior successful authentication. Updated the introduction and summary to state that condition.
- A testing comment said `getent passwd ldapuser1` lists all LDAP users, but the command looks up one passwd entry through NSS. Updated the comment.

## Review Notes
- The post uses `ldaps://` with `ldap_tls_reqcert = demand`, which is valid. Red Hat's RHEL 9 example commonly shows `ldap://` with `ldap_id_use_start_tls = True`; both approaches are TLS-protected when configured correctly, but deployments should choose the mode that matches their LDAP server.
- The sample bind DN in the `ldapsearch` command is illustrative. Real environments should use an appropriate bind account or anonymous search only if the directory permits it.
