# Validation Summary: How to Install and Configure an IdM Client on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Identity Management
- FreeIPA client enrollment
- SSSD
- Kerberos
- LDAP
- authselect
- oddjobd home directory creation

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Installing an IdM client, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/installing_identity_management/installing-an-idm-client
- Red Hat Enterprise Linux 8 documentation: Installing Identity Management, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux documentation: Configuring authentication and authorization in RHEL, https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux documentation: Accessing Identity Management services, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/accessing_identity_management_services/index
- FreeIPA LDAP documentation, https://www.freeipa.org/page/HowTo/LDAP
- FreeIPA client overview, https://www.freeipa.org/page/Client
- ipa-client-install manual page, https://www.mankier.com/1/ipa-client-install
- sssd.conf manual page, https://www.mankier.com/5/sssd.conf

## Issues Found
- The final paragraph stated that the client automatically discovers available IdM servers through DNS SRV records after enrollment. That is only true when server discovery is not pinned; the example uses explicit `--server` options, and the `ipa-client-install` documentation notes that `--server` configures specific servers and disables Kerberos DNS autodiscovery. Changed the wording to say the client can use DNS SRV discovery when servers are not explicitly pinned, and that SSSD can fail over between configured servers.

## Review Notes
The command examples and options are otherwise consistent with Red Hat and FreeIPA documentation. Red Hat documentation notes that `--domain`, `--realm`, and `--server` are often unnecessary when DNS SRV records are configured, but they remain valid for explicit non-interactive enrollment.
