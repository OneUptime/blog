# Validation Summary: How to Manage Kerberos Authentication with IdM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Identity Management (IdM)
- FreeIPA CLI
- Kerberos authentication
- Kerberos tickets and keytabs
- chronyd time synchronization

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using constrained delegation in IdM - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/assembly_using-constrained-delegation-in-idm_managing-users-groups-hosts
- Red Hat Enterprise Linux 8 documentation: Managing Kerberos ticket policies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_identity_management/managing-kerberos-ticket-policies_configuring-and-managing-idm
- Red Hat Enterprise Linux 7 documentation: Managing Services - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/linux_domain_identity_authentication_and_policy_guide/services
- MIT Kerberos kinit documentation - https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kinit.html
- MIT Kerberos klist documentation - https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/klist.html
- MIT Kerberos kdestroy documentation - https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kdestroy.html
- MIT Kerberos kvno documentation - https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kvno.html
- MIT Kerberos environment variable documentation - https://web.mit.edu/kerberos/krb5-latest/doc/user/user_config/kerberos.html
- MIT Kerberos clock skew documentation - https://web.mit.edu/Kerberos/krb5-1.5/krb5-1.5.4/doc/krb5-admin/Clock-Skew.html

## Issues Found
- The constrained delegation example used a non-existent `ipa service-add-delegation-target` command and passed service principals directly as a rule target. Updated the example to create a service delegation target, add the LDAP principal to that target, create a service delegation rule, add the HTTP principal to the rule, and associate the rule with the target using `ipa servicedelegationrule-add-target --servicedelegationtargets=...`, matching Red Hat IdM constrained delegation documentation.

## Review Notes
- The `ipa-getkeytab` example is syntactically valid, but administrators should remember that retrieving a new keytab resets the service principal secret and can invalidate other existing keytabs for that principal.
