# Validation Summary: How to Manage IdM Users and Groups from the Web UI on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- IdM Web UI
- Kerberos single sign-on
- Firefox SPNEGO configuration
- IdM users, groups, password policies, host groups, and audit logs
- systemd journal and Apache HTTP Server

## Sources Consulted
- Red Hat Documentation: Accessing Identity Management services, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/accessing_identity_management_services/index
- Red Hat Documentation: Managing IdM users, groups, hosts, and access control rules, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/
- Red Hat Documentation: Managing user accounts using the IdM Web UI, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-accounts-using-the-idm-web-ui_managing-users-groups-hosts
- Red Hat Documentation: Managing user groups in IdM Web UI, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-groups-in-idm-web-ui_managing-users-groups-hosts
- Red Hat Documentation: Defining IdM password policies, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/defining-idm-password-policies_managing-users-groups-hosts
- Red Hat Documentation: Managing Kerberos ticket policies, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-kerberos-ticket-policies_managing-users-groups-hosts
- Red Hat Documentation: Using IdM API, auditing IdM API operations, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_idm_api/using_idm_api
- Red Hat Documentation: IdM log files and directories, RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/accessing_identity_management_services/assembly_idm-log-files-and-directories_accessing-idm-services
- FreeIPA browser Kerberos setup page: https://ipa.demo-modernui.freeipa.org/ipa/config/ssbrowser.html

## Issues Found
- Certificate warning wording was too broad. Changed it from saying IdM uses a self-signed certificate by default to saying the web server certificate is usually signed by the IdM CA, which the browser may not trust yet.
- Firefox Kerberos SSO steps included `network.negotiate-auth.delegation-uris` as a normal requirement. Removed it because the IdM browser setup requires `network.negotiate-auth.trusted-uris` for SPNEGO login; delegation is not required for normal Web UI authentication.
- Password policy minimum lifetime was listed in days. Changed it to hours, matching Red Hat's IdM password policy attribute documentation.
- The audit-log section incorrectly implied that Web UI user pages and search can show audit actions. Replaced it with the documented RHEL 9.5+ `journalctl -g IPA.API` method and noted Directory Server audit logs for broader LDAP auditing.
- The session timeout troubleshooting step incorrectly pointed to editing `/etc/httpd/conf.d/ipa.conf`. Replaced it with Kerberos ticket lifetime guidance using `ipa krbtpolicy-mod --maxlife=86400`.

## Review Notes
Most Web UI navigation and user/group lifecycle guidance matched Red Hat's RHEL 9 IdM documentation. The post remains a high-level Web UI tutorial; future improvements could mention that new accounts can be created as stage users or active users, and that some audit features require RHEL 9.5 or later.
